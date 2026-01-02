/**
 * Item Validation Schemas
 */

import { z } from 'zod';

/**
 * Base item fields
 */
const itemFields = {
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  category: z.string().min(1, 'Category is required').max(100),
  subcategory: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  room: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serialNumber: z.string().max(100).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  condition: z.enum(['new', 'excellent', 'good', 'fair', 'poor']).optional(),
  quantity: z.number().int().min(1).default(1),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  // Warranty info
  warrantyEndDate: z.string().optional(),
  warrantyProvider: z.string().max(200).optional(),
  // Consumable info
  isConsumable: z.boolean().optional(),
  consumableRefillUrl: z.string().url().optional().or(z.literal('')),
  // For sale tracking
  forSale: z.boolean().optional(),
  askingPrice: z.number().min(0).optional(),
  listedDate: z.string().optional(),
  soldDate: z.string().optional(),
  soldPrice: z.number().min(0).optional(),
};

/**
 * Schema for creating a new item
 */
export const createItemSchema = z.object({
  ...itemFields,
});

/**
 * Schema for updating an item (all fields optional)
 */
export const updateItemSchema = z.object({
  ...itemFields,
}).partial();

/**
 * Schema for item ID parameter
 */
export const itemIdParamSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
});

/**
 * Schema for item query parameters
 */
export const itemQuerySchema = z.object({
  category: z.string().optional(),
  location: z.string().optional(),
  room: z.string().optional(),
  forSale: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
