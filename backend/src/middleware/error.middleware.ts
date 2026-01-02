/**
 * Global Error Handling Middleware
 * 
 * Provides consistent error responses and centralized error logging.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Custom application error class
 * Use this for operational errors that should return specific HTTP status codes
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Common error factory functions
 */
export const Errors = {
  badRequest: (message: string, details?: unknown) => 
    new AppError(400, message, true, details),
  
  unauthorized: (message = 'Unauthorized') => 
    new AppError(401, message),
  
  forbidden: (message = 'Forbidden') => 
    new AppError(403, message),
  
  notFound: (resource = 'Resource') => 
    new AppError(404, `${resource} not found`),
  
  conflict: (message: string) => 
    new AppError(409, message),
  
  validationError: (details: unknown) => 
    new AppError(400, 'Validation failed', true, details),
  
  internal: (message = 'Internal server error') => 
    new AppError(500, message, false),
};

/**
 * Standardized error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: number;
    details?: unknown;
  };
}

/**
 * Helper to send consistent error responses
 */
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  details?: unknown
): void => {
  const errorObj: ErrorResponse['error'] = {
    message,
    code: statusCode,
  };
  
  if (details !== undefined) {
    errorObj.details = details;
  }
  
  res.status(statusCode).json({
    success: false,
    error: errorObj,
  });
};

/**
 * Global error handler middleware
 * Must be registered LAST in the middleware chain
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log all errors for debugging
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle known operational errors
  if (err instanceof AppError) {
    sendErrorResponse(res, err.statusCode, err.message, err.details);
    return;
  }

  // Handle Zod validation errors (if Zod is used)
  if (err.name === 'ZodError') {
    sendErrorResponse(res, 400, 'Validation failed', (err as any).errors);
    return;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    sendErrorResponse(res, 400, 'Invalid JSON in request body');
    return;
  }

  // Handle unknown/unexpected errors
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  sendErrorResponse(res, 500, message);
};

/**
 * Async handler wrapper to catch async errors
 * Wraps async route handlers to automatically catch and forward errors
 * 
 * Usage:
 * router.get('/items', asyncHandler(async (req, res) => {
 *   const items = await getItems();
 *   res.json({ success: true, data: items });
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler for undefined routes
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  sendErrorResponse(res, 404, 'Route not found');
};
