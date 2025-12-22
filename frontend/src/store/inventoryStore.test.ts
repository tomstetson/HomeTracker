import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useInventoryStore } from './inventoryStore';

// Mock storage functions
vi.mock('../lib/storage', () => ({
  getCollection: vi.fn(() => null),
  saveCollection: vi.fn(),
}));

describe('inventoryStore', () => {
  beforeEach(() => {
    useInventoryStore.setState({
      items: [],
      categories: ['Electronics', 'Tools', 'Kitchen'],
      isLoading: false,
    });
  });

  describe('addItem', () => {
    it('should add an item to the store', () => {
      const item = {
        id: 'test-1',
        name: 'Test Item',
        category: 'Electronics',
        location: 'Office',
        condition: 'good' as const,
        photos: [],
        tags: [],
        status: 'active' as const,
      };

      useInventoryStore.getState().addItem(item);
      
      const state = useInventoryStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].name).toBe('Test Item');
    });
  });

  describe('updateItem', () => {
    it('should update an existing item', () => {
      useInventoryStore.setState({
        items: [{
          id: 'test-1',
          name: 'Original',
          category: 'Electronics',
          location: 'Office',
          condition: 'good' as const,
          photos: [],
          tags: [],
          status: 'active' as const,
        }],
        categories: ['Electronics'],
        isLoading: false,
      });

      useInventoryStore.getState().updateItem('test-1', { name: 'Updated' });
      
      expect(useInventoryStore.getState().items[0].name).toBe('Updated');
    });
  });

  describe('softDeleteItem', () => {
    it('should mark item as deleted', () => {
      useInventoryStore.setState({
        items: [{
          id: 'test-1',
          name: 'Test',
          category: 'Electronics',
          location: 'Office',
          condition: 'good' as const,
          photos: [],
          tags: [],
          status: 'active' as const,
        }],
        categories: [],
        isLoading: false,
      });

      useInventoryStore.getState().softDeleteItem('test-1');
      
      const item = useInventoryStore.getState().items[0];
      expect(item.status).toBe('deleted');
      expect(item.deletedAt).toBeDefined();
    });
  });

  describe('restoreItem', () => {
    it('should restore a deleted item', () => {
      useInventoryStore.setState({
        items: [{
          id: 'test-1',
          name: 'Test',
          category: 'Electronics',
          location: 'Office',
          condition: 'good' as const,
          photos: [],
          tags: [],
          status: 'deleted' as const,
          deletedAt: new Date().toISOString(),
        }],
        categories: [],
        isLoading: false,
      });

      useInventoryStore.getState().restoreItem('test-1');
      
      const item = useInventoryStore.getState().items[0];
      expect(item.status).toBe('active');
      expect(item.deletedAt).toBeUndefined();
    });
  });

  describe('sellItem', () => {
    it('should mark item as sold with sale record', () => {
      useInventoryStore.setState({
        items: [{
          id: 'test-1',
          name: 'Test',
          category: 'Electronics',
          location: 'Office',
          condition: 'good' as const,
          photos: [],
          tags: [],
          status: 'active' as const,
          purchasePrice: 500,
        }],
        categories: [],
        isLoading: false,
      });

      useInventoryStore.getState().sellItem('test-1', {
        saleDate: '2024-12-21',
        salePrice: 400,
        platform: 'eBay',
      });
      
      const item = useInventoryStore.getState().items[0];
      expect(item.status).toBe('sold');
      expect(item.sale?.salePrice).toBe(400);
    });
  });

  describe('query helpers', () => {
    beforeEach(() => {
      useInventoryStore.setState({
        items: [
          { id: '1', name: 'Active 1', category: 'Electronics', location: 'A', condition: 'good' as const, photos: [], tags: [], status: 'active' as const },
          { id: '2', name: 'Active 2', category: 'Tools', location: 'B', condition: 'good' as const, photos: [], tags: [], status: 'active' as const },
          { id: '3', name: 'Sold', category: 'Electronics', location: 'C', condition: 'good' as const, photos: [], tags: [], status: 'sold' as const },
          { id: '4', name: 'Deleted', category: 'Electronics', location: 'D', condition: 'good' as const, photos: [], tags: [], status: 'deleted' as const },
        ],
        categories: ['Electronics', 'Tools'],
        isLoading: false,
      });
    });

    it('should get active items only', () => {
      const active = useInventoryStore.getState().getActiveItems();
      expect(active).toHaveLength(2);
      expect(active.every(i => i.status === 'active')).toBe(true);
    });

    it('should get sold items only', () => {
      const sold = useInventoryStore.getState().getSoldItems();
      expect(sold).toHaveLength(1);
      expect(sold[0].name).toBe('Sold');
    });

    it('should get deleted items only', () => {
      const deleted = useInventoryStore.getState().getDeletedItems();
      expect(deleted).toHaveLength(1);
      expect(deleted[0].name).toBe('Deleted');
    });

    it('should search items by name', () => {
      const results = useInventoryStore.getState().searchItems('Active');
      expect(results).toHaveLength(2);
    });

    it('should filter items by category', () => {
      const results = useInventoryStore.getState().filterByCategory('Electronics');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Active 1');
    });
  });

  describe('category management', () => {
    it('should add a category', () => {
      useInventoryStore.getState().addCategory('New Category');
      expect(useInventoryStore.getState().categories).toContain('New Category');
    });

    it('should not add duplicate category', () => {
      useInventoryStore.setState({ items: [], categories: ['Existing'], isLoading: false });
      useInventoryStore.getState().addCategory('Existing');
      expect(useInventoryStore.getState().categories.filter(c => c === 'Existing')).toHaveLength(1);
    });

    it('should remove a category', () => {
      useInventoryStore.setState({ items: [], categories: ['A', 'B', 'C'], isLoading: false });
      useInventoryStore.getState().removeCategory('B');
      expect(useInventoryStore.getState().categories).toEqual(['A', 'C']);
    });
  });

  describe('stats', () => {
    it('should calculate total value of active items', () => {
      useInventoryStore.setState({
        items: [
          { id: '1', name: 'A', category: 'X', location: 'Y', condition: 'good' as const, photos: [], tags: [], status: 'active' as const, currentValue: 500 },
          { id: '2', name: 'B', category: 'X', location: 'Y', condition: 'good' as const, photos: [], tags: [], status: 'active' as const, currentValue: 300 },
          { id: '3', name: 'C', category: 'X', location: 'Y', condition: 'good' as const, photos: [], tags: [], status: 'sold' as const, currentValue: 1000 },
        ],
        categories: [],
        isLoading: false,
      });

      expect(useInventoryStore.getState().getTotalValue()).toBe(800);
    });
  });
});
