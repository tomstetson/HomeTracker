import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkMaintenanceNotifications,
  checkWarrantyNotifications,
} from './notificationService';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { useWarrantyStore } from '../store/warrantyStore';
import { useNotificationStore } from '../store/notificationStore';
import { useInventoryStore } from '../store/inventoryStore';

// Mock all stores
const mockAddNotification = vi.fn();

// Create mock functions that can be reassigned
const mockNotificationGetState = vi.fn();
const mockMaintenanceGetState = vi.fn();
const mockWarrantyGetState = vi.fn();
const mockInventoryGetState = vi.fn();

vi.mock('../store/notificationStore', () => {
  return {
    useNotificationStore: {
      getState: mockNotificationGetState,
    },
  };
});

vi.mock('../store/maintenanceStore', () => {
  return {
    useMaintenanceStore: {
      getState: mockMaintenanceGetState,
    },
  };
});

vi.mock('../store/warrantyStore', () => {
  return {
    useWarrantyStore: {
      getState: mockWarrantyGetState,
    },
  };
});

vi.mock('../store/inventoryStore', () => {
  return {
    useInventoryStore: {
      getState: mockInventoryGetState,
    },
  };
});

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddNotification.mockClear();
    mockNotificationGetState.mockClear();
    mockMaintenanceGetState.mockClear();
    mockWarrantyGetState.mockClear();
    mockInventoryGetState.mockClear();
  });

  describe('checkMaintenanceNotifications', () => {
    it('should create notification for overdue task', () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 1);
      
      const mockTasks = [{
        id: '1',
        title: 'Test Task',
        category: 'HVAC',
        priority: 'high' as const,
        dueDate: overdueDate.toISOString().split('T')[0],
        status: 'pending' as const,
        progress: 0,
        tags: [],
      }];

      // Set up mocks
      mockMaintenanceGetState.mockReturnValue({ tasks: mockTasks });
      mockNotificationGetState.mockReturnValue({
        preferences: {
          maintenanceEnabled: true,
          maintenanceAdvanceDays: [7, 3, 1, 0],
        },
        addNotification: mockAddNotification,
      });

      checkMaintenanceNotifications();

      expect(mockAddNotification).toHaveBeenCalled();
      const callArgs = mockAddNotification.mock.calls[0][0];
      expect(callArgs.type).toBe('maintenance');
      expect(callArgs.severity).toBe('urgent');
      expect(callArgs.title).toContain('Overdue');
    });

    it('should not create notification if feature disabled', () => {
      mockMaintenanceGetState.mockReturnValue({ tasks: [] });
      mockNotificationGetState.mockReturnValue({
        preferences: {
          maintenanceEnabled: false,
        },
        addNotification: mockAddNotification,
      });

      checkMaintenanceNotifications();

      expect(mockAddNotification).not.toHaveBeenCalled();
    });
  });

  describe('checkWarrantyNotifications', () => {
    it('should create notification for expiring warranty', () => {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 7);
      
      const mockItems = [{
        id: '1',
        name: 'Test Item',
        category: 'Appliances',
        location: 'Kitchen',
        condition: 'good' as const,
        status: 'active' as const,
        photos: [],
        tags: [],
        warranty: {
          provider: 'Test Provider',
          startDate: new Date().toISOString().split('T')[0],
          endDate: expiringDate.toISOString().split('T')[0],
          coverage: 'Full',
        },
      }];

      mockInventoryGetState.mockReturnValue({ items: mockItems });
      mockWarrantyGetState.mockReturnValue({
        getExpiringWarranties: vi.fn(() => []),
      });
      mockNotificationGetState.mockReturnValue({
        preferences: {
          warrantyEnabled: true,
          warrantyAdvanceDays: [30, 7],
        },
        addNotification: mockAddNotification,
      });

      checkWarrantyNotifications();

      expect(mockAddNotification).toHaveBeenCalled();
      const callArgs = mockAddNotification.mock.calls[0][0];
      expect(callArgs.type).toBe('warranty');
      expect(callArgs.severity).toBe('urgent');
    });
  });
});
