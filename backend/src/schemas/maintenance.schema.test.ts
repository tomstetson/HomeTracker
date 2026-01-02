/**
 * Maintenance Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  createMaintenanceSchema, 
  updateMaintenanceSchema, 
  maintenanceIdParamSchema 
} from './maintenance.schema';

describe('createMaintenanceSchema', () => {
  it('should validate a minimal task', () => {
    const result = createMaintenanceSchema.safeParse({
      title: 'Replace HVAC Filter',
    });
    
    expect(result.success).toBe(true);
  });

  it('should validate a complete task', () => {
    const result = createMaintenanceSchema.safeParse({
      title: 'Replace HVAC Filter',
      description: 'Replace the air filter in the main HVAC unit',
      itemId: 'item-123',
      itemName: 'HVAC System',
      category: 'HVAC',
      priority: 'high',
      status: 'pending',
      dueDate: '2024-03-01',
      recurrence: 'monthly',
      recurrenceInterval: 3,
      estimatedCost: 25,
      vendorId: 'vendor-456',
      notes: 'Use MERV-13 filter',
      reminderDays: 7,
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with empty title', () => {
    const result = createMaintenanceSchema.safeParse({
      title: '',
    });
    
    expect(result.success).toBe(false);
  });

  it('should accept valid priorities', () => {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    
    priorities.forEach(priority => {
      const result = createMaintenanceSchema.safeParse({
        title: 'Test Task',
        priority,
      });
      
      expect(result.success).toBe(true);
    });
  });

  it('should accept valid statuses', () => {
    const statuses = ['pending', 'in_progress', 'completed', 'skipped', 'overdue'];
    
    statuses.forEach(status => {
      const result = createMaintenanceSchema.safeParse({
        title: 'Test Task',
        status,
      });
      
      expect(result.success).toBe(true);
    });
  });

  it('should accept valid recurrence types', () => {
    const recurrences = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    
    recurrences.forEach(recurrence => {
      const result = createMaintenanceSchema.safeParse({
        title: 'Test Task',
        recurrence,
      });
      
      expect(result.success).toBe(true);
    });
  });

  it('should fail with negative cost', () => {
    const result = createMaintenanceSchema.safeParse({
      title: 'Test Task',
      estimatedCost: -50,
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with reminder days over 365', () => {
    const result = createMaintenanceSchema.safeParse({
      title: 'Test Task',
      reminderDays: 400,
    });
    
    expect(result.success).toBe(false);
  });

  it('should default status to pending', () => {
    const result = createMaintenanceSchema.safeParse({
      title: 'Test Task',
    });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('pending');
    }
  });
});

describe('updateMaintenanceSchema', () => {
  it('should allow partial updates', () => {
    const result = updateMaintenanceSchema.safeParse({
      status: 'completed',
      completedDate: '2024-03-01',
      actualCost: 30,
    });
    
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = updateMaintenanceSchema.safeParse({});
    
    expect(result.success).toBe(true);
  });
});

describe('maintenanceIdParamSchema', () => {
  it('should validate valid ID', () => {
    const result = maintenanceIdParamSchema.safeParse({ id: 'maint-123' });
    
    expect(result.success).toBe(true);
  });

  it('should fail with empty ID', () => {
    const result = maintenanceIdParamSchema.safeParse({ id: '' });
    
    expect(result.success).toBe(false);
  });
});
