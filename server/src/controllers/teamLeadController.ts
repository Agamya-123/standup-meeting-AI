import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { normalizeRole } from '../middleware/authorization.js';
import { logAuditEvent } from '../services/auditService.js';
import bcrypt from 'bcryptjs';

export const getTeamLeads = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);

    let whereClause: any = {
      companyId: user.companyId,
      role: 'TEAM_LEAD',
      isActive: true
    };

    if (role === 'MANAGER' && user.departmentId) {
      whereClause.departmentId = user.departmentId;
    } else if (role !== 'ADMIN') {
      res.status(403).json({ message: 'Access denied: You must be an ADMIN or MANAGER to view Team Leads.' });
      return;
    }

    const leads = await prisma.user.findMany({
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

    res.json({ leads });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching Team Leads', error: err.message });
  }
};

export const createTeamLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const { name, email, password, employeeId, departmentId, teamId } = req.body;

    if (!name || !email || !password || !departmentId || !teamId) {
      res.status(400).json({ message: 'Name, email, password, departmentId, and teamId are required.' });
      return;
    }

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department || department.companyId !== user.companyId) {
      res.status(404).json({ message: 'Target department not found in your company.' });
      return;
    }

    if (role === 'MANAGER' && user.departmentId !== departmentId) {
      res.status(403).json({ message: 'Access denied: You can only create Team Leads within your own department.' });
      return;
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.companyId !== user.companyId || team.departmentId !== departmentId) {
      res.status(404).json({ message: 'Target team not found in the selected department.' });
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

    const newLead = await prisma.user.create({
      data: {
        companyId: user.companyId,
        departmentId: department.id,
        teamId: team.id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'TEAM_LEAD',
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

    await prisma.team.update({
      where: { id: team.id },
      data: { teamLeadId: newLead.id }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'CREATE_TEAM_LEAD',
      targetType: 'USER',
      targetId: newLead.id,
      departmentId: department.id,
      teamId: team.id,
      metadata: { name: newLead.name, email: newLead.email, teamName: team.name }
    });

    res.status(201).json({
      message: 'Team Lead created successfully.',
      lead: newLead
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error creating Team Lead', error: err.message });
  }
};
