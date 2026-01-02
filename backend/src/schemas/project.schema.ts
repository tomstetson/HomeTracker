/**
 * Project Validation Schemas
 */

import { z } from 'zod';

const projectFields = {
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).default('planned'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  completedDate: z.string().optional(),
  budget: z.number().min(0).optional(),
  spent: z.number().min(0).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  room: z.string().max(100).optional(),
  vendorId: z.string().optional(),
};

export const createProjectSchema = z.object({ ...projectFields });
export const updateProjectSchema = z.object({ ...projectFields }).partial();

export const projectIdParamSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
