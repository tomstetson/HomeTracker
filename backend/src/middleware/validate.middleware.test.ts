/**
 * Validation Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateMultiple } from './validate.middleware';

// Mock response object
const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

// Mock request object with body
const mockRequest = (body: any = {}, params: any = {}, query: any = {}) => {
  return { body, params, query } as Request;
};

// Test schemas
const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().int().positive().optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

describe('validate middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should pass validation with valid data', () => {
    const req = mockRequest({ name: 'John', email: 'john@example.com' });
    const res = mockResponse();
    
    validate(testSchema)(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should transform and attach validated data', () => {
    const req = mockRequest({ name: 'John', email: 'john@example.com', age: 25 });
    const res = mockResponse();
    
    validate(testSchema)(req, res, next);
    
    expect(req.body).toEqual({ name: 'John', email: 'john@example.com', age: 25 });
    expect(next).toHaveBeenCalled();
  });

  it('should fail validation with missing required fields', () => {
    const req = mockRequest({ email: 'john@example.com' }); // missing name
    const res = mockResponse();
    
    validate(testSchema)(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Validation failed',
          code: 400,
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should fail validation with invalid email', () => {
    const req = mockRequest({ name: 'John', email: 'not-an-email' });
    const res = mockResponse();
    
    validate(testSchema)(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should validate params when target is params', () => {
    const req = mockRequest({}, { id: 'abc123' });
    const res = mockResponse();
    
    validate(idParamSchema, 'params')(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.params).toEqual({ id: 'abc123' });
  });

  it('should fail params validation with empty id', () => {
    const req = mockRequest({}, { id: '' });
    const res = mockResponse();
    
    validate(idParamSchema, 'params')(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validateMultiple middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should validate multiple targets', () => {
    const req = mockRequest(
      { name: 'John', email: 'john@example.com' },
      { id: 'abc123' }
    );
    const res = mockResponse();
    
    validateMultiple({
      body: testSchema,
      params: idParamSchema,
    })(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should fail if any target validation fails', () => {
    const req = mockRequest(
      { name: 'John', email: 'invalid' }, // invalid email
      { id: 'abc123' }
    );
    const res = mockResponse();
    
    validateMultiple({
      body: testSchema,
      params: idParamSchema,
    })(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should aggregate errors from multiple targets', () => {
    const req = mockRequest(
      { email: 'invalid' }, // missing name, invalid email
      { id: '' } // empty id
    );
    const res = mockResponse();
    
    validateMultiple({
      body: testSchema,
      params: idParamSchema,
    })(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          details: expect.objectContaining({
            body: expect.any(Object),
            params: expect.any(Object),
          }),
        }),
      })
    );
  });
});
