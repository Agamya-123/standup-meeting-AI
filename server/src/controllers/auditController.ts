import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { normalizeRole } from '../middleware/authorization.js';

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);

    if (role !== 'ADMIN') {
      res.status(403).json({ message: 'Access denied. Audit logs are only accessible by Administrators.' });
      return;
    }

    const { departmentId, targetType, limit = '100' } = req.query;

    let whereClause: any = {
      companyId: user.companyId
    };

    if (departmentId) {
      whereClause.departmentId = departmentId as string;
    }

    if (targetType) {
      whereClause.targetType = targetType as string;
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true, avatar: true, employeeId: true } },
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(parseInt(limit as string, 10) || 100, 500)
    });

    const parsedLogs = logs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));

    res.json({ logs: parsedLogs });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving audit logs', error: err.message });
  }
};
