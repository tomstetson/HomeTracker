import { z } from 'zod';

// Common validation patterns
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[\d\s\-\+\(\)]+$/;
const urlPattern = /^https?:\/\/.+/;

// Item validation schema
export const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(100, 'Name too long'),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().max(50, 'Brand name too long').optional(),
  modelNumber: z.string().max(50, 'Model number too long').optional(),
  serialNumber: z.string().max(50, 'Serial number too long').optional(),
  location: z.string().min(1, 'Location is required').max(100, 'Location too long'),
  purchaseDate: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, 'Price cannot be negative').optional(),
  currentValue: z.coerce.number().min(0, 'Value cannot be negative').optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
  warrantyExpiration: z.string().optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

// Vendor validation schema
export const vendorSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(100, 'Name too long'),
  contactPerson: z.string().max(100, 'Contact person name too long').optional(),
  phone: z.string().min(1, 'Phone number is required').regex(phonePattern, 'Invalid phone number'),
  email: z.string().regex(emailPattern, 'Invalid email address').optional().or(z.literal('')),
  website: z.string().regex(urlPattern, 'Invalid URL (must start with http:// or https://)').optional().or(z.literal('')),
  address: z.string().max(200, 'Address too long').optional(),
  rating: z.coerce.number().min(0, 'Rating must be 0 or higher').max(5, 'Rating cannot exceed 5'),
  totalJobs: z.coerce.number().min(0, 'Total jobs cannot be negative'),
  notes: z.string().max(500, 'Notes too long').optional(),
  isPreferred: z.boolean(),
});

// Project validation schema
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  status: z.enum(['backlog', 'planning', 'in-progress', 'on-hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  budget: z.coerce.number().min(0, 'Budget cannot be negative').optional(),
  actualCost: z.coerce.number().min(0, 'Cost cannot be negative').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  progress: z.coerce.number().min(0, 'Progress cannot be negative').max(100, 'Progress cannot exceed 100'),
  category: z.string().min(1, 'Category is required'),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
).refine(
  (data) => {
    if (data.budget && data.actualCost) {
      return data.actualCost <= data.budget * 2; // Allow up to 200% over budget
    }
    return true;
  },
  {
    message: 'Actual cost seems unusually high compared to budget',
    path: ['actualCost'],
  }
);

// Maintenance task validation schema
export const maintenanceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'in-progress', 'completed', 'overdue']),
  dueDate: z.string().min(1, 'Due date is required'),
  recurrence: z.enum(['none', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  assignedTo: z.string().max(100, 'Assigned to name too long').optional(),
  relatedItem: z.string().optional(),
  estimatedCost: z.coerce.number().min(0, 'Cost cannot be negative').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

// Warranty validation schema
export const warrantySchema = z.object({
  itemName: z.string().min(1, 'Item name is required').max(100, 'Name too long'),
  provider: z.string().min(1, 'Provider is required').max(100, 'Provider name too long'),
  type: z.enum(['manufacturer', 'extended', 'home_warranty']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  coverageDetails: z.string().max(500, 'Coverage details too long').optional(),
  policyNumber: z.string().max(50, 'Policy number too long').optional(),
  cost: z.coerce.number().min(0, 'Cost cannot be negative').optional(),
  claimContact: z.string().max(100, 'Contact name too long').optional(),
  claimPhone: z.string().regex(phonePattern, 'Invalid phone number').optional().or(z.literal('')),
  claimEmail: z.string().regex(emailPattern, 'Invalid email address').optional().or(z.literal('')),
  notes: z.string().max(500, 'Notes too long').optional(),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

// Document validation schema
export const documentSchema = z.object({
  name: z.string().min(1, 'Document name is required').max(200, 'Name too long'),
  category: z.enum(['manual', 'receipt', 'invoice', 'warranty', 'photo', 'other']),
  relatedType: z.enum(['item', 'project', 'vendor', 'maintenance']).optional(),
  relatedTo: z.string().max(50, 'Related ID too long').optional(),
  fileType: z.string().min(1, 'File type is required').max(20, 'File type too long'),
  fileSize: z.coerce.number().min(0, 'File size cannot be negative').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  tags: z.string().max(200, 'Tags too long').optional(),
  url: z.string().regex(urlPattern, 'Invalid URL (must start with http:// or https://)').optional().or(z.literal('')),
  notes: z.string().max(500, 'Notes too long').optional(),
});

// Helper function to validate and return errors
export function validateForm<T>(schema: z.ZodSchema<T>, data: any): { 
  success: boolean; 
  data?: T; 
  errors?: Record<string, string>;
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((err: z.ZodIssue) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _general: 'Validation failed' } };
  }
}

// Helper to get field error
export function getFieldError(errors: Record<string, string> | undefined, fieldName: string): string | undefined {
  return errors?.[fieldName];
}

// Type exports
export type ItemFormData = z.infer<typeof itemSchema>;
export type VendorFormData = z.infer<typeof vendorSchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;
export type MaintenanceFormData = z.infer<typeof maintenanceSchema>;
export type WarrantyFormData = z.infer<typeof warrantySchema>;
export type DocumentFormData = z.infer<typeof documentSchema>;


