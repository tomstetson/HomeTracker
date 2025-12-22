/**
 * Notification Service
 * Handles checking for maintenance, warranties, and projects that need attention
 * and creates notifications based on user preferences
 */

import { useNotificationStore, requestNotificationPermission } from '../store/notificationStore';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useProjectStore } from '../store/projectStore';
import { useWarrantyStore } from '../store/warrantyStore';

/**
 * Check maintenance tasks and create notifications
 */
export function checkMaintenanceNotifications() {
  const { tasks } = useMaintenanceStore.getState();
  const { preferences, addNotification } = useNotificationStore.getState();
  
  if (!preferences.maintenanceEnabled) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const task of tasks) {
    if (task.status !== 'pending') continue;
    
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if we should notify for this day
    if (preferences.maintenanceAdvanceDays.includes(daysUntilDue)) {
      const severity = daysUntilDue <= 0 ? 'urgent' : daysUntilDue <= 3 ? 'warning' : 'info';
      
      addNotification({
        type: 'maintenance',
        severity,
        title: daysUntilDue <= 0 
          ? 'Maintenance Overdue' 
          : `Maintenance Due in ${daysUntilDue} Day${daysUntilDue !== 1 ? 's' : ''}`,
        message: `${task.title}${task.category ? ` (${task.category})` : ''} is ${daysUntilDue <= 0 ? 'overdue' : `due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`}`,
        actionUrl: '/maintenance',
      });
    }
  }
}

/**
 * Check warranties and create notifications
 */
export function checkWarrantyNotifications() {
  const { getExpiringWarranties } = useWarrantyStore.getState();
  const { preferences, addNotification } = useNotificationStore.getState();
  
  if (!preferences.warrantyEnabled) return;
  
  const expiringWarranties = getExpiringWarranties(90); // Check next 90 days
  
  for (const warranty of expiringWarranties) {
    const endDate = new Date(warranty.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (preferences.warrantyAdvanceDays.includes(daysUntilExpiry)) {
      const severity = daysUntilExpiry <= 7 ? 'urgent' : daysUntilExpiry <= 30 ? 'warning' : 'info';
      
      addNotification({
        type: 'warranty',
        severity,
        title: `Warranty Expiring in ${daysUntilExpiry} Day${daysUntilExpiry !== 1 ? 's' : ''}`,
        message: `Warranty for ${warranty.itemName} expires on ${endDate.toLocaleDateString()}`,
        actionUrl: '/items',
      });
    }
  }
  
  // Also check inventory items with embedded warranties
  const { items } = useInventoryStore.getState();
  for (const item of items) {
    if (item.status !== 'active' || !item.warranty || !item.warranty.endDate) continue;
    
    const endDate = new Date(item.warranty.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (preferences.warrantyAdvanceDays.includes(daysUntilExpiry)) {
      const severity = daysUntilExpiry <= 7 ? 'urgent' : daysUntilExpiry <= 30 ? 'warning' : 'info';
      
      addNotification({
        type: 'warranty',
        severity,
        title: `Warranty Expiring in ${daysUntilExpiry} Day${daysUntilExpiry !== 1 ? 's' : ''}`,
        message: `Warranty for ${item.name} expires on ${endDate.toLocaleDateString()}`,
        actionUrl: '/items',
      });
    }
  }
}

/**
 * Check projects and create notifications
 */
export function checkProjectNotifications() {
  const { projects } = useProjectStore.getState();
  const { preferences, addNotification } = useNotificationStore.getState();
  
  if (!preferences.projectEnabled) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const project of projects) {
    if (project.status === 'completed' || project.status === 'cancelled') continue;
    
    // Check deadline
    if (project.endDate) {
      const endDate = new Date(project.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      const daysUntilDeadline = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (preferences.projectDeadlineAdvanceDays.includes(daysUntilDeadline)) {
        const severity = daysUntilDeadline <= 1 ? 'urgent' : daysUntilDeadline <= 7 ? 'warning' : 'info';
        
        addNotification({
          type: 'project',
          severity,
          title: `Project Deadline in ${daysUntilDeadline} Day${daysUntilDeadline !== 1 ? 's' : ''}`,
          message: `${project.name} deadline is ${daysUntilDeadline <= 0 ? 'overdue' : `in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''}`}`,
          actionUrl: '/projects',
        });
      }
    }
    
    // Check for stalled projects (no activity for 30+ days)
    if (project.status === 'in-progress' || project.status === 'planning') {
      const lastActivity = project.endDate ? new Date(project.endDate) : new Date(project.startDate || Date.now());
      const daysSinceActivity = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceActivity >= 30) {
        addNotification({
          type: 'project',
          severity: 'warning',
          title: 'Project May Be Stalled',
          message: `${project.name} hasn't been updated in ${daysSinceActivity} days`,
          actionUrl: '/projects',
        });
      }
    }
  }
}

/**
 * Run all notification checks
 */
export function runNotificationChecks() {
  checkMaintenanceNotifications();
  checkWarrantyNotifications();
  checkProjectNotifications();
}

/**
 * Initialize notification service
 * Should be called on app startup
 */
export function initNotificationService() {
  // Request browser notification permission if enabled
  const { preferences, updatePreferences } = useNotificationStore.getState();
  
  if (preferences.browserPushEnabled && !preferences.browserPushPermissionGranted) {
    requestNotificationPermission().then((granted) => {
      updatePreferences({ browserPushPermissionGranted: granted });
    });
  }
  
  // Run checks immediately
  runNotificationChecks();
  
  // Run checks daily at midnight
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    runNotificationChecks();
    // Then run every 24 hours
    setInterval(runNotificationChecks, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}
