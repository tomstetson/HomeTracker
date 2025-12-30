import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { notificationSchedulerService } from '../services/notification-scheduler.service';

const router = Router();

/**
 * GET /api/notifications
 * Get pending notifications for the authenticated user
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const notifications = notificationSchedulerService.getPendingNotifications(user.userId);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/notifications/mark-read
 * Mark notifications as read/sent
 */
router.post('/mark-read', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ success: false, error: 'notificationIds must be an array' });
    }

    notificationSchedulerService.markAsSent(notificationIds);

    res.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications' });
  }
});

/**
 * POST /api/notifications/run-checks
 * Manually trigger notification checks (admin only)
 */
router.post('/run-checks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    await notificationSchedulerService.runDailyChecks();

    res.json({
      success: true,
      message: 'Notification checks completed',
    });
  } catch (error) {
    console.error('Error running notification checks:', error);
    res.status(500).json({ success: false, error: 'Failed to run checks' });
  }
});

export default router;
