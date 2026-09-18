import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const departmentIdParamSchema = z.object({
  id: z.string().uuid('Invalid department ID format'),
});
