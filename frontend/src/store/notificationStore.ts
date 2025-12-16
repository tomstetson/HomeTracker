import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationChannel = 'email' | 'browser' | 'dashboard';
export type NotificationFrequency = 'immediate' | 'daily' | 'weekly';

export interface NotificationPreferences {
  // Maintenance notifications
  maintenanceEnabled: boolean;
  maintenanceChannels: NotificationChannel[];
  maintenanceAdvanceDays: number[]; // e.g., [7, 3, 1] = notify 7 days, 3 days, and 1 day before
  maintenanceQuietHours: { start: string; end: string }; // e.g., "22:00" to "08:00"
  
  // Warranty notifications
  warrantyEnabled: boolean;
  warrantyChannels: NotificationChannel[];
  warrantyAdvanceDays: number[]; // e.g., [30, 7] = notify 30 days and 7 days before expiration
  
  // Project notifications
  projectEnabled: boolean;
  projectChannels: NotificationChannel[];
  projectDeadlineAdvanceDays: number[]; // Notify before project deadlines
  
  // Email settings
  emailEnabled: boolean;
  emailAddress: string;
  emailFrequency: NotificationFrequency; // For digest mode
  
  // Browser push settings
  browserPushEnabled: boolean;
  browserPushPermissionGranted: boolean;
}

export interface Notification {
  id: string;
  type: 'maintenance' | 'warranty' | 'project' | 'system';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  actionUrl?: string; // Link to relevant page
  read: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface NotificationState {
  preferences: NotificationPreferences;
  notifications: Notification[];
  unreadCount: number;
  
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  getUnreadCount: () => number;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  maintenanceEnabled: true,
  maintenanceChannels: ['dashboard', 'browser'],
  maintenanceAdvanceDays: [7, 3, 1],
  maintenanceQuietHours: { start: '22:00', end: '08:00' },
  
  warrantyEnabled: true,
  warrantyChannels: ['dashboard', 'browser'],
  warrantyAdvanceDays: [30, 7],
  
  projectEnabled: true,
  projectChannels: ['dashboard'],
  projectDeadlineAdvanceDays: [7, 1],
  
  emailEnabled: false,
  emailAddress: '',
  emailFrequency: 'daily',
  
  browserPushEnabled: true,
  browserPushPermissionGranted: false,
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFERENCES,
      notifications: [],
      unreadCount: 0,

      updatePreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          read: false,
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
        
        // Show browser notification if enabled
        if (get().preferences.browserPushEnabled && 
            get().preferences.browserPushPermissionGranted &&
            notification.severity !== 'info') {
          showBrowserNotification(newNotification);
        }
      },

      markAsRead: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (notification && !notification.read) {
            return {
              notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
              ),
              unreadCount: Math.max(0, state.unreadCount - 1),
            };
          }
          return state;
        }),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      deleteNotification: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.read;
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        }),

      clearAllNotifications: () =>
        set({
          notifications: [],
          unreadCount: 0,
        }),

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'hometracker_notifications',
    }
  )
);

/**
 * Show browser push notification
 */
function showBrowserNotification(notification: Notification) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const icon = '/icon-192x192.png'; // Will be created with PWA manifest
    
    new Notification(notification.title, {
      body: notification.message,
      icon,
      badge: '/icon-192x192.png',
      tag: notification.id,
      requireInteraction: notification.severity === 'urgent',
    });
  }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

