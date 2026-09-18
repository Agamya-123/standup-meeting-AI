import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { normalizeRole } from '../middleware/authorization.js';
import { logAuditEvent } from '../services/auditService.js';

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const submitStandup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const userId = user.id;

    const { yesterdayUpdates, todayPlans, blockers, blockerLevel, teamId } = req.body;

    if (!yesterdayUpdates || !todayPlans) {
      res.status(400).json({ message: 'Yesterday accomplishments and today plans are required.' });
      return;
    }

    const date = getTodayDateString();

    // Determine user's team
    let assignedTeamId = teamId || user.teamId;
    if (!assignedTeamId) {
      const userRec = await prisma.user.findUnique({
        where: { id: userId },
        select: { teamId: true }
      });
      assignedTeamId = userRec?.teamId;
    }

    if (!assignedTeamId) {
      const membership = await prisma.teamMember.findFirst({
        where: { userId }
      });
      if (membership) {
        assignedTeamId = membership.teamId;
      } else {
        const defaultTeam = await prisma.team.findFirst({
          where: { companyId: user.companyId, isActive: true }
        });
        assignedTeamId = defaultTeam?.id;
      }
    }

    if (!assignedTeamId) {
      res.status(400).json({ message: 'User must belong to a team to submit a standup.' });
      return;
    }

    // Check if user already submitted for today
    const existing = await prisma.dailyStandup.findUnique({
      where: {
        userId_date: {
          userId,
          date
        }
      }
    });

    if (existing) {
      res.status(400).json({
        message: 'You have already submitted a daily standup for today. You can edit your existing submission.',
        existingId: existing.id
      });
      return;
    }

    const formattedYesterday = Array.isArray(yesterdayUpdates) ? JSON.stringify(yesterdayUpdates) : JSON.stringify([yesterdayUpdates]);
    const formattedToday = Array.isArray(todayPlans) ? JSON.stringify(todayPlans) : JSON.stringify([todayPlans]);
    const formattedBlockers = Array.isArray(blockers) ? JSON.stringify(blockers) : JSON.stringify(blockers ? [blockers] : []);

    const validBlockerLevel = ['NONE', 'MINOR', 'CRITICAL'].includes(blockerLevel) ? blockerLevel : 'NONE';

    const standup = await prisma.dailyStandup.create({
      data: {
        userId,
        teamId: assignedTeamId,
        date,
        yesterdayUpdates: formattedYesterday,
        todayPlans: formattedToday,
        blockers: formattedBlockers,
        blockerLevel: validBlockerLevel,
        blockerStatus: validBlockerLevel === 'NONE' ? 'RESOLVED' : 'OPEN'
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        team: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
        reactions: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: userId,
      action: 'SUBMIT_STANDUP',
      targetType: 'STANDUP',
      targetId: standup.id,
      teamId: assignedTeamId,
      metadata: { blockerLevel: validBlockerLevel, date }
    });

    res.status(201).json({ message: 'Standup submitted successfully!', standup });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: 'A daily standup for this user and date already exists.',
      });
      return;
    }
    res.status(500).json({ message: 'Failed to submit standup.', error: error.message });
  }
};

export const getTodayStandup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const date = getTodayDateString();

    const standup = await prisma.dailyStandup.findUnique({
      where: {
        userId_date: {
          userId,
          date
        }
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        team: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
        reactions: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });

    res.json({ date, submitted: !!standup, standup: standup || null });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching today standup.', error: error.message });
  }
};

export const updateStandup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = req.user!;
    const userId = user.id;
    const role = normalizeRole(user.role);
    const { yesterdayUpdates, todayPlans, blockers, blockerLevel } = req.body;

    const existing = await prisma.dailyStandup.findUnique({
      where: { id },
      include: {
        user: { select: { companyId: true } },
      },
    });

    if (!existing || existing.user.companyId !== user.companyId) {
      res.status(404).json({ message: 'Standup record not found.' });
      return;
    }

    if (existing.userId !== userId && role !== 'ADMIN') {
      res.status(403).json({ message: 'You can only update your own standup submission.' });
      return;
    }

    const formattedYesterday = Array.isArray(yesterdayUpdates) ? JSON.stringify(yesterdayUpdates) : JSON.stringify([yesterdayUpdates]);
    const formattedToday = Array.isArray(todayPlans) ? JSON.stringify(todayPlans) : JSON.stringify([todayPlans]);
    const formattedBlockers = Array.isArray(blockers) ? JSON.stringify(blockers) : JSON.stringify(blockers ? [blockers] : []);
    const validBlockerLevel = ['NONE', 'MINOR', 'CRITICAL'].includes(blockerLevel) ? blockerLevel : existing.blockerLevel;

    const updated = await prisma.dailyStandup.update({
      where: { id },
      data: {
        yesterdayUpdates: formattedYesterday,
        todayPlans: formattedToday,
        blockers: formattedBlockers,
        blockerLevel: validBlockerLevel,
        blockerStatus: validBlockerLevel === 'NONE' ? 'RESOLVED' : existing.blockerStatus
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        team: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
        reactions: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });

    res.json({ message: 'Standup updated successfully.', standup: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating standup.', error: error.message });
  }
};

export const getMyStandupHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const standups = await prisma.dailyStandup.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        team: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
        reactions: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });

    res.json({ history: standups });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching standup history.', error: error.message });
  }
};
