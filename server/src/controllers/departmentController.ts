import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { normalizeRole } from '../middleware/authorization.js';
import { logAuditEvent } from '../services/auditService.js';

export const getDepartments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);

    let whereClause: any = {
      companyId: user.companyId,
      isActive: true
    };

    // If Manager, Team Lead or Team Member, restrict to their assigned department
    if (role !== 'ADMIN') {
      if (!user.departmentId) {
        res.json({ departments: [] });
        return;
      }
      whereClause.id = user.departmentId;
    }

    const departments = await prisma.department.findMany({
      where: whereClause,
      include: {
        teams: {
          where: { isActive: true },
          include: {
            manager: { select: { id: true, name: true, email: true, role: true, avatar: true } },
            teamLead: { select: { id: true, name: true, email: true, role: true, avatar: true } },
            userMembers: {
              where: { isActive: true },
              select: { id: true, name: true, email: true, role: true, avatar: true }
            }
          }
        },
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            teamId: true,
            avatar: true,
            employeeId: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const transformed = departments.map((d) => {
      const managers = d.users.filter((u: any) => normalizeRole(u.role) === 'MANAGER');
      const leads = d.users.filter((u: any) => normalizeRole(u.role) === 'TEAM_LEAD');
      const members = d.users.filter((u: any) => normalizeRole(u.role) === 'TEAM_MEMBER');

      return {
        id: d.id,
        name: d.name,
        description: d.description,
        isActive: d.isActive,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        stats: {
          totalTeams: d.teams.length,
          totalManagers: managers.length,
          totalLeads: leads.length,
          totalMembers: members.length,
          totalUsers: d.users.length
        },
        teams: d.teams,
        managers,
        leads,
        members
      };
    });

    res.json({ departments: transformed });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching departments', error: err.message });
  }
};

export const getDepartmentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const role = normalizeRole(user.role);

    if (role !== 'ADMIN' && user.departmentId !== id) {
      res.status(403).json({ message: 'Access denied: You can only view your own department.' });
      return;
    }

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        teams: {
          where: { isActive: true },
          include: {
            manager: { select: { id: true, name: true, email: true, avatar: true } },
            teamLead: { select: { id: true, name: true, email: true, avatar: true } },
            userMembers: {
              where: { isActive: true },
              select: { id: true, name: true, email: true, role: true, avatar: true, employeeId: true }
            }
          }
        },
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeId: true,
            teamId: true,
            avatar: true
          }
        }
      }
    });

    if (!department || department.companyId !== user.companyId) {
      res.status(404).json({ message: 'Department not found.' });
      return;
    }

    res.json({ department });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching department', error: err.message });
  }
};

export const getDepartmentHierarchy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const role = normalizeRole(user.role);

    if (role !== 'ADMIN' && user.departmentId !== id) {
      res.status(403).json({ message: 'Access denied: You can only view hierarchy for your assigned department.' });
      return;
    }

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, name: true, email: true, role: true, avatar: true, employeeId: true, teamId: true }
        },
        teams: {
          where: { isActive: true },
          include: {
            manager: { select: { id: true, name: true, email: true, avatar: true } },
            teamLead: { select: { id: true, name: true, email: true, avatar: true } },
            userMembers: {
              where: { isActive: true },
              select: { id: true, name: true, email: true, role: true, avatar: true, employeeId: true }
            }
          }
        }
      }
    });

    if (!department || department.companyId !== user.companyId) {
      res.status(404).json({ message: 'Department not found.' });
      return;
    }

    const managers = (department as any).users.filter((u: any) => normalizeRole(u.role) === 'MANAGER');

    const tree = {
      id: department.id,
      name: department.name,
      type: 'DEPARTMENT',
      managers: managers.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        employeeId: m.employeeId,
        avatar: m.avatar,
        role: 'MANAGER'
      })),
      teams: (department as any).teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        type: 'TEAM',
        teamLead: t.teamLead
          ? {
              id: t.teamLead.id,
              name: t.teamLead.name,
              email: t.teamLead.email,
              avatar: t.teamLead.avatar,
              role: 'TEAM_LEAD'
            }
          : null,
        members: t.userMembers
          .filter((m: any) => normalizeRole(m.role) === 'TEAM_MEMBER')
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            employeeId: m.employeeId,
            avatar: m.avatar,
            role: 'TEAM_MEMBER'
          }))
      }))
    };

    res.json({ hierarchy: tree });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving department hierarchy', error: err.message });
  }
};

export const createDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Department name is required.' });
      return;
    }

    const cleanName = name.trim();

    // Check duplicate name in same company
    const existing = await prisma.department.findFirst({
      where: {
        companyId: user.companyId,
        name: { equals: cleanName }
      }
    });

    if (existing) {
      res.status(409).json({ message: `A department with the name "${cleanName}" already exists.` });
      return;
    }

    const department = await prisma.department.create({
      data: {
        companyId: user.companyId,
        name: cleanName,
        description: description ? description.trim() : null,
        isActive: true
      }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'CREATE_DEPARTMENT',
      targetType: 'DEPARTMENT',
      targetId: department.id,
      departmentId: department.id,
      metadata: { name: cleanName, description }
    });

    res.status(201).json({
      message: 'Department created successfully.',
      department
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error creating department', error: err.message });
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { name, description, isActive } = req.body;

    const department = await prisma.department.findUnique({
      where: { id }
    });

    if (!department || department.companyId !== user.companyId) {
      res.status(404).json({ message: 'Department not found.' });
      return;
    }

    if (name) {
      const duplicate = await prisma.department.findFirst({
        where: {
          companyId: user.companyId,
          name: { equals: name.trim() },
          id: { not: id }
        }
      });
      if (duplicate) {
        res.status(409).json({ message: `Department with name "${name.trim()}" already exists.` });
        return;
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? (description ? description.trim() : null) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined
      }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'UPDATE_DEPARTMENT',
      targetType: 'DEPARTMENT',
      targetId: id,
      departmentId: id,
      metadata: { changes: { name, description, isActive } }
    });

    res.json({
      message: 'Department updated successfully.',
      department: updated
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error updating department', error: err.message });
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        teams: { where: { isActive: true } },
        users: { where: { isActive: true } }
      }
    });

    if (!department || department.companyId !== user.companyId) {
      res.status(404).json({ message: 'Department not found.' });
      return;
    }

    // Soft delete / deactivate
    await prisma.department.update({
      where: { id },
      data: { isActive: false }
    });

    // Also deactivate nested teams
    await prisma.team.updateMany({
      where: { departmentId: id },
      data: { isActive: false }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'DEACTIVATE_DEPARTMENT',
      targetType: 'DEPARTMENT',
      targetId: id,
      departmentId: id,
      metadata: { name: department.name }
    });

    res.json({ message: 'Department and associated teams deactivated successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Error deleting department', error: err.message });
  }
};
