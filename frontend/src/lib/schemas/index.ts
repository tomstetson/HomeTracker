/**
 * Zod Validation Schemas for HomeTracker
 * 
 * Provides runtime validation for all data types to ensure data integrity.
 * Used for form validation, API responses, and storage validation.
 */

import { z } from 'zod';

// ============================================
// Property Settings Schema
// ============================================

export const PropertySettingsSchema = z.object({
  address: z.string().max(200).optional().default(''),
  city: z.string().max(100).optional().default(''),
  state: z.string().max(50).optional().default(''),
  zipCode: z.string().max(20).optional().default(''),
  propertyType: z.string().max(50).optional().default('Single Family Home'),
  yearBuilt: z.string().max(4).optional().default(''),
  squareFootage: z.string().max(10).optional().default(''),
  lotSize: z.string().max(20).optional().default(''),
  bedrooms: z.string().max(5).optional().default(''),
  bathrooms: z.string().max(5).optional().default(''),
  purchaseDate: z.string().optional().default(''),
  purchasePrice: z.string().optional().default(''),
  notes: z.string().max(2000).optional().default(''),
  ownerName: z.string().max(100).optional().default(''),
  ownerEmail: z.string().email().optional().or(z.literal('')).default(''),
  ownerPhone: z.string().max(20).optional().default(''),
});

export type PropertySettings = z.infer<typeof PropertySettingsSchema>;

// ============================================
// Inventory Item Schema
// ============================================

export const InventoryItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(200),
  category: z.string().min(1, 'Category is required'),
  location: z.string().optional().default(''),
  purchaseDate: z.string().optional().default(''),
  purchasePrice: z.number().nonnegative().optional(),
  currentValue: z.number().nonnegative().optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  serialNumber: z.string().max(100).optional().default(''),
  modelNumber: z.string().max(100).optional().default(''),
  manufacturer: z.string().max(100).optional().default(''),
  notes: z.string().max(2000).optional().default(''),
  warrantyExpiration: z.string().optional().default(''),
  photoUrl: z.string().url().optional().or(z.literal('')).default(''),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

// ============================================
// Project Schema
// ============================================

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(2000).optional().default(''),
  status: z.enum(['planning', 'in-progress', 'on-hold', 'completed', 'cancelled']).default('planning'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  startDate: z.string().optional().default(''),
  dueDate: z.string().optional().default(''),
  completedDate: z.string().optional().default(''),
  budget: z.number().nonnegative().optional(),
  actualCost: z.number().nonnegative().optional(),
  category: z.string().optional().default(''),
  assignedVendor: z.string().optional().default(''),
  notes: z.string().max(2000).optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// ============================================
// Vendor Schema
// ============================================

export const VendorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Vendor name is required').max(200),
  category: z.string().optional().default(''),
  phone: z.string().max(20).optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  website: z.string().url().optional().or(z.literal('')).default(''),
  address: z.string().max(500).optional().default(''),
  notes: z.string().max(2000).optional().default(''),
  rating: z.number().min(1).max(5).optional(),
  isPreferred: z.boolean().optional().default(false),
  lastUsed: z.string().optional().default(''),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Vendor = z.infer<typeof VendorSchema>;

// ============================================
// Maintenance Task Schema
// ============================================

export const MaintenanceTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(2000).optional().default(''),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual', 'as-needed']).default('monthly'),
  lastCompleted: z.string().optional().default(''),
  nextDue: z.string().optional().default(''),
  category: z.string().optional().default(''),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  estimatedTime: z.string().optional().default(''),
  estimatedCost: z.number().nonnegative().optional(),
  assignedTo: z.string().optional().default(''),
  notes: z.string().max(2000).optional().default(''),
  isRecurring: z.boolean().optional().default(true),
  completionHistory: z.array(z.object({
    date: z.string(),
    notes: z.string().optional(),
    cost: z.number().optional(),
  })).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type MaintenanceTask = z.infer<typeof MaintenanceTaskSchema>;

// ============================================
// Diagram Schema
// ============================================

export const DiagramSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Diagram name is required').max(200),
  type: z.enum(['tldraw', 'mermaid']).default('tldraw'),
  category: z.string().optional().default(''),
  description: z.string().max(1000).optional().default(''),
  data: z.any().optional().nullable(), // tldraw data is complex, validated separately
  mermaidCode: z.string().optional().default(''),
  thumbnail: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Diagram = z.infer<typeof DiagramSchema>;

// ============================================
// Transaction Schema (Budget)
// ============================================

export const TransactionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(500).optional().default(''),
  date: z.string().min(1, 'Date is required'),
  vendor: z.string().optional().default(''),
  projectId: z.string().optional().default(''),
  isRecurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(['weekly', 'monthly', 'quarterly', 'annual']).optional(),
  tags: z.array(z.string()).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// ============================================
// Budget Schema
// ============================================

export const BudgetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Budget name is required').max(100),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  period: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
  startDate: z.string().optional().default(''),
  notes: z.string().max(500).optional().default(''),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Budget = z.infer<typeof BudgetSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * Safely parse data with a schema, returning null on failure
 */
export function safeParse<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('Validation failed:', result.error.issues);
  return null;
}

/**
 * Validate and return errors as a map of field names to error messages
 */
export function validateWithErrors<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }
  
  return { success: false, errors };
}

/**
 * Get first error message for a field
 */
export function getFieldError(
  errors: Record<string, string> | undefined,
  field: string
): string | undefined {
  return errors?.[field];
}
