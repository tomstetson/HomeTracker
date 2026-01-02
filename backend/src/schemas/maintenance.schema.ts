/**
 * Maintenance Task Validation Schemas
 */

import { z } from 'zod';

const maintenanceFields = {
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  itemId: z.string().optional(),
  itemName: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped', 'overdue']).default('pending'),
  dueDate: z.string().optional(),
  completedDate: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('none'),
  recurrenceInterval: z.number().int().min(1).optional(),
  estimatedCost: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  vendorId: z.string().optional(),
  notes: z.string().max(5000).optional(),
  reminderDays: z.number().int().min(0).max(365).optional(),
};

export const createMaintenanceSchema = z.object({ ...maintenanceFields });
export const updateMaintenanceSchema = z.object({ ...maintenanceFields }).partial();

export const maintenanceIdParamSchema = z.object({
  id: z.string().min(1, 'Maintenance ID is required'),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
