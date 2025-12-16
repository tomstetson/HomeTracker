import { Router, Request, Response } from 'express';
const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { email } = req.body;
  // MOCK AUTHENTICATION - For development only
  // In production, validate password and use real user database
  res.json({
    success: true,
    data: {
      user: { 
        id: '1', 
        email, 
        firstName: process.env.ADMIN_FIRST_NAME || 'Tom', 
        lastName: process.env.ADMIN_LAST_NAME || 'Stetson', 
        role: 'admin' 
      },
      token: process.env.JWT_SECRET || 'mock-jwt-token',
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














