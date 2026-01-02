import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database.service';

const router = Router();

router.get('/summary', (req: Request, res: Response) => {
  try {
    const propertyId = 'default';

    // Get total items count
    const itemsCount = databaseService.prepare(
      'SELECT COUNT(*) as count FROM items WHERE property_id = ? AND status = ?'
    ).get(propertyId, 'active') as { count: number };

    // Get total inventory value
    const totalValue = databaseService.prepare(
      'SELECT COALESCE(SUM(current_value), 0) as total FROM items WHERE property_id = ? AND status = ?'
    ).get(propertyId, 'active') as { total: number };

    // Get upcoming maintenance (due within 30 days)
    const upcomingMaintenance = databaseService.prepare(`
      SELECT COUNT(*) as count FROM maintenance_tasks
      WHERE property_id = ?
        AND status IN ('pending', 'overdue')
        AND (due_date IS NULL OR due_date <= date('now', '+30 days'))
    `).get(propertyId) as { count: number };

    // Get expiring warranties (within 90 days)
    const expiringWarranties = databaseService.prepare(`
      SELECT COUNT(*) as count FROM warranties w
      JOIN items i ON w.item_id = i.id
      WHERE i.property_id = ?
        AND w.end_date IS NOT NULL
        AND w.end_date >= date('now')
        AND w.end_date <= date('now', '+90 days')
    `).get(propertyId) as { count: number };

    // Get active projects
    const activeProjects = databaseService.prepare(
      'SELECT COUNT(*) as count FROM projects WHERE property_id = ? AND status IN (?, ?)'
    ).get(propertyId, 'planning', 'in_progress') as { count: number };

    // Build alerts array
    const alerts: Array<{ type: string; message: string; count: number }> = [];

    // Check for overdue maintenance
    const overdueMaintenance = databaseService.prepare(`
      SELECT COUNT(*) as count FROM maintenance_tasks
      WHERE property_id = ? AND status = 'overdue'
    `).get(propertyId) as { count: number };

    if (overdueMaintenance.count > 0) {
      alerts.push({
        type: 'warning',
        message: `${overdueMaintenance.count} overdue maintenance task(s)`,
        count: overdueMaintenance.count
      });
    }

    // Check for warranties expiring soon (30 days)
    const warrantiesExpiringSoon = databaseService.prepare(`
      SELECT COUNT(*) as count FROM warranties w
      JOIN items i ON w.item_id = i.id
      WHERE i.property_id = ?
        AND w.end_date IS NOT NULL
        AND w.end_date >= date('now')
        AND w.end_date <= date('now', '+30 days')
    `).get(propertyId) as { count: number };

    if (warrantiesExpiringSoon.count > 0) {
      alerts.push({
        type: 'info',
        message: `${warrantiesExpiringSoon.count} warranty(ies) expiring soon`,
        count: warrantiesExpiringSoon.count
      });
    }

    res.json({
      success: true,
      data: {
        totalItems: itemsCount.count,
        upcomingMaintenance: upcomingMaintenance.count,
        expiringWarranties: expiringWarranties.count,
        activeProjects: activeProjects.count,
        totalValue: totalValue.total,
        alerts,
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard summary'
    });
  }
});

export default router;
















