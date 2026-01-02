/**
 * Auth Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  loginSchema, 
  registerSchema, 
  changePasswordSchema 
} from './auth.schema';

describe('loginSchema', () => {
  it('should validate valid login credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with missing email', () => {
    const result = loginSchema.safeParse({
      password: 'password123',
    });
    
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('should validate valid registration', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'SecurePass1',
    });
    
    expect(result.success).toBe(true);
  });

  it('should validate with optional name', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'SecurePass1',
      name: 'John Doe',
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with password too short', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'Short1',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with password missing uppercase', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'lowercase1',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with password missing lowercase', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'UPPERCASE1',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with password missing number', () => {
    const result = registerSchema.safeParse({
      email: 'newuser@example.com',
      password: 'NoNumberHere',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'invalid-email',
      password: 'SecurePass1',
    });
    
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('should validate valid password change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass123',
      newPassword: 'NewSecure1',
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail with weak new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass123',
      newPassword: 'weak',
    });
    
    expect(result.success).toBe(false);
  });

  it('should fail with empty current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'NewSecure1',
    });
    
    expect(result.success).toBe(false);
  });
});
