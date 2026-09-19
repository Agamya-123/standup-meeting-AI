import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { normalizeRole } from '../middleware/authorization.js';
import { logAuditEvent } from '../services/auditService.js';
import { env } from '../config/env.js';

const JWT_SECRET = env.JWT_SECRET;

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

/**
 * 1. Register a new Company Workspace + Admin Account + Default Department & Team
 */
export const registerCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { companyName, companySlug, adminName, adminEmail, adminEmployeeId, password, domain } = req.body;

    if (!companyName || !adminName || !adminEmail || !password) {
      res.status(400).json({ message: 'Company name, admin name, admin email, and password are required.' });
      return;
    }

    const cleanEmail = adminEmail.toLowerCase().trim();

    // Check if user email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      res.status(400).json({ message: 'A user with this email address already exists.' });
      return;
    }

    // Generate or validate company slug
    let slug = (companySlug || generateSlug(companyName)).toLowerCase().trim();
    const existingCompany = await prisma.company.findUnique({ where: { slug } });
    if (existingCompany) {
      slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create Company in database
    const company = await prisma.company.create({
      data: {
        name: companyName.trim(),
        slug,
        domain: domain ? domain.trim() : undefined,
        logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(companyName)}`
      }
    });

    // Create default Department
    const defaultDept = await prisma.department.create({
      data: {
        companyId: company.id,
        name: 'Engineering',
        description: 'Core product engineering, infrastructure, and technical design.',
        isActive: true
      }
    });

    // Determine Admin Employee ID
    const prefix = (slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'EMP').toUpperCase();
    const assignedAdminEmployeeId = adminEmployeeId?.trim() || `${prefix}-001`;

    // Create Admin User for the company
    const adminUser = await prisma.user.create({
      data: {
        companyId: company.id,
        departmentId: defaultDept.id,
        employeeId: assignedAdminEmployeeId,
        name: adminName.trim(),
        email: cleanEmail,
        passwordHash,
        role: 'ADMIN',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(adminName)}`,
        isActive: true
      }
    });

    // Create initial engineering team linked to the default department
    const defaultTeam = await prisma.team.create({
      data: {
        companyId: company.id,
        departmentId: defaultDept.id,
        name: 'Core Platform',
        department: defaultDept.name,
        description: `Primary product & platform team for ${company.name}.`,
        managerId: adminUser.id,
        isActive: true
      }
    });

    // Keep the user's primary-team field and membership in sync with the
    // initial team. The authenticated user's live database record controls
    // role-scoped visibility after a role change.
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { teamId: defaultTeam.id }
    });
    await prisma.teamMember.create({
      data: {
        teamId: defaultTeam.id,
        userId: adminUser.id
      }
    });

    await logAuditEvent({
      companyId: company.id,
      actorId: adminUser.id,
      action: 'REGISTER_COMPANY',
      targetType: 'DEPARTMENT',
      targetId: defaultDept.id,
      departmentId: defaultDept.id,
      metadata: { companyName: company.name, adminEmail: adminUser.email }
    });

    const token = jwt.sign(
      {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        companyId: company.id,
        departmentId: defaultDept.id,
        teamId: defaultTeam.id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Company workspace and hierarchy created successfully!',
      token,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        employeeId: adminUser.employeeId,
        role: adminUser.role,
        avatar: adminUser.avatar,
        departmentId: defaultDept.id,
        teamId: defaultTeam.id,
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logo: company.logo,
          domain: company.domain
        },
        department: {
          id: defaultDept.id,
          name: defaultDept.name
        },
        team: {
          id: defaultTeam.id,
          name: defaultTeam.name
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error registering company workspace.', error: error.message });
  }
};

/**
 * 2. Smart Auto-Detection Lookup by Email OR Employee ID
 */
