/**
 * Notification Scheduler Service
 * Server-side scheduling for warranty expirations, maintenance reminders,
 * and project deadlines. Supports future push notification integration.
 */

import { db } from './database.service';
import * as cron from 'node-cron';

// Types
interface ScheduledNotification {
  id: string;
  user_id: string;
  type: 'warranty_expiring' | 'maintenance_due' | 'project_deadline' | 'predictive_maintenance';
  title: string;
  message: string;
  action_url: string;
  scheduled_for: string;
  sent: boolean;
  created_at: string;
}

interface NotificationPreferences {
  warrantyDays: number[];
  maintenanceDays: number[];
  projectDays: number[];
  emailEnabled: boolean;
  pushEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  warrantyDays: [30, 14, 7],
  maintenanceDays: [7, 1, 0],
  projectDays: [14, 7, 1],
  emailEnabled: false,
  pushEnabled: false,
};

class NotificationSchedulerService {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Initialize the notification scheduler
   */
  initialize(): void {
    // Run daily at 8 AM
    this.cronJob = cron.schedule('0 8 * * *', () => {
      console.log('📬 Running daily notification checks...');
      this.runDailyChecks();
    });

    console.log('📬 Notification scheduler initialized (Daily at 8:00 AM)');

    // Run immediately on startup (after a short delay)
    setTimeout(() => {
      this.runDailyChecks();
    }, 5000);
  }

  /**
   * Run all daily notification checks
   */
  async runDailyChecks(): Promise<void> {
    try {
      await this.checkWarrantyExpirations();
      await this.checkMaintenanceDue();
      await this.checkProjectDeadlines();
      await this.checkPredictiveMaintenance();
      console.log('📬 Daily notification checks completed');
    } catch (error) {
      console.error('📬 Error running notification checks:', error);
    }
  }

  /**
   * Check for expiring warranties and create notifications
   */
  private async checkWarrantyExpirations(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get warranties expiring in the next 30 days
    const stmt = db.prepare(`
      SELECT w.id, w.item_id, w.end_date, w.provider,
             i.name as item_name, i.property_id,
             p.user_id
      FROM warranties w
      JOIN items i ON w.item_id = i.id
      JOIN properties p ON i.property_id = p.id
      WHERE w.end_date IS NOT NULL
        AND date(w.end_date) >= date('now')
        AND date(w.end_date) <= date('now', '+30 days')
    `);

    const expiringWarranties = stmt.all() as Array<{
      id: string;
      item_id: string;
      end_date: string;
      provider: string;
      item_name: string;
      property_id: string;
      user_id: string;
    }>;

    for (const warranty of expiringWarranties) {
      const expiryDate = new Date(warranty.end_date);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if this matches notification days (30, 14, 7)
      if ([30, 14, 7].includes(daysUntilExpiry)) {
        this.createNotification({
          userId: warranty.user_id,
          type: 'warranty_expiring',
          title: `Warranty expiring in ${daysUntilExpiry} days`,
          message: `Warranty for "${warranty.item_name}" expires on ${expiryDate.toLocaleDateString()}`,
          actionUrl: `/warranties?id=${warranty.id}`,
        });
      }
    }
  }

