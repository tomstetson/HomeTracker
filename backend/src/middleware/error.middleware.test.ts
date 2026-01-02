/**
 * Error Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  AppError, 
  Errors, 
  errorHandler, 
  sendErrorResponse,
  asyncHandler,
  notFoundHandler 
} from './error.middleware';

// Mock response object
const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

// Mock request object
const mockRequest = () => {
  return {} as Request;
};

// Mock next function
const mockNext = vi.fn() as NextFunction;

describe('AppError', () => {
  it('should create an error with correct properties', () => {
    const error = new AppError(400, 'Bad request');
    
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad request');
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should handle non-operational errors', () => {
    const error = new AppError(500, 'Internal error', false);
    
    expect(error.isOperational).toBe(false);
  });

  it('should include details when provided', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = new AppError(400, 'Validation error', true, details);
    
    expect(error.details).toEqual(details);
  });
});

describe('Errors factory', () => {
  it('should create badRequest error', () => {
    const error = Errors.badRequest('Invalid input');
    
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input');
  });

  it('should create unauthorized error', () => {
    const error = Errors.unauthorized();
    
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
  });

  it('should create notFound error', () => {
    const error = Errors.notFound('Item');
    
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Item not found');
  });

  it('should create validationError with details', () => {
    const details = { name: ['required'] };
    const error = Errors.validationError(details);
    
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual(details);
  });
});

describe('sendErrorResponse', () => {
  it('should send error response with correct structure', () => {
    const res = mockResponse();
    
    sendErrorResponse(res, 400, 'Bad request');
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Bad request',
        code: 400,
      },
    });
  });

  it('should include details when provided', () => {
    const res = mockResponse();
    const details = { field: 'email' };
    
    sendErrorResponse(res, 400, 'Validation failed', details);
    
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Validation failed',
        code: 400,
        details,
      },
    });
  });
});

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should handle AppError correctly', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = new AppError(404, 'Not found');
    
    errorHandler(error, req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Not found',
        code: 404,
      },
    });
  });

  it('should handle generic errors with 500 status', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = new Error('Something went wrong');
    
    errorHandler(error, req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should handle SyntaxError for invalid JSON', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = new SyntaxError('Unexpected token');
    (error as any).body = true;
    
    errorHandler(error, req, res, mockNext);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Invalid JSON in request body',
        code: 400,
      },
    });
  });
});

describe('asyncHandler', () => {
  it('should pass successful async results through', async () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();
    
    const handler = asyncHandler(async (_req, res) => {
      res.json({ success: true });
    });
    
    await handler(req, res, next);
    
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch async errors and pass to next', async () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();
    const testError = new Error('Async error');
    
    const handler = asyncHandler(async () => {
      throw testError;
    });
    
    await handler(req, res, next);
    
    expect(next).toHaveBeenCalledWith(testError);
  });
});

describe('notFoundHandler', () => {
  it('should return 404 for undefined routes', () => {
    const req = mockRequest();
    const res = mockResponse();
    
    notFoundHandler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Route not found',
        code: 404,
      },
    });
  });
});
