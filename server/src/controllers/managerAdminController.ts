import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { normalizeRole } from '../middleware/authorization.js';
import { logAuditEvent } from '../services/auditService.js';

export const getManagers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);

    let whereClause: any = {
      companyId: user.companyId,
      role: 'MANAGER',
      isActive: true
    };

    if (role === 'MANAGER') {
      whereClause.id = user.id;
    } else if (role !== 'ADMIN') {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const managers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        avatar: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
        department: {
          select: { id: true, name: true, description: true }
        },
        managedTeams: {
          where: { isActive: true },
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ managers });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching managers', error: err.message });
  }
};

export const createManager = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { name, email, password, employeeId, departmentId } = req.body;

    if (!name || !email || !password || !departmentId) {
      res.status(400).json({ message: 'Name, email, password, and departmentId are required.' });
      return;
    }

    // Verify department belongs to this company and is active
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!department || department.companyId !== user.companyId) {
      res.status(404).json({ message: 'Department not found in your company.' });
      return;
    }

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      res.status(409).json({ message: 'A user with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newManager = await prisma.user.create({
      data: {
        companyId: user.companyId,
        departmentId: department.id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'MANAGER',
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
        department: { select: { id: true, name: true } }
      }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'CREATE_MANAGER',
      targetType: 'USER',
      targetId: newManager.id,
      departmentId: department.id,
      metadata: { name: newManager.name, email: newManager.email, departmentName: department.name }
    });

    res.status(201).json({
      message: 'Department Manager created successfully.',
      manager: newManager
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error creating manager', error: err.message });
  }
};

export const updateManager = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const { name, email, employeeId, departmentId, password, isActive } = req.body;

    const manager = await prisma.user.findUnique({
      where: { id }
    });

    if (!manager || manager.companyId !== user.companyId || normalizeRole(manager.role) !== 'MANAGER') {
      res.status(404).json({ message: 'Manager not found.' });
      return;
    }

    let updatedDepartmentId = manager.departmentId;
    if (departmentId && departmentId !== manager.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept || dept.companyId !== user.companyId) {
        res.status(404).json({ message: 'Target department not found.' });
        return;
      }
      updatedDepartmentId = dept.id;
    }

    let passwordHashUpdate: string | undefined = undefined;
    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      passwordHashUpdate = await bcrypt.hash(password.trim(), salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        email: email ? email.toLowerCase().trim() : undefined,
        employeeId: employeeId !== undefined ? (employeeId ? employeeId.trim() : null) : undefined,
        departmentId: updatedDepartmentId,
        passwordHash: passwordHashUpdate,
        isActive: isActive !== undefined ? !!isActive : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        isActive: true
      }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'UPDATE_MANAGER',
      targetType: 'USER',
      targetId: id,
      departmentId: updatedDepartmentId,
      metadata: { changes: { name, email, employeeId, departmentId, isActive } }
    });

    res.json({
      message: 'Manager updated successfully.',
      manager: updated
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error updating manager', error: err.message });
  }
};

export const deleteManager = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const manager = await prisma.user.findUnique({
      where: { id }
    });

    if (!manager || manager.companyId !== user.companyId || normalizeRole(manager.role) !== 'MANAGER') {
      res.status(404).json({ message: 'Manager not found.' });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    await logAuditEvent({
      companyId: user.companyId,
      actorId: user.id,
      action: 'DEACTIVATE_MANAGER',
      targetType: 'USER',
      targetId: id,
      departmentId: manager.departmentId,
      metadata: { managerName: manager.name, managerEmail: manager.email }
    });

    res.json({ message: 'Manager deactivated successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Error deactivating manager', error: err.message });
  }
};
