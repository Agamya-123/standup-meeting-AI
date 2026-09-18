import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { AIService } from '../services/aiService.js';
import { getUserTeamAccess, getAllowedTeamIdsForUser } from '../utils/departmentAccess.js';
import { normalizeRole } from '../middleware/authorization.js';

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getDailyAISummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    const userRole = normalizeRole(req.user?.role || 'TEAM_MEMBER');

    if (!companyId || !userId) {
      res.status(401).json({ message: 'Unauthorized. Company context missing.' });
      return;
    }

    const today = (req.query.date as string) || getTodayDateString();
    const teamIdFilter = req.query.teamId as string;

    // Check access if teamId is filtered
    if (teamIdFilter) {
      const accessInfo = await getUserTeamAccess(userId, userRole, teamIdFilter, companyId);
      if (!accessInfo.allowed) {
        res.status(403).json({ message: 'Access to this department is restricted.' });
        return;
      }
    }

    // Use the shared scope resolver for every role. In particular, Managers
    // must be limited to teams in their own department rather than all teams
    // in the company.
    const allowedTeamIds = await getAllowedTeamIdsForUser(userId, userRole, companyId);

    const effectiveTeamIds = teamIdFilter ? [teamIdFilter] : allowedTeamIds;

    const userWhere: any = {
      companyId,
      memberships: {
        some: { teamId: { in: effectiveTeamIds } }
      }
    };

    const totalMembersCount = await prisma.user.count({
      where: userWhere
    });

    const standups = await prisma.dailyStandup.findMany({
      where: {
        date: today,
        user: { companyId },
        teamId: { in: effectiveTeamIds }
      },
      include: {
        user: { select: { name: true, role: true } }
      }
    });

    const formattedStandups = standups.map((s) => {
      let yesterday: string[] = [];
      let todayPlans: string[] = [];
      let blockers: string[] = [];

      try {
        yesterday = JSON.parse(s.yesterdayUpdates);
      } catch {
        yesterday = [s.yesterdayUpdates];
      }
      try {
        todayPlans = JSON.parse(s.todayPlans);
      } catch {
        todayPlans = [s.todayPlans];
      }
      try {
        blockers = JSON.parse(s.blockers || '[]');
      } catch {
        blockers = s.blockers ? [s.blockers] : [];
      }

      return {
        userName: s.user.name,
        userRole: s.user.role,
        yesterday,
        today: todayPlans,
        blockers,
        blockerLevel: s.blockerLevel as 'NONE' | 'MINOR' | 'CRITICAL'
      };
    });

    const aiSummary = AIService.generateDailySummary(formattedStandups, totalMembersCount);

    res.json(aiSummary);
  } catch (error: any) {
    res.status(500).json({ message: 'Error generating AI summary.', error: error.message });
  }
};
