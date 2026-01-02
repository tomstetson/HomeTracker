/**
 * Warranty Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  createWarrantySchema, 
  updateWarrantySchema, 
  warrantyIdParamSchema 
} from './warranty.schema';

describe('createWarrantySchema', () => {
  it('should validate a valid warranty', () => {
    const result = createWarrantySchema.safeParse({
      itemName: 'Samsung TV',
      provider: 'Samsung',
      startDate: '2024-01-15',
      endDate: '2027-01-15',
    });
    
    expect(result.success).toBe(true);
  });

  it('should validate a complete warranty', () => {
    const result = createWarrantySchema.safeParse({
      itemId: 'item-123',
      itemName: 'Samsung TV',
      provider: 'Best Buy',
      type: 'extended',
      startDate: '2024-01-15',
      endDate: '2027-01-15',
      cost: 199.99,
      coverageDetails: 'Covers all defects and accidental damage',
      claimPhone: '1-800-BESTBUY',
      claimEmail: 'claims@bestbuy.com',
      claimUrl: 'https://bestbuy.com/claims',
      policyNumber: 'POL-123456',
      notes: 'Extended protection plan',
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with missing itemName', () => {
    const result = createWarrantySchema.safeParse({
      provider: 'Samsung',
      startDate: '2024-01-15',
      endDate: '2027-01-15',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with missing provider', () => {
    const result = createWarrantySchema.safeParse({
      itemName: 'Samsung TV',
      startDate: '2024-01-15',
      endDate: '2027-01-15',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with missing startDate', () => {
    const result = createWarrantySchema.safeParse({
      itemName: 'Samsung TV',
      provider: 'Samsung',
      endDate: '2027-01-15',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with invalid warranty type', () => {
    const result = createWarrantySchema.safeParse({
      itemName: 'Samsung TV',
      provider: 'Samsung',
      type: 'invalid_type',
      startDate: '2024-01-15',
      endDate: '2027-01-15',
    });
    
    expect(result.success).toBe(false);
  });

  it('should accept valid warranty types', () => {
    const types = ['manufacturer', 'extended', 'service_plan', 'insurance', 'other'];
    
    types.forEach(type => {
      const result = createWarrantySchema.safeParse({
        itemName: 'Test Item',
        provider: 'Test Provider',
        type,
        startDate: '2024-01-15',
        endDate: '2027-01-15',
      });
      
      expect(result.success).toBe(true);
    });
  });

  it('should accept valid email', () => {
    const result = createWarrantySchema.safeParse({
      itemName: 'Test Item',
      provider: 'Test Provider',
      startDate: '2024-01-15',
      endDate: '2027-01-15',
      claimEmail: 'valid@example.com',
    });
    
    expect(result.success).toBe(true);
  });

  it('should accept empty string for optional email', () => {
    const result = createWarrantySchema.safeParse({
      itemName: 'Test Item',
      provider: 'Test Provider',
      startDate: '2024-01-15',
      endDate: '2027-01-15',
      claimEmail: '',
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with invalid email', () => {
    const result = createWarrantySchema.safeParse({
      itemName: 'Test Item',
      provider: 'Test Provider',
      startDate: '2024-01-15',
      endDate: '2027-01-15',
      claimEmail: 'not-an-email',
    });
    
    expect(result.success).toBe(false);
  });
});

describe('updateWarrantySchema', () => {
  it('should allow partial updates', () => {
    const result = updateWarrantySchema.safeParse({
      endDate: '2028-01-15',
    });
    
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = updateWarrantySchema.safeParse({});
    
    expect(result.success).toBe(true);
  });
});

describe('warrantyIdParamSchema', () => {
  it('should validate valid ID', () => {
    const result = warrantyIdParamSchema.safeParse({ id: 'warranty-123' });
    
    expect(result.success).toBe(true);
  });

  it('should fail with empty ID', () => {
    const result = warrantyIdParamSchema.safeParse({ id: '' });
    
    expect(result.success).toBe(false);
  });
});
