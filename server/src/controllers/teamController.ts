import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { normalizeRole } from '../middleware/authorization.js';
import { getUserTeamAccess } from '../utils/departmentAccess.js';
import { logAuditEvent } from '../services/auditService.js';

/**
 * Get teams in the company accessible to the current user
 */
export const getTeams = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);

    let whereClause: any = {
      companyId: user.companyId,
      isActive: true
    };

    // If departmentId filter is provided in query
    if (req.query.departmentId) {
      whereClause.departmentId = req.query.departmentId as string;
    }

    // Role-based scope filtering
    if (role === 'MANAGER') {
      if (!user.departmentId) {
        res.json({ teams: [] });
        return;
      }
      whereClause.departmentId = user.departmentId;
    } else if (role === 'TEAM_LEAD') {
      const allowedTeamIds: string[] = [];
      if (user.teamId) allowedTeamIds.push(user.teamId);
      const ledTeams = await prisma.team.findMany({
        where: { companyId: user.companyId, teamLeadId: user.id, isActive: true },
        select: { id: true }
      });
      ledTeams.forEach((t) => {
        if (!allowedTeamIds.includes(t.id)) allowedTeamIds.push(t.id);
      });
      if (allowedTeamIds.length === 0) {
        res.json({ teams: [] });
        return;
      }
      whereClause.id = { in: allowedTeamIds };
    } else if (role === 'TEAM_MEMBER') {
      if (!user.teamId) {
        res.json({ teams: [] });
        return;
      }
      whereClause.id = user.teamId;
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        dept: { select: { id: true, name: true, description: true } },
        manager: { select: { id: true, name: true, email: true, avatar: true, employeeId: true } },
        teamLead: { select: { id: true, name: true, email: true, avatar: true, employeeId: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, avatar: true, employeeId: true } }
          }
        },
        userMembers: {
          where: { isActive: true },
          select: { id: true, name: true, email: true, role: true, avatar: true, employeeId: true }
        },
        accessGrants: {
          where: {
            status: 'APPROVED',
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
          },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
            grantedBy: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const enrichedTeams = await Promise.all(
      teams.map(async (team) => {
        const accessInfo = await getUserTeamAccess(user.id, role, team.id, user.companyId);
        return {
          ...team,
          department: team.dept?.name || team.department,
          userAccess: accessInfo
        };
      })
    );

    res.json({ teams: enrichedTeams });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching teams.', error: error.message });
  }
};

/**
 * Create a new team within a department
 */
export const createTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const { name, departmentId, description, managerId, teamLeadId } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Team name is required.' });
      return;
    }

    let targetDepartmentId = departmentId;

    // A manager can only create a team within their assigned department
    if (role === 'MANAGER') {
      if (!user.departmentId) {
        res.status(403).json({ message: 'You have not been assigned to a department yet.' });
        return;
      }
      if (departmentId && departmentId !== user.departmentId) {
        res.status(403).json({ message: 'Access denied: You cannot create teams in other departments.' });
        return;
      }
      targetDepartmentId = user.departmentId;
    }

    if (!targetDepartmentId) {
      res.status(400).json({ message: 'Department ID is required to create a team.' });
      return;
    }

    const dept = await prisma.department.findUnique({
      where: { id: targetDepartmentId }
    });

    if (!dept || dept.companyId !== user.companyId) {
      res.status(404).json({ message: 'Department not found in your company.' });
      return;
    }

    const team = await prisma.team.create({
      data: {
        companyId: user.companyId,
        departmentId: targetDepartmentId,
        name: name.trim(),
        department: dept.name,
        description: description ? description.trim() : null,
        managerId: managerId || (role === 'MANAGER' ? user.id : null),
        teamLeadId: teamLeadId || null,
        isActive: true
      },
      include: {
        dept: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true, avatar: true } },
        teamLead: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'CREATE_TEAM',
      targetType: 'TEAM',
      targetId: team.id,
      departmentId: targetDepartmentId,
      teamId: team.id,
      metadata: { name: team.name, departmentName: dept.name }
    });

    res.status(201).json({ message: 'Team created successfully.', team });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating team.', error: error.message });
  }
};

/**
 * Update Team
 */
