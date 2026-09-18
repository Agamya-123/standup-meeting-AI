import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { normalizeRole } from '../middleware/authorization.js';
import { logAuditEvent } from '../services/auditService.js';
import bcrypt from 'bcryptjs';

export const getTeamMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);

    let whereClause: any = {
      companyId: user.companyId,
      role: 'TEAM_MEMBER',
      isActive: true
    };

    if (role === 'MANAGER') {
      if (!user.departmentId) {
        res.json({ members: [] });
        return;
      }
      whereClause.departmentId = user.departmentId;
    } else if (role === 'TEAM_LEAD') {
      if (!user.teamId) {
        res.json({ members: [] });
        return;
      }
      whereClause.teamId = user.teamId;
    } else if (role === 'TEAM_MEMBER') {
      if (!user.teamId) {
        res.json({ members: [] });
        return;
      }
      whereClause.teamId = user.teamId;
    }

    const members = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        avatar: true,
        departmentId: true,
        teamId: true,
        isActive: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ members });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching Team Members', error: err.message });
  }
};

export const createTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const { name, email, password, employeeId, departmentId, teamId } = req.body;

    if (!name || !email || !password || !departmentId || !teamId) {
      res.status(400).json({ message: 'Name, email, password, departmentId, and teamId are required.' });
      return;
    }

    // Role checks
    if (role === 'MANAGER' && user.departmentId !== departmentId) {
      res.status(403).json({ message: 'Access denied: You can only add members to your own department.' });
      return;
    }

    if (role === 'TEAM_LEAD' && (user.departmentId !== departmentId || user.teamId !== teamId)) {
      res.status(403).json({ message: 'Access denied: Team Leads can only add members to their own team.' });
      return;
    }

    if (role === 'TEAM_MEMBER') {
      res.status(403).json({ message: 'Access denied: Team Members cannot create other members.' });
      return;
    }

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department || department.companyId !== user.companyId) {
      res.status(404).json({ message: 'Department not found in your company.' });
      return;
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.companyId !== user.companyId || team.departmentId !== departmentId) {
      res.status(404).json({ message: 'Team not found in the specified department.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      res.status(409).json({ message: 'A user with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newMember = await prisma.user.create({
      data: {
        companyId: user.companyId,
        departmentId: department.id,
        teamId: team.id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'TEAM_MEMBER',
        employeeId: employeeId ? employeeId.trim() : null,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        departmentId: true,
        teamId: true,
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } }
      }
    });

    // Also link in TeamMember relation for backwards compatibility
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: newMember.id
      }
    }).catch(() => {});

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'CREATE_TEAM_MEMBER',
      targetType: 'USER',
      targetId: newMember.id,
      departmentId: department.id,
      teamId: team.id,
      metadata: { name: newMember.name, email: newMember.email, teamName: team.name }
    });

    res.status(201).json({
      message: 'Team Member created successfully.',
      member: newMember
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error creating team member', error: err.message });
  }
};
