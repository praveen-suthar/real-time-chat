import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

export async function getConversations(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = conversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p.userId !== userId
      )?.user;

      const lastMsg = conv.messages[0];
      return {
        id: conv.id,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        otherUser: otherParticipant || null,
        participants: conv.participants.map((p) => p.user),
        lastMessage: lastMsg
          ? {
              ...lastMsg,
              mediaUrl: lastMsg.mediaUrl ? `/api/media/${lastMsg.id}` : null,
            }
          : null,
      };
    });

    res.status(200).json({ conversations: formatted });
  } catch (error) {
    console.error('getConversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}

export async function createOrGetConversation(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const currentUserId = req.user?.id;
    const { targetUserId } = req.body;

    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!targetUserId || targetUserId === currentUserId) {
      res.status(400).json({ error: 'Valid target user ID required' });
      return;
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      const otherUser = existing.participants.find(
        (p) => p.userId !== currentUserId
      )?.user;

      res.status(200).json({
        conversation: {
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
          otherUser,
          participants: existing.participants.map((p) => p.user),
          lastMessage: existing.messages[0]
            ? {
                ...existing.messages[0],
                mediaUrl: existing.messages[0].mediaUrl
                  ? `/api/media/${existing.messages[0].id}`
                  : null,
              }
            : null,
        },
      });
      return;
    }

    const newConv = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: currentUserId },
            { userId: targetUserId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    const otherUser = newConv.participants.find(
      (p) => p.userId !== currentUserId
    )?.user;

    res.status(201).json({
      conversation: {
        id: newConv.id,
        createdAt: newConv.createdAt,
        updatedAt: newConv.updatedAt,
        otherUser,
        participants: newConv.participants.map((p) => p.user),
        lastMessage: null,
      },
    });
  } catch (error) {
    console.error('createOrGetConversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
}

export async function getConversationMessages(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id: conversationId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ error: 'Conversation ID required' });
      return;
    }

    const isParticipant = await prisma.participant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!isParticipant) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedMessages = messages.map((msg) => ({
      ...msg,
      mediaUrl: msg.mediaUrl ? `/api/media/${msg.id}` : null,
    }));

    res.status(200).json({ messages: formattedMessages });
  } catch (error) {
    console.error('getConversationMessages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}