export const updateTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const teamId = req.params.teamId as string;
    const { name, description, managerId, teamLeadId, departmentId, isActive } = req.body;

    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team || team.companyId !== user.companyId) {
      res.status(404).json({ message: 'Team not found.' });
      return;
    }

    // Role check: Managers can only edit teams in their department
    if (role === 'MANAGER' && team.departmentId !== user.departmentId) {
      res.status(403).json({ message: 'Access denied: You cannot edit teams outside your department.' });
      return;
    }

    // Only Admin can move a team across departments
    if (departmentId && departmentId !== team.departmentId && role !== 'ADMIN') {
      res.status(403).json({ message: 'Access denied: Only Administrators can transfer teams across departments.' });
      return;
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? (description ? description.trim() : null) : undefined,
        departmentId: departmentId || undefined,
        managerId: managerId !== undefined ? (managerId || null) : undefined,
        teamLeadId: teamLeadId !== undefined ? (teamLeadId || null) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined
      },
      include: {
        dept: true,
        manager: { select: { id: true, name: true, email: true } },
        teamLead: { select: { id: true, name: true, email: true } }
      }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'UPDATE_TEAM',
      targetType: 'TEAM',
      targetId: teamId,
      departmentId: updated.departmentId,
      teamId,
      metadata: { changes: { name, description, managerId, teamLeadId, departmentId, isActive } }
    });

    res.json({ message: 'Team updated successfully.', team: updated });
  } catch (err: any) {
    res.status(500).json({ message: 'Error updating team', error: err.message });
  }
};

/**
 * Deactivate / Delete Team
 */
export const deleteTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const teamId = req.params.teamId as string;

    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team || team.companyId !== user.companyId) {
      res.status(404).json({ message: 'Team not found.' });
      return;
    }

    if (role === 'MANAGER' && team.departmentId !== user.departmentId) {
      res.status(403).json({ message: 'Access denied: You cannot delete teams outside your department.' });
      return;
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { isActive: false }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'DEACTIVATE_TEAM',
      targetType: 'TEAM',
      targetId: teamId,
      departmentId: team.departmentId,
      teamId,
      metadata: { teamName: team.name }
    });

    res.json({ message: 'Team deactivated successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Error deleting team', error: err.message });
  }
};

/**
 * Add member to team
 */
export const addTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const teamId = req.params.teamId as string;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ message: 'User ID is required.' });
      return;
    }

    const team = await prisma.team.findFirst({ where: { id: teamId, companyId: user.companyId } });
    if (!team) {
      res.status(404).json({ message: 'Team not found in your company.' });
      return;
    }

    if (role === 'MANAGER' && team.departmentId !== user.departmentId) {
      res.status(403).json({ message: 'Access denied: Team is not in your department.' });
      return;
    }

    if (role === 'TEAM_LEAD' && team.id !== user.teamId && team.teamLeadId !== user.id) {
      res.status(403).json({ message: 'Access denied: You can only add members to your assigned team.' });
      return;
    }

    const targetUser = await prisma.user.findFirst({ where: { id: userId, companyId: user.companyId } });
    if (!targetUser) {
      res.status(404).json({ message: 'User not found in your company.' });
      return;
    }

    // Update user's departmentId and teamId
    await prisma.user.update({
      where: { id: userId },
      data: {
        departmentId: team.departmentId,
        teamId: team.id
      }
    });

    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: {},
      create: { teamId, userId }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'ADD_TEAM_MEMBER',
      targetType: 'USER',
      targetId: userId,
      departmentId: team.departmentId,
      teamId: team.id,
      metadata: { userName: targetUser.name, teamName: team.name }
    });

    res.status(201).json({ message: 'Member added to team successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error adding team member.', error: error.message });
  }
};

/**
 * Remove member from team
 */
export const removeTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const teamId = req.params.teamId as string;
    const userId = req.params.userId as string;

    const team = await prisma.team.findFirst({ where: { id: teamId, companyId: user.companyId } });
    if (!team) {
      res.status(404).json({ message: 'Team not found in your company.' });
      return;
    }

    if (role === 'MANAGER' && team.departmentId !== user.departmentId) {
      res.status(403).json({ message: 'Access denied: Team is not in your department.' });
      return;
    }

    if (role === 'TEAM_LEAD' && team.id !== user.teamId && team.teamLeadId !== user.id) {
      res.status(403).json({ message: 'Access denied: You can only remove members from your assigned team.' });
      return;
    }

    await prisma.teamMember.deleteMany({
      where: { teamId, userId }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { teamId: null }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'REMOVE_TEAM_MEMBER',
      targetType: 'USER',
      targetId: userId,
      departmentId: team.departmentId,
      teamId: team.id
    });

    res.json({ message: 'Member removed from team.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error removing team member.', error: error.message });
  }
};

