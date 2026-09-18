import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { prisma } from '../config/prisma.js';

export const normalizeRole = (role?: string): string => {
  if (!role) return 'TEAM_MEMBER';
  const upper = role.toUpperCase();
  if (upper === 'MEMBER') return 'TEAM_MEMBER';
  return upper;
};

export const requireRoles = (...allowedRoles: string[]) => {
  const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userRole = normalizeRole(req.user.role);
    if (!normalizedAllowed.includes(userRole)) {
      res.status(403).json({
        message: `Access denied. Role '${userRole}' not authorized. Required: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Ensures actor has permission to access/modify a Department.
 * - ADMIN: Access any department in company.
 * - MANAGER: Access ONLY their assigned department.
 * - TEAM_LEAD / TEAM_MEMBER: Read-only access to their assigned department.
 */
export const requireDepartmentScope = (paramKey: string = 'id', allowReadForMembers: boolean = false) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const role = normalizeRole(user.role);
      const departmentId = (req.params[paramKey] || req.body[paramKey] || req.query[paramKey]) as string;

      if (!departmentId) {
        res.status(400).json({ message: 'Department identifier missing from request.' });
        return;
      }

      // 1. Verify department exists and belongs to user's company
      const department = await prisma.department.findUnique({
        where: { id: departmentId }
      });

      if (!department || department.companyId !== user.companyId) {
        res.status(404).json({ message: 'Department not found in your company.' });
        return;
      }

      // 2. ADMIN has unrestricted scope within company
      if (role === 'ADMIN') {
        (req as any).targetDepartment = department;
        next();
        return;
      }

      // 3. MANAGER must be assigned to this department
      if (role === 'MANAGER') {
        if (user.departmentId === departmentId) {
          (req as any).targetDepartment = department;
          next();
          return;
        }
        res.status(403).json({
          message: 'Access denied: Managers can only access their assigned department.'
        });
        return;
      }

      // 4. TEAM_LEAD / TEAM_MEMBER read access
      if (allowReadForMembers && (role === 'TEAM_LEAD' || role === 'TEAM_MEMBER')) {
        if (user.departmentId === departmentId) {
          (req as any).targetDepartment = department;
          next();
          return;
        }
      }

      res.status(403).json({
        message: 'Access denied: You do not have permission for this department.'
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Error checking department scope.', error: err.message });
    }
  };
};

/**
 * Ensures actor has permission to access/modify a Team.
 * - ADMIN: Unrestricted access to all teams in company.
 * - MANAGER: Access to teams within their assigned department.
 * - TEAM_LEAD: Access to their assigned team.
 * - TEAM_MEMBER: Read-only access to their assigned team.
 */
export const requireTeamScope = (paramKey: string = 'id', allowReadForMembers: boolean = false) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const role = normalizeRole(user.role);
      const teamId = (req.params[paramKey] || req.body[paramKey] || req.query[paramKey]) as string;

      if (!teamId) {
        res.status(400).json({ message: 'Team identifier missing from request.' });
        return;
      }

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { dept: true }
      });

      if (!team || team.companyId !== user.companyId) {
        res.status(404).json({ message: 'Team not found in your company.' });
        return;
      }

      // 1. ADMIN has unrestricted scope
      if (role === 'ADMIN') {
        (req as any).targetTeam = team;
        next();
        return;
      }

      // 2. MANAGER must oversee the department the team belongs to
      if (role === 'MANAGER') {
        if (team.departmentId && team.departmentId === user.departmentId) {
          (req as any).targetTeam = team;
          next();
          return;
        }
        res.status(403).json({
          message: 'Access denied: Team does not belong to your assigned department.'
        });
        return;
      }

      // 3. TEAM_LEAD must lead this team
      if (role === 'TEAM_LEAD') {
        if (team.teamLeadId === user.id || team.id === user.teamId) {
          (req as any).targetTeam = team;
          next();
          return;
        }
        res.status(403).json({
          message: 'Access denied: Team Leads can only manage their assigned team.'
        });
        return;
      }

      // 4. TEAM_MEMBER
      if (allowReadForMembers && role === 'TEAM_MEMBER') {
        if (team.id === user.teamId) {
          (req as any).targetTeam = team;
          next();
          return;
        }
      }

      res.status(403).json({
        message: 'Access denied: You do not have permission for this team.'
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Error checking team scope.', error: err.message });
    }
  };
};

/**
 * Ensures actor can manage a target User according to hierarchical rules:
 * - ADMIN: Can manage any user in company.
 * - MANAGER: Can manage Team Leads and Team Members in their department. Cannot manage Admins or Managers.
 * - TEAM_LEAD: Can manage Team Members in their team. Cannot manage Admins, Managers, or other Leads.
 * - TEAM_MEMBER: Can only manage own self (profile / standup).
 */
export const requireUserScope = (paramKey: string = 'id', allowSelf: boolean = true) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const role = normalizeRole(user.role);
      const targetUserId = (req.params[paramKey] || req.body[paramKey] || req.query[paramKey]) as string;

      if (!targetUserId) {
        res.status(400).json({ message: 'Target user identifier missing from request.' });
        return;
      }

      if (allowSelf && targetUserId === user.id) {
        next();
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { department: true, team: true }
      });

      if (!targetUser || targetUser.companyId !== user.companyId) {
        res.status(404).json({ message: 'Target user not found in your company.' });
        return;
      }

      const targetRole = normalizeRole(targetUser.role);

      // 1. ADMIN can manage any user
      if (role === 'ADMIN') {
        (req as any).targetUser = targetUser;
        next();
        return;
      }

      // 2. MANAGER can manage users in their department EXCEPT other Managers or Admins
      if (role === 'MANAGER') {
        if (targetRole === 'ADMIN' || targetRole === 'MANAGER') {
          res.status(403).json({
            message: 'Access denied: Managers cannot modify other Managers or Administrators.'
          });
          return;
        }

        if (targetUser.departmentId === user.departmentId) {
          (req as any).targetUser = targetUser;
          next();
          return;
        }

        res.status(403).json({
          message: 'Access denied: User does not belong to your department.'
        });
        return;
      }

      // 3. TEAM_LEAD can manage Team Members in their team
      if (role === 'TEAM_LEAD') {
        if (targetRole !== 'TEAM_MEMBER') {
          res.status(403).json({
            message: 'Access denied: Team Leads can only manage Team Members.'
          });
          return;
        }

        if (targetUser.teamId === user.teamId) {
          (req as any).targetUser = targetUser;
          next();
          return;
        }

        res.status(403).json({
          message: 'Access denied: User does not belong to your team.'
        });
        return;
      }

      res.status(403).json({
        message: 'Access denied: Insufficient hierarchical privileges.'
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Error checking user scope.', error: err.message });
    }
  };
};
