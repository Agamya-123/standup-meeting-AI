import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const toggleReaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const standupId = req.params.standupId as string;
    const userId = req.user?.id;
    const { emoji } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!emoji || typeof emoji !== 'string') {
      res.status(400).json({ message: 'Emoji is required.' });
      return;
    }

    const standup = await prisma.dailyStandup.findUnique({
      where: { id: standupId },
      include: {
        user: { select: { id: true, name: true, companyId: true } },
      },
    });

    if (!standup || standup.user.companyId !== req.user?.companyId) {
      res.status(404).json({ message: 'Standup not found.' });
      return;
    }

    // Check if user already reacted with this emoji
    const existing = await prisma.standupReaction.findUnique({
      where: {
        standupId_userId_emoji: {
          standupId,
          userId,
          emoji
        }
      }
    });

    let action: 'added' | 'removed' = 'added';

    if (existing) {
      await prisma.standupReaction.delete({
        where: { id: existing.id }
      });
      action = 'removed';
    } else {
      await prisma.standupReaction.create({
        data: {
          standupId,
          userId,
          emoji
        }
      });
      action = 'added';

      // If reacting to someone else's standup, create a cheer notification for them
      if (standup.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: standup.userId,
            senderId: userId,
            type: 'REACTION',
            title: `👏 Cheer from ${req.user?.name || 'a teammate'}`,
            message: `${req.user?.name || 'A teammate'} reacted ${emoji} to your daily update.`,
            link: '/dashboard'
          }
        });
      }
    }

    // Fetch all current reactions for this standup
    const allReactions = await prisma.standupReaction.findMany({
      where: { standupId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    res.json({
      message: `Reaction ${action} successfully.`,
      action,
      reactions: allReactions
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error toggling reaction.', error: error.message });
  }
};

export const getStandupReactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const standupId = req.params.standupId as string;

    const standup = await prisma.dailyStandup.findUnique({
      where: { id: standupId },
      include: {
        user: { select: { companyId: true } },
      },
    });

    if (!standup || standup.user.companyId !== req.user?.companyId) {
      res.status(404).json({ message: 'Standup not found.' });
      return;
    }

    const reactions = await prisma.standupReaction.findMany({
      where: { standupId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    res.json({ reactions });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching reactions.', error: error.message });
  }
};