/**
 * Request Cross-Department Temporary Access
 */
export const requestDepartmentAccess = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;
    const teamId = req.params.teamId as string;
    const { reason, durationHours } = req.body;

    if (!companyId || !userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, companyId },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        teamLead: { select: { id: true, name: true, email: true } }
      }
    });

    if (!team) {
      res.status(404).json({ message: 'Target team not found in your company.' });
      return;
    }

    const hours = Number(durationHours) > 0 ? Number(durationHours) : 24;

    const request = await prisma.departmentAccess.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: {
        status: 'PENDING',
        reason: reason?.trim() || null,
        durationHours: hours,
        expiresAt: null,
        updatedAt: new Date()
      },
      create: {
        teamId,
        userId,
        status: 'PENDING',
        reason: reason?.trim() || null,
        durationHours: hours
      },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    const recipients: string[] = [];
    if (team.teamLeadId && team.teamLeadId !== userId) recipients.push(team.teamLeadId);
    if (team.managerId && team.managerId !== userId && !recipients.includes(team.managerId)) recipients.push(team.managerId);

    const admins = await prisma.user.findMany({
      where: { companyId, role: 'ADMIN', id: { not: userId } },
      select: { id: true }
    });
    admins.forEach((a) => {
      if (!recipients.includes(a.id)) recipients.push(a.id);
    });

    for (const recipientId of recipients) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          senderId: userId,
          title: 'Cross-Department Access Request',
          message: `${req.user?.name || 'A team member'} requested temporary access (${hours}h) to view ${team.name} standups.`,
          type: 'INFO',
          link: '/teams'
        }
      });
    }

    res.status(201).json({
      message: `Access request submitted for ${team.name}.`,
      request
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting department access request.', error: error.message });
  }
};

/**
 * Get Cross-Department Access Requests
 */
