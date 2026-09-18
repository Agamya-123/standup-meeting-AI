import { z } from 'zod';

export const submitStandupSchema = z.object({
  yesterdayUpdates: z.union([
    z.string().trim().min(1, 'Yesterday accomplishments are required'),
    z.array(z.string().trim().min(1, 'Update item cannot be empty')).min(1, 'At least one yesterday update is required')
  ]),
  todayPlans: z.union([
    z.string().trim().min(1, 'Today plans are required'),
    z.array(z.string().trim().min(1, 'Plan item cannot be empty')).min(1, 'At least one today plan is required')
  ]),
  blockers: z.union([
    z.string().trim(),
    z.array(z.string().trim())
  ]).optional(),
  blockerLevel: z.enum(['NONE', 'MINOR', 'CRITICAL']).default('NONE').optional(),
  teamId: z.string().uuid('Invalid team ID format').optional(),
});

export const updateStandupSchema = z.object({
  yesterdayUpdates: z.union([
    z.string().trim().min(1),
    z.array(z.string().trim().min(1)).min(1)
  ]).optional(),
  todayPlans: z.union([
    z.string().trim().min(1),
    z.array(z.string().trim().min(1)).min(1)
  ]).optional(),
  blockers: z.union([
    z.string().trim(),
    z.array(z.string().trim())
  ]).optional(),
  blockerLevel: z.enum(['NONE', 'MINOR', 'CRITICAL']).optional(),
});

export const standupIdParamSchema = z.object({
  id: z.string().uuid('Invalid standup ID format'),
});

export const standupIdPathParamSchema = z.object({
  standupId: z.string().uuid('Invalid standup ID format'),
});

export const toggleReactionSchema = z.object({
  emoji: z.string().trim().min(1, 'Emoji is required').max(32, 'Emoji cannot exceed 32 characters'),
});
