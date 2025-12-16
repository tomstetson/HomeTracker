import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findReceiptMatches } from './imageAnalysis';
import { useDocumentStore } from '../store/documentStore';

vi.mock('../store/documentStore');
vi.mock('../store/aiSettingsStore', () => ({
  useAISettingsStore: {
    getState: vi.fn(() => ({
      settings: {
        activeProvider: 'openai',
        providers: {
          openai: { apiKey: 'test-key', enabled: true },
        },
      },
    })),
  },
}));

describe('Image Analysis - Receipt Matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find exact brand matches', async () => {
    (useDocumentStore.getState as any) = vi.fn(() => ({
      documents: [
        {
          id: 'doc1',
          category: 'receipt',
          detectedVendor: 'LG',
          aiExtracted: {
            vendor: { name: 'LG Electronics' },
            items: [{ name: 'TV', brand: 'LG', model: 'OLED55' }],
            receipt: { date: '2024-01-15', total: 1200 },
          },
        },
      ],
    }));

    const matches = await findReceiptMatches('LG TV', 'LG', 'OLED55', '2024-01-20');

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].matchScore).toBeGreaterThan(0.5);
  });

  it('should use fuzzy matching for brand variations', async () => {
    (useDocumentStore.getState as any) = vi.fn(() => ({
      documents: [
        {
          id: 'doc1',
          category: 'receipt',
          detectedVendor: 'L.G. Electronics',
          aiExtracted: {
            vendor: { name: 'L.G. Electronics' },
            receipt: { date: '2024-01-15', total: 1200 },
          },
        },
      ],
    }));

    const matches = await findReceiptMatches('TV', 'LG', undefined, '2024-01-20');

    // Should match despite brand name variation
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should consider date proximity', async () => {
    (useDocumentStore.getState as any) = vi.fn(() => ({
      documents: [
        {
          id: 'doc1',
          category: 'receipt',
          aiExtracted: {
            receipt: { date: '2024-01-15', total: 1200 },
          },
        },
      ],
    }));

    // Photo taken 10 days after receipt
    const matches = await findReceiptMatches('TV', 'Samsung', undefined, '2024-01-25');

    // Should boost match score due to date proximity
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should return empty array when no documents', async () => {
    (useDocumentStore.getState as any) = vi.fn(() => ({
      documents: [],
    }));

    const matches = await findReceiptMatches('TV', 'LG', undefined);

    expect(matches).toEqual([]);
  });

  it('should sort matches by score descending', async () => {
    (useDocumentStore.getState as any) = vi.fn(() => ({
      documents: [
        {
          id: 'doc1',
          category: 'receipt',
          detectedVendor: 'Samsung',
          aiExtracted: { receipt: { date: '2024-01-15', total: 1000 } },
        },
        {
          id: 'doc2',
          category: 'receipt',
          detectedVendor: 'LG',
          aiExtracted: { receipt: { date: '2024-01-15', total: 1200 } },
        },
      ],
    }));

    const matches = await findReceiptMatches('TV', 'LG', undefined);

    if (matches.length > 1) {
      expect(matches[0].matchScore).toBeGreaterThanOrEqual(matches[1].matchScore);
    }
  });
});
