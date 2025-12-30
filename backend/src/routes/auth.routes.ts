import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  getUserById,
  updatePassword,
  updateProfile,
  generateTokens,
  verifyRefreshToken,
} from '../services/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Cookie options for refresh token
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    const result = await registerUser(email, password, name);

    if ('error' in result) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const result = await loginUser(email, password);

    if ('error' in result) {
      return res.status(401).json({
        success: false,
        error: result.error,
      });
    }

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * POST /api/auth/logout
 * Clear refresh token cookie
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', { path: '/' });
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * POST /api/auth/refresh
 * Get new access token using refresh token
 */
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token provided',
      });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    const user = getUserById(payload.userId);
    if (!user) {
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Set new refresh token
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user (requires authentication)
 */
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as Request & { user?: { userId: string } }).user;
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  const userData = getUserById(user.userId);
  if (!userData) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.json({
    success: true,
    data: userData,
  });
});

/**
 * PUT /api/auth/password
 * Update password (requires authentication)
 */
router.put('/password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user?: { userId: string } }).user;
    const { currentPassword, newPassword } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters',
      });
    }

    const result = await updatePassword(user.userId, currentPassword, newPassword);

    if ('error' in result) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({
      success: false,
      error: 'Password update failed',
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile (requires authentication)
 */
router.put('/profile', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user?: { userId: string } }).user;
    const { name, email } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const result = updateProfile(user.userId, { name, email });

    if ('error' in result) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Profile update failed',
    });
  }
});

export default router;















