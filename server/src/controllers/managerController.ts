import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { normalizeRole } from '../middleware/authorization.js';
import { getUserTeamAccess, getAllowedTeamIdsForUser } from '../utils/departmentAccess.js';

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getManagerDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    const rawRole = req.user?.role || 'TEAM_MEMBER';
    const userRole = normalizeRole(rawRole);

    if (!companyId || !userId) {
      res.status(401).json({ message: 'Unauthorized. Company context missing.' });
      return;
    }

    const today = (req.query.date as string) || getTodayDateString();
    const teamIdFilter = req.query.teamId as string;

    // 1. If filtering by a specific team, verify user's scope / access
    if (teamIdFilter) {
      const accessInfo = await getUserTeamAccess(userId, userRole, teamIdFilter, companyId);
      if (!accessInfo.allowed) {
        const team = await prisma.team.findUnique({
          where: { id: teamIdFilter },
          include: {
            dept: { select: { id: true, name: true } },
            manager: { select: { id: true, name: true, email: true, avatar: true } },
            teamLead: { select: { id: true, name: true, email: true, avatar: true } }
          }
        });

        const safeTeam =
          team && team.companyId === companyId
            ? {
                id: team.id,
                name: team.name,
                department: team.dept?.name || team.department,
                description: team.description,
                manager: team.manager,
                teamLead: team.teamLead
              }
            : null;

        res.json({
          restricted: true,
          date: today,
          team: safeTeam,
          userAccess: accessInfo
        });
        return;
      }
    }

    // 2. Determine allowed teams for this user
    let allowedTeamIds: string[] = [];
    if (userRole === 'ADMIN') {
      const allTeams = await prisma.team.findMany({
        where: { companyId, isActive: true },
        select: { id: true }
      });
      allowedTeamIds = allTeams.map((t) => t.id);
    } else {
      allowedTeamIds = await getAllowedTeamIdsForUser(userId, userRole, companyId);
    }

    // If a filter is specified, only that allowed team is used
    const effectiveTeamIds = teamIdFilter ? [teamIdFilter] : allowedTeamIds;

    // Fetch team members belonging to this company in the allowed/filtered teams
    let userWhereClause: any = {
      companyId,
      isActive: true,
      OR: [
        { teamId: { in: effectiveTeamIds } },
        { memberships: { some: { teamId: { in: effectiveTeamIds } } } }
      ]
    };

    const allMembers = await prisma.user.findMany({
      where: userWhereClause,
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        avatar: true,
        departmentId: true,
        teamId: true,
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } }
      }
    });

    const totalMembers = allMembers.length;

    // Fetch standup submissions for target date for this company in effective teams
    const standups = await prisma.dailyStandup.findMany({
      where: {
        date: today,
        user: { companyId, isActive: true },
        teamId: { in: effectiveTeamIds }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, avatar: true, employeeId: true }
        },
        team: {
          select: { id: true, name: true, department: true }
        },
        resolvedBy: {
          select: { id: true, name: true, email: true }
        },
        reactions: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        }
      }
    });

    // Map members to their standup status
    const standupMap = new Map(standups.map((s) => [s.userId, s]));

    const memberFeed = allMembers.map((member) => {
      const submission = standupMap.get(member.id);
      return {
        user: {
          ...member,
          role: normalizeRole(member.role)
        },
        hasSubmitted: !!submission,
        submission: submission || null,
        status: submission ? 'SUBMITTED' : 'PENDING',
        blockerLevel: submission ? submission.blockerLevel : 'NONE'
      };
    });

    const submittedCount = standups.length;
    const pendingCount = Math.max(0, totalMembers - submittedCount);

    const criticalBlockers = standups.filter((s) => s.blockerLevel === 'CRITICAL');
    const minorBlockers = standups.filter((s) => s.blockerLevel === 'MINOR');
    const activeBlockersCount =
      criticalBlockers.filter((s) => s.blockerStatus !== 'RESOLVED').length +
      minorBlockers.filter((s) => s.blockerStatus !== 'RESOLVED').length;

    const submissionRate = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0;

    // Priority list with full blocker resolution status
    const priorityBlockers = [
      ...criticalBlockers.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.user.name,
        userAvatar: s.user.avatar,
        employeeId: s.user.employeeId,
        teamName: s.team.name,
        blockerLevel: s.blockerLevel,
        blockerStatus: s.blockerStatus,
        blockerResolutionNote: s.blockerResolutionNote,
        blockerResolvedAt: s.blockerResolvedAt,
        resolvedBy: s.resolvedBy,
        blockers: s.blockers,
        submittedAt: s.submittedAt
      })),
      ...minorBlockers.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.user.name,
        userAvatar: s.user.avatar,
        employeeId: s.user.employeeId,
        teamName: s.team.name,
        blockerLevel: s.blockerLevel,
        blockerStatus: s.blockerStatus,
        blockerResolutionNote: s.blockerResolutionNote,
        blockerResolvedAt: s.blockerResolvedAt,
        resolvedBy: s.resolvedBy,
        blockers: s.blockers,
        submittedAt: s.submittedAt
      }))
    ];

    res.json({
      restricted: false,
      date: today,
      stats: {
        totalMembers,
        submittedCount,
        pendingCount,
        activeBlockersCount,
        criticalBlockersCount: criticalBlockers.filter((s) => s.blockerStatus !== 'RESOLVED').length,
        minorBlockersCount: minorBlockers.filter((s) => s.blockerStatus !== 'RESOLVED').length,
        submissionRate
      },
      priorityBlockers,
      teamMembersFeed: memberFeed
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error loading manager dashboard.', error: error.message });
  }
};
