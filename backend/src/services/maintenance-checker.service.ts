import cron from 'node-cron';
import { excelService } from './excel.service';
import { emailService } from './email.service';

interface MaintenanceTask {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'completed';
  assignedTo?: string;
  priority: string;
}

class MaintenanceCheckerService {
  private isRunning = false;

  // Initialize the cron job
  init() {
    // Run every day at 8:00 AM
    cron.schedule('0 8 * * *', () => {
      console.log('Running daily maintenance check...');
      this.checkMaintenanceTasks();
    });
    
    console.log('📅 Maintenance checker initialized (Schedule: Daily at 8:00 AM)');
  }

  async checkMaintenanceTasks() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const tasks = excelService.getMaintenanceTasks() as MaintenanceTask[];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueTasks: MaintenanceTask[] = [];
      const upcomingTasks: MaintenanceTask[] = [];

      tasks.forEach(task => {
        if (task.status === 'completed') return;

        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          overdueTasks.push(task);
        } else if (diffDays <= 7 && diffDays >= 0) {
          upcomingTasks.push(task);
        }
      });

      if (overdueTasks.length > 0 || upcomingTasks.length > 0) {
        await this.sendNotification(overdueTasks, upcomingTasks);
      }
    } catch (error) {
      console.error('Error checking maintenance tasks:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async sendNotification(overdue: MaintenanceTask[], upcoming: MaintenanceTask[]) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn('Cannot send maintenance notification: ADMIN_EMAIL not set');
      return;
    }

    const subject = `HomeTracker Maintenance Update - ${new Date().toLocaleDateString()}`;
    
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Home Maintenance Update</h2>
        <p>Here is your daily summary of maintenance tasks.</p>
    `;

    if (overdue.length > 0) {
      html += `
        <h3 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 5px;">⚠️ Overdue Tasks (${overdue.length})</h3>
        <ul style="list-style-type: none; padding: 0;">
          ${overdue.map(task => `
            <li style="margin-bottom: 10px; padding: 10px; background-color: #fee2e2; border-radius: 4px;">
              <strong>${task.title}</strong><br>
              <span style="font-size: 12px; color: #7f1d1d;">Due: ${new Date(task.dueDate).toLocaleDateString()} | Priority: ${task.priority}</span>
            </li>
          `).join('')}
        </ul>
      `;
    }

    if (upcoming.length > 0) {
      html += `
        <h3 style="color: #d97706; border-bottom: 2px solid #d97706; padding-bottom: 5px;">📅 Upcoming (Next 7 Days)</h3>
        <ul style="list-style-type: none; padding: 0;">
          ${upcoming.map(task => `
            <li style="margin-bottom: 10px; padding: 10px; background-color: #fef3c7; border-radius: 4px;">
              <strong>${task.title}</strong><br>
              <span style="font-size: 12px; color: #78350f;">Due: ${new Date(task.dueDate).toLocaleDateString()} | Priority: ${task.priority}</span>
            </li>
          `).join('')}
        </ul>
      `;
    }

    html += `
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>Sent by HomeTracker Automation</p>
          <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="color: #2563eb; text-decoration: none;">Open HomeTracker</a>
        </div>
      </div>
    `;

    await emailService.sendEmail(adminEmail, subject, html);
  }
}

export const maintenanceChecker = new MaintenanceCheckerService();
