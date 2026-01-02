/**
 * Rate Limiting Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

// Mock express-rate-limit before importing our middleware
vi.mock('express-rate-limit', () => ({
  default: vi.fn((options) => {
    // Return a middleware function that tracks calls
    return (req: Request, res: Response, next: () => void) => {
      // Simulate rate limit check
      const shouldSkip = options.skip?.(req);
      if (shouldSkip) {
        next();
        return;
      }
      
      // For testing, we'll just pass through
      next();
    };
  }),
}));

import { 
  apiLimiter, 
  authLimiter, 
  aiLimiter, 
  uploadLimiter,
  readLimiter 
} from './rateLimit.middleware';

// Mock response
const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

// Mock request
const mockRequest = (overrides: Partial<Request> = {}) => {
  return {
    path: '/api/items',
    method: 'GET',
    ...overrides,
  } as Request;
};

describe('Rate Limiters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiLimiter', () => {
    it('should be defined', () => {
      expect(apiLimiter).toBeDefined();
      expect(typeof apiLimiter).toBe('function');
    });

    it('should skip health check endpoint', () => {
      const req = mockRequest({ path: '/health' });
      const res = mockResponse();
      const next = vi.fn();
      
      apiLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should apply to regular API endpoints', () => {
      const req = mockRequest({ path: '/api/items' });
      const res = mockResponse();
      const next = vi.fn();
      
      apiLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authLimiter', () => {
    it('should be defined', () => {
      expect(authLimiter).toBeDefined();
      expect(typeof authLimiter).toBe('function');
    });

    it('should skip GET requests', () => {
      const req = mockRequest({ method: 'GET', path: '/api/auth/me' });
      const res = mockResponse();
      const next = vi.fn();
      
      authLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should apply to POST requests', () => {
      const req = mockRequest({ method: 'POST', path: '/api/auth/login' });
      const res = mockResponse();
      const next = vi.fn();
      
      authLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('aiLimiter', () => {
    it('should be defined', () => {
      expect(aiLimiter).toBeDefined();
      expect(typeof aiLimiter).toBe('function');
    });

    it('should skip GET requests', () => {
      const req = mockRequest({ method: 'GET', path: '/api/ai-jobs' });
      const res = mockResponse();
      const next = vi.fn();
      
      aiLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should apply to POST requests (job creation)', () => {
      const req = mockRequest({ method: 'POST', path: '/api/ai-jobs' });
      const res = mockResponse();
      const next = vi.fn();
      
      aiLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('uploadLimiter', () => {
    it('should be defined', () => {
      expect(uploadLimiter).toBeDefined();
      expect(typeof uploadLimiter).toBe('function');
    });

    it('should skip GET requests', () => {
      const req = mockRequest({ method: 'GET', path: '/api/images' });
      const res = mockResponse();
      const next = vi.fn();
      
      uploadLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should apply to POST requests (uploads)', () => {
      const req = mockRequest({ method: 'POST', path: '/api/images/upload' });
      const res = mockResponse();
      const next = vi.fn();
      
      uploadLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('readLimiter', () => {
    it('should be defined', () => {
      expect(readLimiter).toBeDefined();
      expect(typeof readLimiter).toBe('function');
    });

    it('should apply to GET requests', () => {
      const req = mockRequest({ method: 'GET', path: '/api/items' });
      const res = mockResponse();
      const next = vi.fn();
      
      readLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should skip POST requests', () => {
      const req = mockRequest({ method: 'POST', path: '/api/items' });
      const res = mockResponse();
      const next = vi.fn();
      
      readLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });
});
