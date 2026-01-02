/**
 * Validation Middleware using Zod
 * 
 * Validates request body, params, and query against Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation target types
 */
type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (default: 'body')
 * 
 * Usage:
 * router.post('/items', validate(createItemSchema), (req, res) => {
 *   // req.body is now validated and typed
 * });
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[target];
      const result = schema.safeParse(dataToValidate);
      
      if (!result.success) {
        const formattedErrors = formatZodErrors(result.error);
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 400,
            details: formattedErrors,
          },
        });
        return;
      }
      
      // Replace with validated/transformed data
      req[target] = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Format Zod errors into a more readable structure
 */
const formatZodErrors = (error: ZodError): Record<string, string[]> => {
  const formatted: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : '_root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }
  
  return formatted;
};

/**
 * Validate multiple targets at once
 * 
 * Usage:
 * router.put('/items/:id', validateMultiple({
 *   params: idParamSchema,
 *   body: updateItemSchema,
 * }), handler);
 */
export const validateMultiple = (schemas: Partial<Record<ValidationTarget, ZodSchema>>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, Record<string, string[]>> = {};
    
    for (const [target, schema] of Object.entries(schemas) as [ValidationTarget, ZodSchema][]) {
      if (!schema) continue;
      
      const result = schema.safeParse(req[target]);
      
      if (!result.success) {
        errors[target] = formatZodErrors(result.error);
      } else {
        req[target] = result.data;
      }
    }
    
    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 400,
          details: errors,
        },
      });
      return;
    }
    
    next();
  };
};
