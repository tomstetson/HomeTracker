import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

// Generate a session-specific token if JWT_SECRET not configured
// This is safer than a hardcoded fallback but still requires proper JWT setup for production
const getSessionToken = (): string => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  // Log warning in development
  console.warn('[SECURITY] JWT_SECRET not configured. Using ephemeral session token. Set JWT_SECRET in .env for production.');
  // Generate a random token for this session (not persisted)
  return crypto.randomBytes(32).toString('hex');
};

router.post('/login', (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
    });
  }
  
  // NOTE: This is a single-user homelab app without real authentication
  // For multi-user support, implement proper password validation and user database
  res.json({
    success: true,
    data: {
      user: { 
        id: '1', 
        email, 
        firstName: process.env.ADMIN_FIRST_NAME || 'Admin', 
        lastName: process.env.ADMIN_LAST_NAME || 'User', 
        role: 'admin' 
      },
      token: getSessionToken(),
    },
  });
});

router.get('/me', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { 
      id: '1', 
      email: process.env.ADMIN_EMAIL || 'tom@example.com', 
      firstName: process.env.ADMIN_FIRST_NAME || 'Tom', 
      lastName: process.env.ADMIN_LAST_NAME || 'Stetson', 
      role: 'admin' 
    },
  });
});

export default router;