  /**
   * Check for upcoming and overdue maintenance
   */
  private async checkMaintenanceDue(): Promise<void> {
    const stmt = db.prepare(`
      SELECT mt.id, mt.title, mt.due_date, mt.priority, mt.property_id,
             p.user_id
      FROM maintenance_tasks mt
      JOIN properties p ON mt.property_id = p.id
      WHERE mt.status = 'pending'
        AND date(mt.due_date) <= date('now', '+7 days')
    `);

    const dueTasks = stmt.all() as Array<{
      id: string;
      title: string;
      due_date: string;
      priority: string;
      property_id: string;
      user_id: string;
    }>;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const task of dueTasks) {
      const dueDate = new Date(task.due_date);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if this matches notification days (7, 1, 0, or overdue)
      if ([7, 1, 0].includes(daysUntilDue) || daysUntilDue < 0) {
        const isOverdue = daysUntilDue < 0;
        this.createNotification({
          userId: task.user_id,
          type: 'maintenance_due',
          title: isOverdue
            ? `Maintenance overdue by ${Math.abs(daysUntilDue)} days`
            : daysUntilDue === 0
            ? 'Maintenance due today'
            : `Maintenance due in ${daysUntilDue} days`,
          message: `"${task.title}" is ${isOverdue ? 'overdue' : 'coming up'}`,
          actionUrl: `/maintenance?id=${task.id}`,
        });
      }
    }
  }

  /**
   * Check for project deadlines
   */
  private async checkProjectDeadlines(): Promise<void> {
    const stmt = db.prepare(`
      SELECT pj.id, pj.name, pj.due_date, pj.status, pj.property_id,
             p.user_id
      FROM projects pj
      JOIN properties p ON pj.property_id = p.id
      WHERE pj.status NOT IN ('completed', 'cancelled')
        AND pj.due_date IS NOT NULL
        AND date(pj.due_date) <= date('now', '+14 days')
    `);

    const upcomingProjects = stmt.all() as Array<{
      id: string;
      name: string;
      due_date: string;
      status: string;
      property_id: string;
      user_id: string;
    }>;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const project of upcomingProjects) {
      const dueDate = new Date(project.due_date);
      const daysUntilDeadline = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if this matches notification days (14, 7, 1)
      if ([14, 7, 1].includes(daysUntilDeadline) || daysUntilDeadline < 0) {
        const isOverdue = daysUntilDeadline < 0;
        this.createNotification({
          userId: project.user_id,
          type: 'project_deadline',
          title: isOverdue
            ? `Project deadline passed ${Math.abs(daysUntilDeadline)} days ago`
            : `Project deadline in ${daysUntilDeadline} days`,
          message: `"${project.name}" ${isOverdue ? 'is past deadline' : 'deadline approaching'}`,
          actionUrl: `/projects?id=${project.id}`,
        });
      }
    }
  }

  /**
   * Check for items that may need predictive maintenance
   * Based on age, maintenance history, and category patterns
   */
  private async checkPredictiveMaintenance(): Promise<void> {
    try {
      // Find items without maintenance in over a year
      const neglectedStmt = db.prepare(`
        SELECT i.id, i.name, c.name as category_name, i.purchase_date, i.property_id,
               p.user_id,
               MAX(mt.last_completed) as last_maintenance
        FROM items i
        JOIN properties p ON i.property_id = p.id
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN maintenance_tasks mt ON mt.related_item_id = i.id AND mt.status = 'completed'
        WHERE i.status = 'active'
          AND i.purchase_date IS NOT NULL
        GROUP BY i.id
        HAVING (last_maintenance IS NULL AND date(i.purchase_date) < date('now', '-1 year'))
           OR (last_maintenance IS NOT NULL AND date(last_maintenance) < date('now', '-1 year'))
      `);

      const neglectedItems = neglectedStmt.all() as Array<{
        id: string;
        name: string;
        category_name: string | null;
        purchase_date: string;
        user_id: string;
        last_maintenance: string | null;
      }>;

      for (const item of neglectedItems) {
        this.createNotification({
          userId: item.user_id,
          type: 'predictive_maintenance',
          title: 'Maintenance recommended',
          message: `"${item.name}" hasn't been serviced in over a year`,
          actionUrl: `/items?id=${item.id}`,
        });
      }

      // Find appliances in categories that typically need annual maintenance
      const applianceCategories = ['HVAC', 'Plumbing', 'Electrical', 'Kitchen Appliances', 'Laundry'];
      const applianceStmt = db.prepare(`
        SELECT i.id, i.name, c.name as category_name, i.purchase_date, i.property_id,
               p.user_id,
               COUNT(mt.id) as maintenance_count
        FROM items i
        JOIN properties p ON i.property_id = p.id
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN maintenance_tasks mt ON mt.related_item_id = i.id AND mt.status = 'completed'
        WHERE i.status = 'active'
          AND c.name IN (${applianceCategories.map(() => '?').join(',')})
          AND i.purchase_date IS NOT NULL
        GROUP BY i.id
        HAVING maintenance_count = 0
          AND date(i.purchase_date) < date('now', '-6 months')
      `);

      const unmaintainedAppliances = applianceStmt.all(...applianceCategories) as Array<{
        id: string;
        name: string;
        category_name: string;
        purchase_date: string;
        user_id: string;
      }>;

      for (const item of unmaintainedAppliances) {
        this.createNotification({
          userId: item.user_id,
          type: 'predictive_maintenance',
          title: 'Schedule maintenance',
          message: `${item.category_name} item "${item.name}" may benefit from routine maintenance`,
          actionUrl: `/items?id=${item.id}`,
        });
      }
    } catch (error) {
      console.error('📬 Predictive maintenance check error:', error);
    }
  }

  /**
   * Create a notification record
   */
  private createNotification(params: {
    userId: string;
    type: ScheduledNotification['type'];
    title: string;
    message: string;
    actionUrl: string;
  }): void {
    const { userId, type, title, message, actionUrl } = params;

    // Check if this notification already exists (avoid duplicates)
    const existsStmt = db.prepare(`
      SELECT id FROM notifications
      WHERE user_id = ? AND type = ? AND title = ? AND sent = 0
        AND date(created_at) = date('now')
    `);
    const existing = existsStmt.get(userId, type, title);
    if (existing) return;

    // Create notification
    const insertStmt = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, action_url, sent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `);

    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    insertStmt.run(id, userId, type, title, message, actionUrl);

    console.log(`📬 Created notification: ${title}`);
  }

  /**
   * Get pending notifications for a user
   */
  getPendingNotifications(userId: string): ScheduledNotification[] {
    const stmt = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? AND sent = 0
      ORDER BY created_at DESC
      LIMIT 50
    `);
    return stmt.all(userId) as ScheduledNotification[];
  }

  /**
   * Mark notifications as sent
   */
  markAsSent(notificationIds: string[]): void {
    if (notificationIds.length === 0) return;

    const placeholders = notificationIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE notifications SET sent = 1 WHERE id IN (${placeholders})
    `);
    stmt.run(...notificationIds);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }
}

// Create notifications table if not exists
function ensureNotificationsTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      action_url TEXT,
      scheduled_for TEXT,
      sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(sent);
  `);
}

// Initialize table
ensureNotificationsTable();

// Singleton instance
export const notificationSchedulerService = new NotificationSchedulerService();
