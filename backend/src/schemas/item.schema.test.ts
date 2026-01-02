/**
 * Item Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  createItemSchema, 
  updateItemSchema, 
  itemIdParamSchema,
  itemQuerySchema 
} from './item.schema';

describe('createItemSchema', () => {
  it('should validate a minimal valid item', () => {
    const result = createItemSchema.safeParse({
      name: 'Test Item',
      category: 'Electronics',
    });
    
    expect(result.success).toBe(true);
  });

  it('should validate a complete item', () => {
    const result = createItemSchema.safeParse({
      name: 'Samsung TV',
      category: 'Electronics',
      subcategory: 'Television',
      location: 'Living Room',
      brand: 'Samsung',
      model: 'QN55Q80C',
      serialNumber: 'ABC123456',
      purchaseDate: '2024-01-15',
      purchasePrice: 999.99,
      currentValue: 800,
      condition: 'excellent',
      quantity: 1,
      notes: 'Wall mounted',
      tags: ['smart-tv', 'living-room'],
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with empty name', () => {
    const result = createItemSchema.safeParse({
      name: '',
      category: 'Electronics',
    });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name');
    }
  });

  it('should fail with empty category', () => {
    const result = createItemSchema.safeParse({
      name: 'Test Item',
      category: '',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with name too long', () => {
    const result = createItemSchema.safeParse({
      name: 'x'.repeat(201),
      category: 'Electronics',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with invalid condition', () => {
    const result = createItemSchema.safeParse({
      name: 'Test Item',
      category: 'Electronics',
      condition: 'invalid',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with negative price', () => {
    const result = createItemSchema.safeParse({
      name: 'Test Item',
      category: 'Electronics',
      purchasePrice: -100,
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with zero quantity', () => {
    const result = createItemSchema.safeParse({
      name: 'Test Item',
      category: 'Electronics',
      quantity: 0,
    });
    
    expect(result.success).toBe(false);
  });

  it('should accept valid URL for consumableRefillUrl', () => {
    const result = createItemSchema.safeParse({
      name: 'Printer',
      category: 'Electronics',
      isConsumable: true,
      consumableRefillUrl: 'https://amazon.com/ink',
    });
    
    expect(result.success).toBe(true);
  });

  it('should accept empty string for optional URL', () => {
    const result = createItemSchema.safeParse({
      name: 'Printer',
      category: 'Electronics',
      consumableRefillUrl: '',
    });
    
    expect(result.success).toBe(true);
  });
});

describe('updateItemSchema', () => {
  it('should allow partial updates', () => {
    const result = updateItemSchema.safeParse({
      name: 'Updated Name',
    });
    
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = updateItemSchema.safeParse({});
    
    expect(result.success).toBe(true);
  });

  it('should still validate field constraints', () => {
    const result = updateItemSchema.safeParse({
      name: '', // empty not allowed even in update
    });
    
    expect(result.success).toBe(false);
  });
});

describe('itemIdParamSchema', () => {
  it('should validate valid ID', () => {
    const result = itemIdParamSchema.safeParse({ id: 'abc123' });
    
    expect(result.success).toBe(true);
  });

  it('should fail with empty ID', () => {
    const result = itemIdParamSchema.safeParse({ id: '' });
    
    expect(result.success).toBe(false);
  });

  it('should fail with missing ID', () => {
    const result = itemIdParamSchema.safeParse({});
    
    expect(result.success).toBe(false);
  });
});

describe('itemQuerySchema', () => {
  it('should validate empty query', () => {
    const result = itemQuerySchema.safeParse({});
    
    expect(result.success).toBe(true);
  });

  it('should validate filter parameters', () => {
    const result = itemQuerySchema.safeParse({
      category: 'Electronics',
      location: 'Living Room',
      search: 'samsung',
    });
    
    expect(result.success).toBe(true);
  });

  it('should transform limit to number', () => {
    const result = itemQuerySchema.safeParse({
      limit: '10',
    });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('should fail with non-numeric limit', () => {
    const result = itemQuerySchema.safeParse({
      limit: 'abc',
    });
    
    expect(result.success).toBe(false);
  });
});
