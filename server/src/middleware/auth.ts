import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
  companyId: string;
  departmentId?: string | null;
  teamId?: string | null;
  employeeId?: string | null;
  avatar?: string | null;
  isActive?: boolean;
  company?: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
  };
  department?: {
    id: string;
    name: string;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  targetDepartment?: any;
  targetTeam?: any;
  targetUser?: any;
}

export const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required. Token missing.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      name: string;
      companyId: string;
      departmentId?: string | null;
      teamId?: string | null;
    };

    // Verify user exists in database, is active, and fetch hierarchy info
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        departmentId: true,
        teamId: true,
        employeeId: true,
        avatar: true,
        isActive: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      res.status(401).json({ message: 'User account no longer exists.' });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({ message: 'Account has been deactivated. Please contact your company administrator.' });
      return;
    }

    req.user = user as AuthUser;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired authentication token.' });
    return;
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const normalizedUserRole = req.user.role === 'MEMBER' ? 'TEAM_MEMBER' : req.user.role.toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => (r === 'MEMBER' ? 'TEAM_MEMBER' : r.toUpperCase()));

    if (!normalizedAllowed.includes(normalizedUserRole)) {
      res.status(403).json({
        message: `Access denied. Requires one of: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};
