/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse and DoS attacks.
 * Different limits for different endpoint types.
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Helper to create consistent rate limit response
const rateLimitHandler = (message: string) => (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: {
      message,
      code: 429,
    },
  });
};

/**
 * General API rate limit
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  handler: rateLimitHandler('Too many requests, please try again later'),
  skip: (req) => req.path === '/health',
});

/**
 * Stricter limit for authentication endpoints
 * 10 attempts per 15 minutes per IP
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  handler: rateLimitHandler('Too many login attempts, please try again later'),
  skip: (req) => !['POST'].includes(req.method),
});

/**
 * Stricter limit for AI endpoints (expensive operations)
 * 20 AI jobs per hour per IP
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 AI jobs per hour
  handler: rateLimitHandler('AI rate limit exceeded, please try again later'),
  skip: (req) => req.method !== 'POST',
});

/**
 * Rate limit for file uploads
 * 50 uploads per 15 minutes per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per window
  handler: rateLimitHandler('Too many uploads, please try again later'),
  skip: (req) => req.method !== 'POST',
});

/**
 * Lenient limit for read operations (GET requests)
 * 200 requests per 15 minutes per IP
 */
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 reads per window
  handler: rateLimitHandler('Too many requests, please try again later'),
  skip: (req) => req.method !== 'GET',
});
