import { Router, Request, Response } from 'express';
const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { email } = req.body;
  res.json({
    success: true,
    data: {
      user: { id: '1', email, firstName: 'Tom', lastName: 'Stetson', role: 'admin' },
      token: 'mock-jwt-token',
    },
  });
});

router.get('/me', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { id: '1', email: 'tom@example.com', firstName: 'Tom', lastName: 'Stetson', role: 'admin' },
  });
});

export default router;













