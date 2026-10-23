import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthUser } from '../middlewares/auth';
import { logger } from '../lib/logger';

import { SendMessagePayload, SendMessageAck } from '../types/socket.types';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: AuthUser;
  };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookieStr) => {
    const parts = cookieStr.split('=');
    const key = parts[0]?.trim();
    if (key) {
      list[key] = decodeURIComponent((parts[1] || '').trim());
    }
  });
  return list;
}

const activeUserSockets = new Map<string, Set<string>>();

export function getOnlineUserIds(): string[] {
  return Array.from(activeUserSockets.keys());
}

export function setupSocketServer(io: SocketIOServer) {
  // Authentication middleware for socket connections
  io.use((socket, next) => {
    try {
      let token: string | undefined;

      // Extract token from httpOnly cookie in handshake headers
      if (socket.handshake.headers.cookie) {
        const parsedCookies = parseCookies(socket.handshake.headers.cookie);
        token = parsedCookies.token;
      }

      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (!token) {
        return next(new Error('Authentication error: Session token required'));
      }

      const secret =
        process.env.JWT_SECRET || 'supersecret_jwt_key_at_least_32_characters_long';
      const decoded = jwt.verify(token, secret) as AuthUser;

      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired session'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${user.id}`);

    if (!activeUserSockets.has(user.id)) {
      activeUserSockets.set(user.id, new Set());
    }
    activeUserSockets.get(user.id)!.add(socket.id);

    logger.ws('connected', `user: ${user.username} (${socket.id})`);

    io.emit('online_users', getOnlineUserIds());
    io.emit('user_status', { userId: user.id, isOnline: true });

    socket.on('join_conversation', async ({ conversationId }: { conversationId: string }) => {
      try {
        if (!conversationId) return;

        // Security check: verify sender belongs to the conversation
        const participant = await prisma.participant.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId: user.id,
            },
          },
        });

        if (!participant) {
          socket.emit('socket_error', { message: 'Forbidden' });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        socket.emit('conversation_joined', { conversationId });
      } catch (err) {
        socket.emit('socket_error', { message: 'Failed to join conversation room' });
      }
    });

    socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing_start', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId: user.id,
        username: user.username,
      });
    });

    socket.on('typing_stop', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId: user.id,
      });
    });

    socket.on(
      'send_message',
      async (
        payload: SendMessagePayload,
        callback?: (response: SendMessageAck) => void
      ) => {
        try {
          const {
            conversationId,
            content,
            clientId,
            mediaUrl,
            mediaType,
            forwardedFromId,
          } = payload;

          if (!conversationId) {
            callback?.({ success: false, error: 'conversationId is required' });
            return;
          }

          if (!content?.trim() && !mediaUrl) {
            callback?.({
              success: false,
              error: 'Message content or media required',
            });
            return;
          }

          if (content && content.length > 5000) {
            callback?.({
              success: false,
              error: 'Message exceeds maximum length of 5000 characters',
            });
            return;
          }

          const participant = await prisma.participant.findUnique({
            where: {
              conversationId_userId: {
                conversationId,
                userId: user.id,
              },
            },
          });

          if (!participant) {
            callback?.({
              success: false,
              error: 'Forbidden',
            });
            return;
          }

          // Return existing message if client already received an ack
          if (clientId) {
            const existing = await prisma.message.findUnique({
              where: {
                conversationId_senderId_clientId: {
                  conversationId,
                  senderId: user.id,
                  clientId,
                },
              },
              include: {
                sender: {
                  select: { id: true, username: true, avatarUrl: true },
                },
              },
            });

            if (existing) {
              callback?.({ success: true, message: existing });
              return;
            }
          }

          let finalMediaUrl = mediaUrl || null;
          let finalMediaType = mediaType || null;

          if (forwardedFromId || (mediaUrl && mediaUrl.startsWith('/api/media/'))) {
            const sourceId = forwardedFromId || mediaUrl?.replace('/api/media/', '');
            if (sourceId) {
              const originalMsg = await prisma.message.findUnique({
                where: { id: sourceId },
                select: { mediaUrl: true, mediaType: true },
              });
              if (originalMsg?.mediaUrl) {
                finalMediaUrl = originalMsg.mediaUrl;
                finalMediaType = originalMsg.mediaType || finalMediaType;
              }
            }
          }

          const [savedMessage] = await prisma.$transaction([
            prisma.message.create({
              data: {
                conversationId,
                senderId: user.id,
                clientId: clientId || null,
                content: content?.trim() || '',
                mediaUrl: finalMediaUrl,
                mediaType: finalMediaType,
                forwardedFromId: forwardedFromId || null,
              },
              include: {
                sender: {
                  select: { id: true, username: true, avatarUrl: true },
                },
              },
            }),
            prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            }),
          ]);

          const outgoingMessage = {
            ...savedMessage,
            mediaUrl: savedMessage.mediaUrl ? `/api/media/${savedMessage.id}` : null,
          };

          socket.to(`conversation:${conversationId}`).emit('new_message', outgoingMessage);

          const allParticipants = await prisma.participant.findMany({
            where: { conversationId },
            select: { userId: true },
          });

          allParticipants.forEach((p) => {
            if (p.userId !== user.id) {
              io.to(`user:${p.userId}`).emit('new_message', outgoingMessage);
            }
          });

          callback?.({ success: true, message: outgoingMessage });
        } catch (err) {
          logger.error('send_message socket error:', err);
          callback?.({ success: false, error: 'Failed to send message' });
        }
      }
    );

    socket.on('disconnect', () => {
      const userSockets = activeUserSockets.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeUserSockets.delete(user.id);
          logger.ws('disconnected', `user: ${user.username}`);
          io.emit('user_status', { userId: user.id, isOnline: false });
          io.emit('online_users', getOnlineUserIds());
        }
      }
    });
  });
}