export const lookupIdentifier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { identifier } = req.body;

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      res.status(400).json({ message: 'Email address or Employee ID is required.' });
      return;
    }

    const cleanInput = identifier.trim();

    // Query users by email (case-insensitive) OR employeeId (exact match)
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { email: cleanInput.toLowerCase() },
          { employeeId: cleanInput }
        ]
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            domain: true
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

    if (!users || users.length === 0) {
      res.status(404).json({
        found: false,
        message: 'No active account detected for this Email or Employee ID. Please verify your details or contact your admin.'
      });
      return;
    }

    // Single match found
    if (users.length === 1) {
      const user = users[0];
      res.json({
        found: true,
        multiple: false,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
          avatar: user.avatar,
          role: normalizeRole(user.role),
          department: user.department,
          team: user.team
        },
        company: user.company
      });
      return;
    }

    // Multiple matches across different companies sharing same ID
    res.json({
      found: true,
      multiple: true,
      matches: users.map((u) => ({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          employeeId: u.employeeId,
          avatar: u.avatar,
          role: normalizeRole(u.role),
          department: u.department,
          team: u.team
        },
        company: u.company
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error looking up identifier.', error: error.message });
  }
};

/**
 * 3. Secure Login via Identifier + Password
 */
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { identifier, email, password, companyId } = req.body;

    const searchInput = (identifier || email || '').trim();

    if (!searchInput || !password) {
      res.status(400).json({ message: 'Email/Employee ID and password are required.' });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        isActive: true,
        OR: [
          { email: searchInput.toLowerCase() },
          { employeeId: searchInput }
        ]
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            domain: true
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

    if (!users || users.length === 0) {
      res.status(401).json({ message: 'Invalid credentials or inactive account.' });
      return;
    }

    let targetUser = users[0];
    if (users.length > 1 && !companyId) {
      let matchedUsers = [];
      for (const candidate of users) {
        const isMatch = await bcrypt.compare(password, candidate.passwordHash);
        if (isMatch) {
          matchedUsers.push(candidate);
        }
      }
      if (matchedUsers.length === 1) {
        targetUser = matchedUsers[0];
      } else if (matchedUsers.length > 1) {
        res.status(400).json({
          message: 'Multiple workspaces found with this ID. Please select your organization workspace to sign in.'
        });
        return;
      } else {
        res.status(401).json({ message: 'Invalid password. Please check your credentials.' });
        return;
      }
    } else {
      const isMatch = await bcrypt.compare(password, targetUser.passwordHash);
      if (!isMatch) {
        res.status(401).json({ message: 'Invalid password. Please check your credentials.' });
        return;
      }
    }

    const role = normalizeRole(targetUser.role);

    const token = jwt.sign(
      {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role,
        companyId: targetUser.companyId,
        departmentId: targetUser.departmentId,
        teamId: targetUser.teamId
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        employeeId: targetUser.employeeId,
        role,
        avatar: targetUser.avatar,
        departmentId: targetUser.departmentId,
        teamId: targetUser.teamId,
        department: targetUser.department,
        team: targetUser.team,
        company: targetUser.company
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error logging in.', error: error.message });
  }
};

/**
 * 4. Add Employee with 4-tier Role & Department Scoping
 */
export const addEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const callerRole = normalizeRole(caller.role);
    const companyId = caller.companyId;

    const { name, email, employeeId, password, role, departmentId, teamId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      res.status(400).json({ message: 'A user with this email address already exists.' });
      return;
    }

    const targetRole = normalizeRole(role || 'TEAM_MEMBER');

    // Privilege hierarchy enforcement:
    // ADMIN can create ADMIN, MANAGER, TEAM_LEAD, TEAM_MEMBER
    // MANAGER can create TEAM_LEAD, TEAM_MEMBER (in their own department only)
    // TEAM_LEAD can create TEAM_MEMBER (in their own team only)
    // TEAM_MEMBER cannot create anyone
    if (callerRole === 'MANAGER') {
      if (targetRole === 'ADMIN' || targetRole === 'MANAGER') {
        res.status(403).json({ message: 'Access denied: Managers cannot create Administrators or other Managers.' });
        return;
      }
      if (departmentId && departmentId !== caller.departmentId) {
        res.status(403).json({ message: 'Access denied: Managers can only add personnel to their own department.' });
        return;
      }
    } else if (callerRole === 'TEAM_LEAD') {
      if (targetRole !== 'TEAM_MEMBER') {
        res.status(403).json({ message: 'Access denied: Team Leads can only add Team Members.' });
        return;
      }
      if (teamId && teamId !== caller.teamId) {
        res.status(403).json({ message: 'Access denied: Team Leads can only add members to their own team.' });
        return;
      }
    } else if (callerRole !== 'ADMIN') {
      res.status(403).json({ message: 'Access denied: Insufficient privileges to create employees.' });
      return;
    }

    let finalDepartmentId = departmentId || (callerRole === 'MANAGER' || callerRole === 'TEAM_LEAD' ? caller.departmentId : null);
    let finalTeamId = teamId || (callerRole === 'TEAM_LEAD' ? caller.teamId : null);

    // If departmentId provided, verify it belongs to company
    if (finalDepartmentId) {
      const dept = await prisma.department.findUnique({ where: { id: finalDepartmentId } });
      if (!dept || dept.companyId !== companyId) {
        res.status(404).json({ message: 'Department not found in your company.' });
        return;
      }
    }

    // If teamId provided, verify it belongs to department / company
    if (finalTeamId) {
      const t = await prisma.team.findUnique({ where: { id: finalTeamId } });
      if (!t || t.companyId !== companyId) {
        res.status(404).json({ message: 'Team not found in your company.' });
        return;
      }
      if (finalDepartmentId && t.departmentId !== finalDepartmentId) {
        res.status(400).json({ message: 'Specified team does not belong to the selected department.' });
        return;
      }
      if (!finalDepartmentId && t.departmentId) {
        finalDepartmentId = t.departmentId;
      }
    }

    // Determine or generate Employee ID
    let assignedEmployeeId = employeeId ? employeeId.trim() : null;
    if (!assignedEmployeeId) {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      const prefix = (company?.slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'EMP').toUpperCase();
      const count = await prisma.user.count({ where: { companyId } });
      assignedEmployeeId = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newEmployee = await prisma.user.create({
      data: {
        companyId,
        departmentId: finalDepartmentId,
        teamId: finalTeamId,
        employeeId: assignedEmployeeId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: targetRole,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
        isActive: true
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } }
      }
    });

    if (finalTeamId) {
      await prisma.teamMember.create({
        data: {
          teamId: finalTeamId,
          userId: newEmployee.id
        }
      }).catch(() => {});
    }

    await logAuditEvent({
      companyId,
      actorId: caller.id,
      action: `CREATE_${targetRole}`,
      targetType: 'USER',
      targetId: newEmployee.id,
      departmentId: finalDepartmentId,
      teamId: finalTeamId,
      metadata: { name: newEmployee.name, email: newEmployee.email, role: targetRole }
    });

    res.status(201).json({
      message: `Employee ${newEmployee.name} added successfully with ID ${newEmployee.employeeId}!`,
      employee: {
        id: newEmployee.id,
        name: newEmployee.name,
        email: newEmployee.email,
        employeeId: newEmployee.employeeId,
        role: targetRole,
        avatar: newEmployee.avatar,
        department: newEmployee.department,
        team: newEmployee.team,
        company: newEmployee.company
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error adding employee.', error: error.message });
  }
};

/**
 * 5. Get Company Employees (Scoped by Role & Department)
 */
export const getCompanyEmployees = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const callerRole = normalizeRole(caller.role);
    const companyId = caller.companyId;

    let whereClause: any = {
      companyId,
      isActive: true
    };

    if (callerRole === 'MANAGER') {
      if (!caller.departmentId) {
        res.json({ employees: [] });
        return;
      }
      whereClause.departmentId = caller.departmentId;
    } else if (callerRole === 'TEAM_LEAD' || callerRole === 'TEAM_MEMBER') {
      const memberships = await prisma.teamMember.findMany({
        where: { userId: caller.id },
        select: { teamId: true }
      });
      const accessibleTeamIds = [...new Set([
        ...(caller.teamId ? [caller.teamId] : []),
        ...memberships.map((membership) => membership.teamId)
      ])];

      if (accessibleTeamIds.length === 0) {
        res.json({ employees: [] });
        return;
      }

      whereClause.OR = [
        { teamId: { in: accessibleTeamIds } },
        { memberships: { some: { teamId: { in: accessibleTeamIds } } } }
      ];
    }

    const employees = await prisma.user.findMany({
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
        team: { select: { id: true, name: true } },
        memberships: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      employees: employees.map((e) => ({
        ...e,
        role: normalizeRole(e.role)
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching company employees.', error: error.message });
  }
};

/**
 * 6. Get Current User Profile (with full Department, Team & Company info)
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        avatar: true,
        departmentId: true,
        teamId: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            domain: true
          }
        },
        department: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        memberships: {
          include: {
            team: {
              select: { id: true, name: true, description: true }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      user: {
        ...user,
        role: normalizeRole(user.role)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching profile.', error: error.message });
  }
};

/**
 * 7. Update Employee Department, Team, and Role
 */
export const updateEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const callerRole = normalizeRole(caller.role);
    const companyId = caller.companyId;
    const targetUserId = req.params.id as string;

    const { departmentId, teamId, role, name } = req.body;

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, companyId },
      include: {
        department: true,
        team: true
      }
    });

    if (!targetUser) {
      res.status(404).json({ message: 'User not found in your company.' });
      return;
    }

    const targetCurrentRole = normalizeRole(targetUser.role);

    // Hierarchy permission checks:
    if (callerRole === 'MANAGER') {
      // Managers cannot modify Admins or other Managers
      if (targetCurrentRole === 'ADMIN' || (targetCurrentRole === 'MANAGER' && targetUser.id !== caller.id)) {
        res.status(403).json({ message: 'Access denied: Managers cannot modify Admins or other Managers.' });
        return;
      }
      // If target user is in a different department and caller is manager
      if (targetUser.departmentId && targetUser.departmentId !== caller.departmentId) {
        res.status(403).json({ message: 'Access denied: You can only manage personnel in your own department.' });
        return;
      }
      // If role is being changed, managers cannot promote to ADMIN or MANAGER
      if (role) {
        const normTargetRole = normalizeRole(role);
        if (normTargetRole === 'ADMIN' || normTargetRole === 'MANAGER') {
          res.status(403).json({ message: 'Access denied: Managers cannot promote members to Admin or Manager.' });
          return;
        }
      }
      // Managers cannot move members to another department
      if (departmentId !== undefined && departmentId !== caller.departmentId) {
        res.status(403).json({ message: 'Access denied: You can only assign members within your own department.' });
        return;
      }
    } else if (callerRole !== 'ADMIN') {
      res.status(403).json({ message: 'Access denied: Insufficient permissions to update employee assignment.' });
      return;
    }

    let finalDepartmentId: string | null = targetUser.departmentId;
    if (departmentId !== undefined) {
      if (departmentId === '' || departmentId === null) {
        finalDepartmentId = null;
      } else {
        const dept = await prisma.department.findFirst({
          where: { id: departmentId, companyId }
        });
        if (!dept) {
          res.status(404).json({ message: 'Department not found in your company.' });
          return;
        }
        finalDepartmentId = dept.id;
      }
    }

    let finalTeamId: string | null = targetUser.teamId;
    if (departmentId !== undefined && finalDepartmentId !== targetUser.departmentId && teamId === undefined) {
      finalTeamId = null;
    }
    if (teamId !== undefined) {
      if (teamId === '' || teamId === null) {
        finalTeamId = null;
      } else {
        const t = await prisma.team.findFirst({
          where: { id: teamId, companyId }
        });
        if (!t) {
          res.status(404).json({ message: 'Team not found in your company.' });
          return;
        }
        if (finalDepartmentId && t.departmentId && t.departmentId !== finalDepartmentId) {
          res.status(400).json({ message: 'Selected team does not belong to the chosen department.' });
          return;
        }
        finalTeamId = t.id;
        if (!finalDepartmentId && t.departmentId) {
          finalDepartmentId = t.departmentId;
        }
      }
    }

    let finalRole = targetUser.role;
    if (role) {
      finalRole = normalizeRole(role);
    }

    const roleChanged = finalRole !== targetUser.role;
    const teamChanged = finalTeamId !== targetUser.teamId;

    // Keep the primary assignment and TeamMember relation atomic. A user who
    // has been assigned to a team must never retain an orphaned membership or
    // a null direct team reference after a role transition.
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: {
          ...(name ? { name: name.trim() } : {}),
          role: finalRole,
          departmentId: finalDepartmentId,
          teamId: finalTeamId
        },
        include: {
          department: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } }
        }
      });

      if (teamChanged) {
        if (targetUser.teamId) {
          await tx.teamMember.deleteMany({
            where: { teamId: targetUser.teamId, userId: targetUserId }
          });
        }
        if (finalTeamId) {
          await tx.teamMember.upsert({
            where: { teamId_userId: { teamId: finalTeamId, userId: targetUserId } },
            update: {},
            create: { teamId: finalTeamId, userId: targetUserId }
          });
        }
      } else if (finalTeamId && (roleChanged || teamId !== undefined)) {
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId: finalTeamId, userId: targetUserId } },
          update: {},
          create: { teamId: finalTeamId, userId: targetUserId }
        });
      }

      // A designated lead must also be represented by the team relation used
      // by team listings and access checks. Clear the former lead only when
      // this user is explicitly moved away from that team or demoted.
      if (teamChanged || finalRole !== 'TEAM_LEAD') {
        await tx.team.updateMany({
          where: { teamLeadId: targetUserId },
          data: { teamLeadId: null }
        });
      }
      // Do not reassign a team's designated lead on unrelated edits (for
      // example, changing only the user's name). Lead ownership changes only
      // when the role or team assignment changes.
      if (finalRole === 'TEAM_LEAD' && finalTeamId && (roleChanged || teamChanged)) {
        await tx.team.update({
          where: { id: finalTeamId },
          data: { teamLeadId: targetUserId }
        });
      }

      return updated;
    });

    await logAuditEvent({
      companyId,
      actorId: caller.id,
      action: 'UPDATE_USER_ASSIGNMENT',
      targetType: 'USER',
      targetId: targetUserId,
      departmentId: finalDepartmentId,
      teamId: finalTeamId,
      metadata: {
        userName: updatedUser.name,
        role: finalRole,
        departmentId: finalDepartmentId,
        teamId: finalTeamId
      }
    });

    res.json({
      message: `Employee updated successfully.`,
      employee: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        employeeId: updatedUser.employeeId,
        role: normalizeRole(updatedUser.role),
        avatar: updatedUser.avatar,
        departmentId: updatedUser.departmentId,
        teamId: updatedUser.teamId,
        department: updatedUser.department,
        team: updatedUser.team
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating employee.', error: error.message });
  }
};
