/**
 * Vendor Validation Schemas
 */

import { z } from 'zod';

const vendorFields = {
  name: z.string().min(1, 'Name is required').max(200),
  category: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  contactPerson: z.string().max(200).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isPreferred: z.boolean().optional(),
  licenseNumber: z.string().max(100).optional(),
  insuranceInfo: z.string().max(500).optional(),
};

export const createVendorSchema = z.object({ ...vendorFields });
export const updateVendorSchema = z.object({ ...vendorFields }).partial();

export const vendorIdParamSchema = z.object({
  id: z.string().min(1, 'Vendor ID is required'),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
