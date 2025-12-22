import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all stores BEFORE importing the module under test
// vi.mock is hoisted, but the factory functions need to use vi.fn() inline
vi.mock('../store/notificationStore', () => ({
  useNotificationStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../store/maintenanceStore', () => ({
  useMaintenanceStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../store/warrantyStore', () => ({
  useWarrantyStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../store/inventoryStore', () => ({
  useInventoryStore: {
    getState: vi.fn(),
  },
}));

// Now import the module under test and the mocked stores
import {
  checkMaintenanceNotifications,
  checkWarrantyNotifications,
} from './notificationService';
import { useNotificationStore } from '../store/notificationStore';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { useWarrantyStore } from '../store/warrantyStore';
import { useInventoryStore } from '../store/inventoryStore';

// Mock function for addNotification
const mockAddNotification = vi.fn();

// Get mocked getState functions
const mockNotificationGetState = vi.mocked(useNotificationStore.getState);
const mockMaintenanceGetState = vi.mocked(useMaintenanceStore.getState);
const mockWarrantyGetState = vi.mocked(useWarrantyStore.getState);
const mockInventoryGetState = vi.mocked(useInventoryStore.getState);

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddNotification.mockClear();
  });

  describe('checkMaintenanceNotifications', () => {
    it('should create notification for task due today', () => {
      // Task due today (0 days) matches advanceDays array
      const today = new Date();
      
      const mockTasks = [{
        id: '1',
        title: 'Test Task',
        category: 'HVAC',
        priority: 'high' as const,
        dueDate: today.toISOString().split('T')[0],
        status: 'pending' as const,
        progress: 0,
        tags: [],
      }];

      // Set up mocks
      mockMaintenanceGetState.mockReturnValue({ tasks: mockTasks } as any);
      mockNotificationGetState.mockReturnValue({
        preferences: {
          maintenanceEnabled: true,
          maintenanceAdvanceDays: [7, 3, 1, 0], // 0 matches task due today
        },
        addNotification: mockAddNotification,
      } as any);

      checkMaintenanceNotifications();

      expect(mockAddNotification).toHaveBeenCalled();
      const callArgs = mockAddNotification.mock.calls[0][0];
      expect(callArgs.type).toBe('maintenance');
      expect(callArgs.severity).toBe('urgent'); // 0 days = urgent
    });

    it('should not create notification if feature disabled', () => {
      mockMaintenanceGetState.mockReturnValue({ tasks: [] } as any);
      mockNotificationGetState.mockReturnValue({
        preferences: {
          maintenanceEnabled: false,
        },
        addNotification: mockAddNotification,
      } as any);

      checkMaintenanceNotifications();

      expect(mockAddNotification).not.toHaveBeenCalled();
    });
  });

  describe('checkWarrantyNotifications', () => {
    it('should create notification for warranty expiring in 7 days', () => {
      // Warranty expiring in exactly 7 days matches advanceDays array
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 7);
      expiringDate.setHours(12, 0, 0, 0); // Set to midday to avoid timezone edge cases
      
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

      mockInventoryGetState.mockReturnValue({ items: mockItems } as any);
      mockWarrantyGetState.mockReturnValue({
        getExpiringWarranties: vi.fn(() => []),
      } as any);
      mockNotificationGetState.mockReturnValue({
        preferences: {
          warrantyEnabled: true,
          warrantyAdvanceDays: [30, 7], // 7 matches our warranty
        },
        addNotification: mockAddNotification,
      } as any);

      checkWarrantyNotifications();

      expect(mockAddNotification).toHaveBeenCalled();
      const callArgs = mockAddNotification.mock.calls[0][0];
      expect(callArgs.type).toBe('warranty');
      expect(callArgs.severity).toBe('urgent'); // 7 days = urgent for warranty
    });
  });
});
