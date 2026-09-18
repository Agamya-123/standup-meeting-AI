import { prisma } from '../config/prisma.js';
import { normalizeRole } from '../middleware/authorization.js';

export interface UserTeamAccessResult {
  allowed: boolean;
  reason: 'ADMIN_GLOBAL' | 'DEPARTMENT_MANAGER' | 'TEAM_LEAD' | 'DIRECT_MEMBER' | 'TEMPORARY_ACCESS_GRANTED' | 'RESTRICTED';
  isMember: boolean;
  isLead: boolean;
  hasTempAccess: boolean;
  expiresAt: Date | null;
  grantId?: string;
  pendingRequest?: {
    id: string;
    createdAt: Date;
    durationHours: number;
    reason: string | null;
  } | null;
}

/**
 * Determines whether a user can view standups/analytics for a given team
 */
export const getUserTeamAccess = async (
  userId: string,
  rawRole: string,
  teamId: string,
  companyId: string
): Promise<UserTeamAccessResult> => {
  const role = normalizeRole(rawRole);

  // 1. ADMIN: Unrestricted global access across the entire company
  if (role === 'ADMIN') {
    return {
      allowed: true,
      reason: 'ADMIN_GLOBAL',
      isMember: false,
      isLead: false,
      hasTempAccess: false,
      expiresAt: null
    };
  }

  // Fetch user's departmentId & teamId
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true, teamId: true }
  });

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, companyId: true, departmentId: true, teamLeadId: true, managerId: true }
  });

  if (!team || team.companyId !== companyId) {
    return {
      allowed: false,
      reason: 'RESTRICTED',
      isMember: false,
      isLead: false,
      hasTempAccess: false,
      expiresAt: null
    };
  }

  // 2. MANAGER: Has full access to any team belonging to their assigned department
  if (role === 'MANAGER') {
    if (user?.departmentId && team.departmentId === user.departmentId) {
      return {
        allowed: true,
        reason: 'DEPARTMENT_MANAGER',
        isMember: false,
        isLead: false,
        hasTempAccess: false,
        expiresAt: null
      };
    }
  }

  // 3. TEAM_LEAD: Direct access to their led or assigned team
  if (role === 'TEAM_LEAD') {
    if (team.teamLeadId === userId || user?.teamId === teamId) {
      return {
        allowed: true,
        reason: 'TEAM_LEAD',
        isMember: true,
        isLead: true,
        hasTempAccess: false,
        expiresAt: null
      };
    }
  }

  // 4. TEAM_MEMBER: Direct access to their assigned team
  if (user?.teamId === teamId) {
    return {
      allowed: true,
      reason: 'DIRECT_MEMBER',
      isMember: true,
      isLead: false,
      hasTempAccess: false,
      expiresAt: null
    };
  }

  // Check legacy teamMember table as fallback
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } }
  });

  if (membership) {
    return {
      allowed: true,
      reason: 'DIRECT_MEMBER',
      isMember: true,
      isLead: false,
      hasTempAccess: false,
      expiresAt: null
    };
  }

  // 5. Check if user has an active temporary cross-department access grant
  const now = new Date();
  const activeGrant = await prisma.departmentAccess.findFirst({
    where: {
      teamId,
      userId,
      status: 'APPROVED',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    }
  });

  if (activeGrant) {
    return {
      allowed: true,
      reason: 'TEMPORARY_ACCESS_GRANTED',
      isMember: false,
      isLead: false,
      hasTempAccess: true,
      expiresAt: activeGrant.expiresAt,
      grantId: activeGrant.id
    };
  }

  // 6. Check for pending request
  const pendingRequest = await prisma.departmentAccess.findFirst({
    where: {
      teamId,
      userId,
      status: 'PENDING'
    }
  });

  return {
    allowed: false,
    reason: 'RESTRICTED',
    isMember: false,
    isLead: false,
    hasTempAccess: false,
    expiresAt: null,
    pendingRequest: pendingRequest
      ? {
          id: pendingRequest.id,
          createdAt: pendingRequest.createdAt,
          durationHours: pendingRequest.durationHours,
          reason: pendingRequest.reason
        }
      : null
  };
};

/**
 * Returns all team IDs that a user is authorized to view
 */
export const getAllowedTeamIdsForUser = async (
  userId: string,
  rawRole: string,
  companyId: string
): Promise<string[]> => {
  const role = normalizeRole(rawRole);

  // 1. ADMIN: All teams in company
  if (role === 'ADMIN') {
    const allTeams = await prisma.team.findMany({
      where: { companyId, isActive: true },
      select: { id: true }
    });
    return allTeams.map((t) => t.id);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true, teamId: true }
  });

  let teamIds = new Set<string>();

  // 2. MANAGER: All teams in assigned department
  if (role === 'MANAGER' && user?.departmentId) {
    const deptTeams = await prisma.team.findMany({
      where: { companyId, departmentId: user.departmentId, isActive: true },
      select: { id: true }
    });
    deptTeams.forEach((t) => teamIds.add(t.id));
  }

  // 3. TEAM_LEAD / TEAM_MEMBER: Direct team
  if (user?.teamId) {
    teamIds.add(user.teamId);
  }

  // Direct memberships
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true }
  });
  memberships.forEach((m) => teamIds.add(m.teamId));

  // 4. Active approved temporary grants
  const now = new Date();
  const activeGrants = await prisma.departmentAccess.findMany({
    where: {
      userId,
      status: 'APPROVED',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    },
    select: { teamId: true }
  });
  activeGrants.forEach((g) => teamIds.add(g.teamId));

  return Array.from(teamIds);
};
