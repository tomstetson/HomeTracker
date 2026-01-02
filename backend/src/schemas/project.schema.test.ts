/**
 * Project Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  createProjectSchema, 
  updateProjectSchema, 
  projectIdParamSchema 
} from './project.schema';

describe('createProjectSchema', () => {
  it('should validate a minimal project', () => {
    const result = createProjectSchema.safeParse({
      name: 'Kitchen Renovation',
    });
    
    expect(result.success).toBe(true);
  });

  it('should validate a complete project', () => {
    const result = createProjectSchema.safeParse({
      name: 'Kitchen Renovation',
      description: 'Complete kitchen remodel including cabinets and appliances',
      category: 'Renovation',
      status: 'in_progress',
      priority: 'high',
      startDate: '2024-01-15',
      dueDate: '2024-06-15',
      budget: 25000,
      spent: 5000,
      notes: 'Phase 1 complete',
      tags: ['kitchen', 'renovation', 'major'],
      room: 'Kitchen',
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with empty name', () => {
    const result = createProjectSchema.safeParse({
      name: '',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with invalid status', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test Project',
      status: 'invalid_status',
    });
    
    expect(result.success).toBe(false);
  });

  it('should accept valid statuses', () => {
    const statuses = ['planned', 'in_progress', 'on_hold', 'completed', 'cancelled'];
    
    statuses.forEach(status => {
      const result = createProjectSchema.safeParse({
        name: 'Test Project',
        status,
      });
      
      expect(result.success).toBe(true);
    });
  });

  it('should accept valid priorities', () => {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    
    priorities.forEach(priority => {
      const result = createProjectSchema.safeParse({
        name: 'Test Project',
        priority,
      });
      
      expect(result.success).toBe(true);
    });
  });

  it('should fail with negative budget', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test Project',
      budget: -1000,
    });
    
    expect(result.success).toBe(false);
  });

  it('should default status to planned', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test Project',
    });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('planned');
    }
  });

  it('should default priority to medium', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test Project',
    });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe('medium');
    }
  });
});

describe('updateProjectSchema', () => {
  it('should allow partial updates', () => {
    const result = updateProjectSchema.safeParse({
      status: 'completed',
      completedDate: '2024-06-01',
    });
    
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = updateProjectSchema.safeParse({});
    
    expect(result.success).toBe(true);
  });
});

describe('projectIdParamSchema', () => {
  it('should validate valid ID', () => {
    const result = projectIdParamSchema.safeParse({ id: 'proj-123' });
    
    expect(result.success).toBe(true);
  });

  it('should fail with empty ID', () => {
    const result = projectIdParamSchema.safeParse({ id: '' });
    
    expect(result.success).toBe(false);
  });
});
