import { z } from 'zod';

export const getTeamsQuerySchema = z.object({
  departmentId: z.string().uuid('Invalid department ID format').optional(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, 'Team name must be at least 2 characters').max(100),
  departmentId: z.string().uuid('Invalid department ID format').optional(),
  description: z.string().trim().max(500).optional(),
  managerId: z.string().uuid('Invalid manager ID format').nullable().optional(),
  teamLeadId: z.string().uuid('Invalid team lead ID format').nullable().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  departmentId: z.string().uuid('Invalid department ID format').optional(),
  managerId: z.string().uuid('Invalid manager ID format').nullable().optional(),
  teamLeadId: z.string().uuid('Invalid team lead ID format').nullable().optional(),
  isActive: z.boolean().optional(),
});

export const teamIdParamSchema = z.object({
  teamId: z.string().uuid('Invalid team ID format'),
});

export const teamMemberParamsSchema = z.object({
  teamId: z.string().uuid('Invalid team ID format'),
  userId: z.string().uuid('Invalid user ID format'),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

export const requestAccessSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  durationHours: z.coerce.number().int().min(1).max(720).optional(),
});

export const requestIdParamSchema = z.object({
  requestId: z.string().uuid('Invalid request ID format'),
});

export const approveAccessSchema = z.object({
  durationHours: z.coerce.number().int().min(1).max(720).optional(),
});
