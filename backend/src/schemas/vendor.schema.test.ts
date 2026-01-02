/**
 * Vendor Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  createVendorSchema, 
  updateVendorSchema, 
  vendorIdParamSchema 
} from './vendor.schema';

describe('createVendorSchema', () => {
  it('should validate a minimal vendor', () => {
    const result = createVendorSchema.safeParse({
      name: 'ABC Plumbing',
    });
    
    expect(result.success).toBe(true);
  });

  it('should validate a complete vendor', () => {
    const result = createVendorSchema.safeParse({
      name: 'ABC Plumbing',
      category: 'Plumber',
      phone: '555-123-4567',
      email: 'contact@abcplumbing.com',
      website: 'https://abcplumbing.com',
      address: '123 Main St, Anytown, USA 12345',
      contactPerson: 'John Smith',
      rating: 5,
      notes: 'Great service, fair prices',
      tags: ['plumber', 'emergency', '24-hour'],
      isPreferred: true,
      licenseNumber: 'PLB-12345',
      insuranceInfo: 'Fully insured, $1M liability',
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with empty name', () => {
    const result = createVendorSchema.safeParse({
      name: '',
    });
    
    expect(result.success).toBe(false);
  });

  it('should accept valid email', () => {
    const result = createVendorSchema.safeParse({
      name: 'Test Vendor',
      email: 'test@example.com',
    });
    
    expect(result.success).toBe(true);
  });

  it('should accept empty string for optional email', () => {
    const result = createVendorSchema.safeParse({
      name: 'Test Vendor',
      email: '',
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with invalid email', () => {
    const result = createVendorSchema.safeParse({
      name: 'Test Vendor',
      email: 'not-an-email',
    });
    
    expect(result.success).toBe(false);
  });

  it('should accept valid website URL', () => {
    const result = createVendorSchema.safeParse({
      name: 'Test Vendor',
      website: 'https://example.com',
    });
    
    expect(result.success).toBe(true);
  });

  it('should accept empty string for optional website', () => {
    const result = createVendorSchema.safeParse({
      name: 'Test Vendor',
      website: '',
    });
    
    expect(result.success).toBe(true);
  });

  it('should accept valid ratings 1-5', () => {
    for (let rating = 1; rating <= 5; rating++) {
      const result = createVendorSchema.safeParse({
        name: 'Test Vendor',
        rating,
      });
      
      expect(result.success).toBe(true);
    }
  });

  it('should fail with rating below 1', () => {
    const result = createVendorSchema.safeParse({
      name: 'Test Vendor',
      rating: 0,
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with rating above 5', () => {
    const result = createVendorSchema.safeParse({
      name: 'Test Vendor',
      rating: 6,
    });
    
    expect(result.success).toBe(false);
  });
});

describe('updateVendorSchema', () => {
  it('should allow partial updates', () => {
    const result = updateVendorSchema.safeParse({
      rating: 4,
      isPreferred: true,
    });
    
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = updateVendorSchema.safeParse({});
    
    expect(result.success).toBe(true);
  });
});

describe('vendorIdParamSchema', () => {
  it('should validate valid ID', () => {
    const result = vendorIdParamSchema.safeParse({ id: 'vendor-123' });
    
    expect(result.success).toBe(true);
  });

  it('should fail with empty ID', () => {
    const result = vendorIdParamSchema.safeParse({ id: '' });
    
    expect(result.success).toBe(false);
  });
});
