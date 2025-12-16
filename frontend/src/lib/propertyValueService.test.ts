import { describe, it, expect } from 'vitest';
import {
  calculateAppreciationPercent,
  calculateAnnualizedAppreciation,
  getValueTrend,
} from './propertyValueService';

describe('Property Value Service', () => {
  describe('calculateAppreciationPercent', () => {
    it('should calculate appreciation percentage correctly', () => {
      const result = calculateAppreciationPercent(250000, 300000);
      expect(result).toBe(20); // 20% appreciation
    });

    it('should handle zero purchase price', () => {
      const result = calculateAppreciationPercent(0, 300000);
      expect(result).toBe(0);
    });

    it('should handle depreciation', () => {
      const result = calculateAppreciationPercent(300000, 250000);
      expect(result).toBeCloseTo(-16.67, 2); // Approximately -16.67% depreciation
    });
  });

  describe('calculateAnnualizedAppreciation', () => {
    it('should calculate annualized appreciation correctly', () => {
      const purchaseDate = '2020-01-01';
      const result = calculateAnnualizedAppreciation(250000, 300000, purchaseDate);
      
      // Should be positive (appreciation)
      expect(result).toBeGreaterThan(0);
    });

    it('should handle zero purchase price', () => {
      const result = calculateAnnualizedAppreciation(0, 300000, '2020-01-01');
      expect(result).toBe(0);
    });

    it('should return 0 for future purchase dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const result = calculateAnnualizedAppreciation(
        250000,
        300000,
        futureDate.toISOString().split('T')[0]
      );
      expect(result).toBe(0);
    });
  });

  describe('getValueTrend', () => {
    it('should detect upward trend', () => {
      const values = [
        { date: '2024-01-01', value: 250000 },
        { date: '2024-12-01', value: 300000 },
      ];

      const result = getValueTrend(values);
      expect(result.direction).toBe('up');
      expect(result.changePercent).toBeGreaterThan(0);
    });

    it('should detect downward trend', () => {
      const values = [
        { date: '2024-01-01', value: 300000 },
        { date: '2024-12-01', value: 250000 },
      ];

      const result = getValueTrend(values);
      expect(result.direction).toBe('down');
    });

    it('should detect stable trend', () => {
      const values = [
        { date: '2024-01-01', value: 250000 },
        { date: '2024-12-01', value: 251000 }, // Less than 1% change
      ];

      const result = getValueTrend(values);
      expect(result.direction).toBe('stable');
    });

    it('should handle single value', () => {
      const values = [{ date: '2024-01-01', value: 250000 }];
      const result = getValueTrend(values);
      
      expect(result.direction).toBe('stable');
      expect(result.changePercent).toBe(0);
    });

    it('should calculate period correctly', () => {
      const values = [
        { date: '2024-01-01', value: 250000 },
        { date: '2024-12-01', value: 300000 },
      ];

      const result = getValueTrend(values);
      expect(result.period).toContain('months');
    });
  });
});
