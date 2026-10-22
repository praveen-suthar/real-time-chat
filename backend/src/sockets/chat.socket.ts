import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthUser } from '../middlewares/auth';

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

// active user tracking: userId -> Set of socketIds
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

    // Broadcast online status to all connected clients
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
          socket.emit('socket_error', {
            message: 'You are not a participant in this conversation',
          });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        socket.emit('conversation_joined', { conversationId });
      } catch (err) {
        socket.emit('socket_error', { message: 'Failed to join conversation room' });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    // Typing start indicator
    socket.on('typing_start', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId: user.id,
        username: user.username,
      });
    });

    // Typing stop indicator
    socket.on('typing_stop', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId: user.id,
      });
    });

    // Real-time message sending with deduplication and acknowledgment
    socket.on(
      'send_message',
      async (
        payload: {
          conversationId: string;
          content: string;
          clientId?: string;
          mediaUrl?: string;
          mediaType?: string;
          forwardedFromId?: string;
        },
        callback?: (response: {
          success: boolean;
          message?: unknown;
          error?: string;
        }) => void
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

          // 1. Security: Verify sender belongs to the conversation
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
              error: 'Forbidden: You are not a participant in this conversation',
            });
            return;
          }

          // 2. Deduplication check: if message with (conversationId, senderId, clientId) exists
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

          // 3. Save message and update conversation timestamp
          const [savedMessage] = await prisma.$transaction([
            prisma.message.create({
              data: {
                conversationId,
                senderId: user.id,
                clientId: clientId || null,
                content: content?.trim() || '',
                mediaUrl: mediaUrl || null,
                mediaType: mediaType || null,
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

          // 4. Broadcast to active conversation room
          socket.to(`conversation:${conversationId}`).emit('new_message', savedMessage);

          // 5. Broadcast to participants' personal rooms for sidebar update
          const allParticipants = await prisma.participant.findMany({
            where: { conversationId },
            select: { userId: true },
          });

          allParticipants.forEach((p) => {
            if (p.userId !== user.id) {
              io.to(`user:${p.userId}`).emit('new_message', savedMessage);
            }
          });

          // 6. Acknowledge sender
          callback?.({ success: true, message: savedMessage });
        } catch (err) {
          console.error('send_message error:', err);
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
          io.emit('user_status', { userId: user.id, isOnline: false });
          io.emit('online_users', getOnlineUserIds());
        }
      }
    });
  });
}
