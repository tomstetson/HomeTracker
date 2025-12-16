import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateMaintenanceRecommendations,
  predictMaintenanceIssues,
  optimizeMaintenanceSchedule,
} from './maintenanceAutomation';
import { useInventoryStore } from '../store/inventoryStore';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { useAISettingsStore } from '../store/aiSettingsStore';
import { sendPrompt, isAIReady } from './aiService';

// Mock dependencies
vi.mock('./aiService', async () => {
  const actual = await vi.importActual('./aiService');
  return {
    ...actual,
    isAIReady: vi.fn(() => ({ ready: true, error: undefined })),
    sendPrompt: vi.fn(),
  };
});
vi.mock('../store/inventoryStore');
vi.mock('../store/maintenanceStore');
vi.mock('../store/aiSettingsStore');
vi.mock('./homeContext', () => ({
  buildHomeContext: vi.fn(() => ({})),
}));

describe('Maintenance Automation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (useAISettingsStore.getState as any) = vi.fn(() => ({
      isFeatureEnabled: vi.fn((feature: string) => feature === 'enableMaintenanceAutomation'),
    }));
    
    (useInventoryStore.getState as any) = vi.fn(() => ({
      items: [
        {
          id: '1',
          name: 'Refrigerator',
          brand: 'LG',
          purchaseDate: '2020-01-01',
          location: 'Kitchen',
          status: 'active',
        },
      ],
    }));
    
    (useMaintenanceStore.getState as any) = vi.fn(() => ({
      tasks: [],
    }));
    
    (isAIReady as any).mockReturnValue({ ready: true, error: undefined });
  });

  describe('generateMaintenanceRecommendations', () => {
    it('should generate recommendations when AI is enabled', async () => {
      const mockRecommendations = [
        {
          title: 'Replace HVAC Filter',
          description: 'Quarterly filter replacement',
          category: 'HVAC',
          priority: 'medium' as const,
          suggestedFrequency: 'quarterly' as const,
          reasoning: 'Standard maintenance schedule',
        },
      ];

      (sendPrompt as any).mockResolvedValue({
        success: true,
        content: JSON.stringify(mockRecommendations),
      });

      const result = await generateMaintenanceRecommendations();

      expect(result.success).toBe(true);
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].title).toBe('Replace HVAC Filter');
    });

    it('should return error when AI is not configured', async () => {
      (useAISettingsStore.getState as any) = vi.fn(() => ({
        isFeatureEnabled: vi.fn(() => false),
      }));
      (isAIReady as any).mockReturnValue({ ready: true, error: undefined });

      const result = await generateMaintenanceRecommendations();

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should handle API errors gracefully', async () => {
      (sendPrompt as any).mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      const result = await generateMaintenanceRecommendations();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('predictMaintenanceIssues', () => {
    it('should predict maintenance issues for older items', async () => {
      const mockPredictions = [
        {
          itemId: '1',
          itemName: 'Refrigerator',
          predictedIssue: 'Compressor may fail',
          predictedDate: '2025-06-01',
          confidence: 0.75,
          recommendedAction: 'Schedule inspection',
          reasoning: 'Item is 5 years old',
        },
      ];

      (sendPrompt as any).mockResolvedValue({
        success: true,
        content: JSON.stringify(mockPredictions),
      });

      const result = await predictMaintenanceIssues();

      expect(result.success).toBe(true);
      expect(result.predictions).toHaveLength(1);
      expect(result.predictions[0].confidence).toBe(0.75);
    });

    it('should return empty predictions for new items', async () => {
      (useInventoryStore.getState as any) = vi.fn(() => ({
        items: [
          {
            id: '1',
            name: 'New Refrigerator',
            purchaseDate: new Date().toISOString().split('T')[0],
          },
        ],
      }));

      const result = await predictMaintenanceIssues();

      expect(result.success).toBe(true);
      expect(result.predictions).toHaveLength(0);
    });
  });

  describe('optimizeMaintenanceSchedule', () => {
    it('should suggest optimal scheduling', async () => {
      const mockSuggestions = [
        {
          taskIds: ['1', '2'],
          suggestedDate: '2024-12-20',
          reasoning: 'Group HVAC tasks together',
          estimatedSavings: 50,
        },
      ];

      (useMaintenanceStore.getState as any) = vi.fn(() => ({
        tasks: [
          { id: '1', title: 'Filter Change', status: 'pending' },
          { id: '2', title: 'Duct Cleaning', status: 'pending' },
        ],
      }));

      (sendPrompt as any).mockResolvedValue({
        success: true,
        content: JSON.stringify(mockSuggestions),
      });

      const result = await optimizeMaintenanceSchedule();

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].estimatedSavings).toBe(50);
    });

    it('should return empty suggestions when no pending tasks', async () => {
      (useMaintenanceStore.getState as any) = vi.fn(() => ({
        tasks: [],
      }));

      const result = await optimizeMaintenanceSchedule();

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(0);
    });
  });
});

