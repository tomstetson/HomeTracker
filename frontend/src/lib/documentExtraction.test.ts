import { describe, it, expect } from 'vitest';
import { suggestDocumentLinks } from './documentExtraction';

describe('Document Extraction', () => {
  describe('suggestDocumentLinks', () => {
    it('should suggest receipt to warranty links', () => {
      const sourceDoc = {
        id: 'doc1',
        category: 'receipt' as const,
        name: 'Receipt',
        aiExtracted: {
          vendor: { name: 'Home Depot' },
          receipt: { date: '2024-01-15', total: 500 },
          items: [{ name: 'Water Heater', brand: 'Rheem' }],
        },
      };

      const allDocuments = [
        {
          id: 'doc2',
          category: 'warranty' as const,
          name: 'Warranty',
          aiExtracted: {
            warranty: {
              provider: 'Home Depot',
              startDate: '2024-01-16',
              endDate: '2027-01-16',
            },
          },
        },
      ];

      const suggestions = suggestDocumentLinks(sourceDoc, allDocuments);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].linkType).toBe('receipt_to_warranty');
      expect(suggestions[0].targetDocId).toBe('doc2');
    });

    it('should not suggest links for unrelated documents', () => {
      const sourceDoc = {
        id: 'doc1',
        category: 'receipt' as const,
        name: 'Receipt',
        aiExtracted: {
          vendor: { name: 'Home Depot' },
          receipt: { date: '2024-01-15', total: 500 },
        },
      };

      const allDocuments = [
        {
          id: 'doc2',
          category: 'warranty' as const,
          name: 'Warranty',
          aiExtracted: {
            warranty: {
              provider: 'Different Store',
              startDate: '2023-01-01',
              endDate: '2026-01-01',
            },
          },
        },
      ];

      const suggestions = suggestDocumentLinks(sourceDoc, allDocuments);

      // Should have low or no confidence
      const highConfidence = suggestions.filter(s => s.confidence > 0.5);
      expect(highConfidence.length).toBe(0);
    });

    it('should handle documents without extracted data', () => {
      const sourceDoc = {
        id: 'doc1',
        category: 'receipt' as const,
        name: 'Receipt',
      };

      const allDocuments = [
        {
          id: 'doc2',
          category: 'warranty' as const,
          name: 'Warranty',
        },
      ];

      const suggestions = suggestDocumentLinks(sourceDoc, allDocuments);
      expect(suggestions).toEqual([]);
    });
  });
});