export const getAccessRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);

    const myRequests = await prisma.departmentAccess.findMany({
      where: {
        userId: user.id,
        team: { companyId: user.companyId }
      },
      include: {
        team: { select: { id: true, name: true, department: true } },
        grantedBy: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    let incomingWhere: any = {
      team: { companyId: user.companyId },
      status: 'PENDING'
    };

    if (role === 'MANAGER' && user.departmentId) {
      incomingWhere.team = { companyId: user.companyId, departmentId: user.departmentId };
    } else if (role === 'TEAM_LEAD' && user.teamId) {
      incomingWhere.teamId = user.teamId;
    } else if (role !== 'ADMIN') {
      incomingWhere.teamId = 'NONE';
    }

    const incomingRequests = await prisma.departmentAccess.findMany({
      where: incomingWhere,
      include: {
        team: { select: { id: true, name: true, department: true } },
        user: { select: { id: true, name: true, email: true, avatar: true, employeeId: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const activeGrants = await prisma.departmentAccess.findMany({
      where: {
        team: { companyId: user.companyId },
        status: 'APPROVED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, avatar: true, employeeId: true } },
        grantedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      myRequests,
      incomingRequests,
      activeGrants
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching access requests.', error: error.message });
  }
};

/**
 * Approve Access Request
 */
export const approveAccessRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const requestId = req.params.requestId as string;
    const { durationHours } = req.body;

    const accessRequest = await prisma.departmentAccess.findUnique({
      where: { id: requestId },
      include: { team: true, user: { select: { id: true, name: true, email: true } } }
    });

    if (!accessRequest || accessRequest.team.companyId !== user.companyId) {
      res.status(404).json({ message: 'Access request not found in your company.' });
      return;
    }

    const isTeamLead = accessRequest.team.teamLeadId === user.id || accessRequest.team.managerId === user.id;
    const isDeptManager = role === 'MANAGER' && accessRequest.team.departmentId === user.departmentId;
    const canApprove = role === 'ADMIN' || isDeptManager || isTeamLead;

    if (!canApprove) {
      res.status(403).json({ message: 'Only the Department Manager, Team Lead, or an Admin can approve cross-department access.' });
      return;
    }

    const hours = Number(durationHours) > 0 ? Number(durationHours) : accessRequest.durationHours || 24;
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

    const updated = await prisma.departmentAccess.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        grantedById: user.id,
        durationHours: hours,
        expiresAt,
        updatedAt: new Date()
      },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.notification.create({
      data: {
        userId: accessRequest.userId,
        senderId: user.id,
        title: 'Access Granted! 🎉',
        message: `Your cross-department access to ${accessRequest.team.name} has been approved for ${hours} hours.`,
        type: 'INFO',
        link: '/standup'
      }
    });

    res.json({
      message: `Cross-department access granted to ${accessRequest.user.name} for ${hours} hours!`,
      grant: updated
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error approving access request.', error: error.message });
  }
};

/**
 * Reject Access Request
 */
export const rejectAccessRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const requestId = req.params.requestId as string;

    const accessRequest = await prisma.departmentAccess.findUnique({
      where: { id: requestId },
      include: { team: true, user: true }
    });

    if (!accessRequest || accessRequest.team.companyId !== user.companyId) {
      res.status(404).json({ message: 'Access request not found.' });
      return;
    }

    const isTeamLead = accessRequest.team.teamLeadId === user.id || accessRequest.team.managerId === user.id;
    const isDeptManager = role === 'MANAGER' && accessRequest.team.departmentId === user.departmentId;
    const canApprove = role === 'ADMIN' || isDeptManager || isTeamLead;

    if (!canApprove) {
      res.status(403).json({ message: 'Unauthorized to reject this request.' });
      return;
    }

    await prisma.departmentAccess.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        updatedAt: new Date()
      }
    });

    await prisma.notification.create({
      data: {
        userId: accessRequest.userId,
        senderId: user.id,
        title: 'Access Request Declined',
        message: `Your request for cross-department access to ${accessRequest.team.name} was declined.`,
        type: 'INFO',
        link: '/teams'
      }
    });

    res.json({ message: 'Access request rejected.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error rejecting access request.', error: error.message });
  }
};

/**
 * Revoke Active Access Grant
 */
export const revokeAccess = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const requestId = req.params.requestId as string;

    const grant = await prisma.departmentAccess.findUnique({
      where: { id: requestId },
      include: { team: true }
    });

    if (!grant || grant.team.companyId !== user.companyId) {
      res.status(404).json({ message: 'Access grant not found.' });
      return;
    }

    const isTeamLead = grant.team.teamLeadId === user.id || grant.team.managerId === user.id;
    const isDeptManager = role === 'MANAGER' && grant.team.departmentId === user.departmentId;
    const canApprove = role === 'ADMIN' || isDeptManager || isTeamLead;

    if (!canApprove) {
      res.status(403).json({ message: 'Unauthorized to revoke this access grant.' });
      return;
    }

    await prisma.departmentAccess.update({
      where: { id: requestId },
      data: {
        status: 'REVOKED',
        expiresAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Department access revoked successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error revoking access.', error: error.message });
  }
};

/**
 * Directly Grant Access to an Employee
 */
export const grantDirectAccess = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const teamId = req.params.teamId as string;
    const { userId, durationHours, reason } = req.body;

    if (!userId) {
      res.status(400).json({ message: 'Target user ID is required.' });
      return;
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, companyId: user.companyId }
    });

    if (!team) {
      res.status(404).json({ message: 'Team not found in your company.' });
      return;
    }

    const isTeamLead = team.teamLeadId === user.id || team.managerId === user.id;
    const isDeptManager = role === 'MANAGER' && team.departmentId === user.departmentId;
    const canGrant = role === 'ADMIN' || isDeptManager || isTeamLead;

    if (!canGrant) {
      res.status(403).json({ message: 'Only Department Managers, Team Leads, or Admins can grant access.' });
      return;
    }

    const hours = Number(durationHours) > 0 ? Number(durationHours) : 24;
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

    const grant = await prisma.departmentAccess.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: {
        status: 'APPROVED',
        grantedById: user.id,
        reason: reason?.trim() || 'Direct clearance granted',
        durationHours: hours,
        expiresAt,
        updatedAt: new Date()
      },
      create: {
        teamId,
        userId,
        grantedById: user.id,
        status: 'APPROVED',
        reason: reason?.trim() || 'Direct clearance granted',
        durationHours: hours,
        expiresAt
      },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.notification.create({
      data: {
        userId,
        senderId: user.id,
        title: 'Cross-Department Access Granted 🌟',
        message: `You were granted temporary access to ${team.name} for ${hours} hours.`,
        type: 'INFO',
        link: '/standup'
      }
    });

    res.status(201).json({
      message: `Direct access granted to ${grant.user.name} for ${hours} hours!`,
      grant
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error granting direct department access.', error: error.message });
  }
};
