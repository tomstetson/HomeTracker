/**
 * AI Job Validation Schemas
 */

import { z } from 'zod';

export const aiJobTypeSchema = z.enum([
  'inventory_detection',
  'warranty_detection',
  'appliance_identification',
  'receipt_scan',
  'condition_assessment',
]);

export const createAIJobSchema = z.object({
  jobType: aiJobTypeSchema,
  imageIds: z.array(z.string()).min(1, 'At least one image is required'),
  options: z.object({
    autoCreateItems: z.boolean().optional(),
    confidence_threshold: z.number().min(0).max(1).optional(),
    targetCategory: z.string().max(100).optional(),
  }).optional(),
});

export const aiJobIdParamSchema = z.object({
  id: z.string().min(1, 'Job ID is required'),
});

export const aiJobQuerySchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  jobType: aiJobTypeSchema.optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CreateAIJobInput = z.infer<typeof createAIJobSchema>;
export type AIJobType = z.infer<typeof aiJobTypeSchema>;
