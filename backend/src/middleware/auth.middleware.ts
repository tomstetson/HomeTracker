import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Auth is disabled by default for homelab use
// Set AUTH_ENABLED=true and configure Supabase to enable
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

// Supabase client for JWT verification (only created if auth is enabled)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Only create Supabase client if auth is enabled and credentials are provided
const supabase: SupabaseClient | null = 
  AUTH_ENABLED && supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
    : null;

// Default user when auth is disabled
const DEFAULT_USER = {
  userId: 'local-user',
  email: 'local@hometracker.local',
  role: 'admin',
};

// Extend Request type to include user
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to verify Supabase JWT access token
 * When auth is disabled, allows all requests with default user
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // When auth is disabled, allow all requests with default user
  if (!AUTH_ENABLED || !supabase) {
    (req as AuthenticatedRequest).user = DEFAULT_USER;
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No token provided',
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Attach user info to request
    (req as AuthenticatedRequest).user = {
      userId: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'user',
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Token verification failed',
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token, but extracts user if present
 * When auth is disabled, sets default user
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // When auth is disabled, always set default user
  if (!AUTH_ENABLED || !supabase) {
    (req as AuthenticatedRequest).user = DEFAULT_USER;
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        (req as AuthenticatedRequest).user = {
          userId: user.id,
          email: user.email || '',
          role: user.user_metadata?.role || 'user',
        };
      }
    } catch {
      // Ignore errors, user just won't be set
    }
  }

  next();
}

/**
 * Middleware to require admin role
 * Must be used after authMiddleware
 */
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
    return;
  }

  if (user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
}
