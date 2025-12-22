import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from './notificationStore';

describe('Notification Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useNotificationStore.getState().clearAllNotifications();
    useNotificationStore.getState().updatePreferences({
      maintenanceEnabled: true,
      maintenanceChannels: ['dashboard'],
      maintenanceAdvanceDays: [7, 3, 1],
      warrantyEnabled: true,
      warrantyChannels: ['dashboard'],
      warrantyAdvanceDays: [30, 7],
      projectEnabled: true,
      projectChannels: ['dashboard'],
      projectDeadlineAdvanceDays: [7, 1],
      emailEnabled: false,
      emailAddress: '',
      emailFrequency: 'daily',
      browserPushEnabled: false,
      browserPushPermissionGranted: false,
    });
  });

  it('should add notification', () => {
    useNotificationStore.getState().addNotification({
      type: 'maintenance',
      severity: 'warning',
      title: 'Test Notification',
      message: 'This is a test',
    });

    const { notifications, unreadCount } = useNotificationStore.getState();
    expect(notifications.length).toBe(1);
    expect(notifications[0].title).toBe('Test Notification');
    expect(notifications[0].read).toBe(false);
    expect(unreadCount).toBe(1);
  });

  it('should mark notification as read', () => {
    useNotificationStore.getState().addNotification({
      type: 'maintenance',
      severity: 'warning',
      title: 'Test',
      message: 'Test',
    });

    const { notifications } = useNotificationStore.getState();
    const notificationId = notifications[0].id;
    
    useNotificationStore.getState().markAsRead(notificationId);

    const { notifications: updatedNotifications, unreadCount } = useNotificationStore.getState();
    expect(updatedNotifications[0].read).toBe(true);
    expect(unreadCount).toBe(0);
  });

  it('should delete notification', () => {
    useNotificationStore.getState().addNotification({
      type: 'maintenance',
      severity: 'warning',
      title: 'Test',
      message: 'Test',
    });

    const { notifications } = useNotificationStore.getState();
    const notificationId = notifications[0].id;
    
    useNotificationStore.getState().deleteNotification(notificationId);

    const { notifications: updatedNotifications } = useNotificationStore.getState();
    expect(updatedNotifications.length).toBe(0);
  });

  it('should mark all as read', () => {
    useNotificationStore.getState().addNotification({ type: 'maintenance', severity: 'info', title: 'Test 1', message: 'Test' });
    useNotificationStore.getState().addNotification({ type: 'warranty', severity: 'warning', title: 'Test 2', message: 'Test' });

    useNotificationStore.getState().markAllAsRead();

    const { notifications, unreadCount } = useNotificationStore.getState();
    expect(notifications.every(n => n.read)).toBe(true);
    expect(unreadCount).toBe(0);
  });

  it('should update preferences', () => {
    useNotificationStore.getState().updatePreferences({ maintenanceEnabled: false });

    const { preferences } = useNotificationStore.getState();
    expect(preferences.maintenanceEnabled).toBe(false);
  });

  it('should calculate unread count correctly', () => {
    useNotificationStore.getState().addNotification({ type: 'maintenance', severity: 'info', title: 'Test 1', message: 'Test' });
    useNotificationStore.getState().addNotification({ type: 'maintenance', severity: 'info', title: 'Test 2', message: 'Test' });
    useNotificationStore.getState().addNotification({ type: 'maintenance', severity: 'info', title: 'Test 3', message: 'Test' });

    expect(useNotificationStore.getState().getUnreadCount()).toBe(3);
  });
});

