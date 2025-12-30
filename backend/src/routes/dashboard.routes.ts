import { Router, Request, Response } from 'express';
const router = Router();

router.get('/summary', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalItems: 0,
      upcomingMaintenance: 0,
      expiringWarranties: 0,
      activeProjects: 0,
      totalValue: 0,
      alerts: [],
    },
  });
});

export default router;















