/**
 * AI Job Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  createAIJobSchema, 
  aiJobIdParamSchema,
  aiJobQuerySchema,
  aiJobTypeSchema
} from './ai-job.schema';

describe('aiJobTypeSchema', () => {
  it('should accept valid job types', () => {
    const types = [
      'inventory_detection',
      'warranty_detection',
      'appliance_identification',
      'receipt_scan',
      'condition_assessment',
    ];
    
    types.forEach(type => {
      const result = aiJobTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid job type', () => {
    const result = aiJobTypeSchema.safeParse('invalid_type');
    expect(result.success).toBe(false);
  });
});

describe('createAIJobSchema', () => {
  it('should validate a minimal AI job', () => {
    const result = createAIJobSchema.safeParse({
      jobType: 'inventory_detection',
      imageIds: ['img-123'],
    });
    
    expect(result.success).toBe(true);
  });

  it('should validate a complete AI job', () => {
    const result = createAIJobSchema.safeParse({
      jobType: 'appliance_identification',
      imageIds: ['img-1', 'img-2', 'img-3'],
      options: {
        autoCreateItems: true,
        confidence_threshold: 0.8,
        targetCategory: 'Kitchen Appliances',
      },
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with empty imageIds array', () => {
    const result = createAIJobSchema.safeParse({
      jobType: 'inventory_detection',
      imageIds: [],
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with missing jobType', () => {
    const result = createAIJobSchema.safeParse({
      imageIds: ['img-123'],
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with invalid jobType', () => {
    const result = createAIJobSchema.safeParse({
      jobType: 'invalid_type',
      imageIds: ['img-123'],
    });
    
    expect(result.success).toBe(false);
  });

  it('should accept confidence threshold between 0 and 1', () => {
    const result = createAIJobSchema.safeParse({
      jobType: 'inventory_detection',
      imageIds: ['img-123'],
      options: {
        confidence_threshold: 0.75,
      },
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with confidence threshold above 1', () => {
    const result = createAIJobSchema.safeParse({
      jobType: 'inventory_detection',
      imageIds: ['img-123'],
      options: {
        confidence_threshold: 1.5,
      },
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with confidence threshold below 0', () => {
    const result = createAIJobSchema.safeParse({
      jobType: 'inventory_detection',
      imageIds: ['img-123'],
      options: {
        confidence_threshold: -0.1,
      },
    });
    
    expect(result.success).toBe(false);
  });
});

describe('aiJobIdParamSchema', () => {
  it('should validate valid ID', () => {
    const result = aiJobIdParamSchema.safeParse({ id: 'job-123' });
    expect(result.success).toBe(true);
  });

  it('should fail with empty ID', () => {
    const result = aiJobIdParamSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});

describe('aiJobQuerySchema', () => {
  it('should validate empty query', () => {
    const result = aiJobQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate status filter', () => {
    const statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    
    statuses.forEach(status => {
      const result = aiJobQuerySchema.safeParse({ status });
      expect(result.success).toBe(true);
    });
  });

  it('should validate jobType filter', () => {
    const result = aiJobQuerySchema.safeParse({
      jobType: 'inventory_detection',
    });
    expect(result.success).toBe(true);
  });

  it('should transform limit to number', () => {
    const result = aiJobQuerySchema.safeParse({ limit: '10' });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('should fail with invalid status', () => {
    const result = aiJobQuerySchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });
});
