import { z } from 'zod';

export const registerCompanySchema = z.object({
  companyName: z.string().trim().min(2, 'Company name must be at least 2 characters').max(100),
  companySlug: z.string().trim().min(2).max(100).optional(),
  adminName: z.string().trim().min(2, 'Admin name must be at least 2 characters').max(100),
  adminEmail: z.string().trim().email('Invalid email address').max(255),
  adminEmployeeId: z.string().trim().max(50).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  domain: z.string().trim().max(255).optional(),
});

export const lookupIdentifierSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or Employee ID is required').max(255),
});

export const loginSchema = z.object({
  identifier: z.string().trim().max(255).optional(),
  email: z.string().trim().max(255).optional(),
  password: z.string().min(1, 'Password is required').max(128),
  companyId: z.string().uuid('Invalid company ID format').optional(),
}).refine((data) => data.identifier || data.email, {
  message: 'Either identifier or email is required.',
  path: ['identifier'],
});

export const addEmployeeSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  employeeId: z.string().trim().max(50).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(['ADMIN', 'MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER', 'MEMBER']).default('TEAM_MEMBER'),
  departmentId: z.string().uuid('Invalid department ID').nullable().optional(),
  teamId: z.string().uuid('Invalid team ID').nullable().optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(255).optional(),
  employeeId: z.string().trim().max(50).nullable().optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER', 'MEMBER']).optional(),
  departmentId: z.string().uuid('Invalid department ID').nullable().optional(),
  teamId: z.string().uuid('Invalid team ID').nullable().optional(),
  isActive: z.boolean().optional(),
});

export const employeeIdParamSchema = z.object({
  id: z.string().uuid('Invalid employee ID format'),
});
