import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true }
        }
      }
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        read: false
      }
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching notifications.', error: error.message });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      res.status(404).json({ message: 'Notification not found.' });
      return;
    }

    if (notification.userId !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.json({ message: 'Marked as read.', notification: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating notification.', error: error.message });
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true
      }
    });

    res.json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error marking all notifications as read.', error: error.message });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== userId) {
      res.status(404).json({ message: 'Notification not found.' });
      return;
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ message: 'Notification dismissed.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error dismissing notification.', error: error.message });
  }
};

export const resolveBlocker = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const standupId = req.params.id as string;
    const managerId = req.user?.id;
    const managerName = req.user?.name || 'Your Manager';
    const { status = 'RESOLVED', resolutionNote } = req.body;

    const validStatus = ['RESOLVED', 'IN_PROGRESS', 'OPEN'].includes(status) ? status : 'RESOLVED';

    const standup = await prisma.dailyStandup.findUnique({
      where: { id: standupId },
      include: {
        user: { select: { id: true, name: true, email: true, companyId: true } },
        team: { select: { id: true, name: true } }
      }
    });

    if (!standup || standup.user.companyId !== req.user?.companyId) {
      res.status(404).json({ message: 'Standup record not found.' });
      return;
    }

    const defaultNote =
      validStatus === 'RESOLVED'
        ? 'Issue resolved / credentials granted, please proceed.'
        : validStatus === 'IN_PROGRESS'
        ? 'Manager is actively unblocking this impediment.'
        : 'Blocker status reopened.';

    const note = resolutionNote?.trim() || defaultNote;

    const updatedStandup = await prisma.dailyStandup.update({
      where: { id: standupId },
      data: {
        blockerStatus: validStatus,
        blockerResolutionNote: note,
        blockerResolvedById: validStatus === 'RESOLVED' ? managerId : null,
        blockerResolvedAt: validStatus === 'RESOLVED' ? new Date() : null
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
        reactions: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });

    // Create live ping notification for the developer who owns the standup
    let notifTitle = '🚨 Blocker Resolved: Please Proceed!';
    let notifType = 'BLOCKER_RESOLVED';

    if (validStatus === 'IN_PROGRESS') {
      notifTitle = '⏳ Blocker In Progress (Triaged by Manager)';
      notifType = 'BLOCKER_ACKNOWLEDGED';
    } else if (validStatus === 'OPEN') {
      notifTitle = 'ℹ️ Blocker Status Updated';
      notifType = 'INFO';
    }

    const notification = await prisma.notification.create({
      data: {
        userId: standup.userId,
        senderId: managerId,
        type: notifType,
        title: notifTitle,
        message: `${managerName}: "${note}"`,
        link: '/standup'
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } }
      }
    });

    res.json({
      message: `Blocker marked as ${validStatus}. Ping sent to ${standup.user.name}.`,
      standup: updatedStandup,
      notification
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error resolving blocker.', error: error.message });
  }
};
