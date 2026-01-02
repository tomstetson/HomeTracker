/**
 * Warranty Validation Schemas
 */

import { z } from 'zod';

const warrantyFields = {
  itemId: z.string().optional(),
  itemName: z.string().min(1, 'Item name is required').max(200),
  provider: z.string().min(1, 'Provider is required').max(200),
  type: z.enum(['manufacturer', 'extended', 'service_plan', 'insurance', 'other']).default('manufacturer'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  cost: z.number().min(0).optional(),
  coverageDetails: z.string().max(5000).optional(),
  claimPhone: z.string().max(50).optional(),
  claimEmail: z.string().email().optional().or(z.literal('')),
  claimUrl: z.string().url().optional().or(z.literal('')),
  policyNumber: z.string().max(100).optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().max(5000).optional(),
};

export const createWarrantySchema = z.object({ ...warrantyFields });
export const updateWarrantySchema = z.object({ ...warrantyFields }).partial();

export const warrantyIdParamSchema = z.object({
  id: z.string().min(1, 'Warranty ID is required'),
});

export type CreateWarrantyInput = z.infer<typeof createWarrantySchema>;
export type UpdateWarrantyInput = z.infer<typeof updateWarrantySchema>;
