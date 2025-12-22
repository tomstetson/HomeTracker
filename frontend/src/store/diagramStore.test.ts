import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDiagramStore } from './diagramStore';

// Mock storage functions
vi.mock('../lib/storage', () => ({
  getCollection: vi.fn(() => null),
  saveCollection: vi.fn(),
}));

describe('diagramStore', () => {
  beforeEach(() => {
    useDiagramStore.setState({
      diagrams: [],
      isLoading: false,
      activeDiagramId: null,
    });
  });

  describe('addDiagram', () => {
    it('should add a diagram and return its ID', () => {
      const id = useDiagramStore.getState().addDiagram({
        name: 'Test Diagram',
        category: 'network',
        data: null,
      });

      expect(id).toBeDefined();
      expect(id).toContain('diagram-');
      
      const state = useDiagramStore.getState();
      expect(state.diagrams).toHaveLength(1);
      expect(state.diagrams[0].name).toBe('Test Diagram');
      expect(state.diagrams[0].createdAt).toBeDefined();
      expect(state.diagrams[0].updatedAt).toBeDefined();
    });
  });

  describe('updateDiagram', () => {
    it('should update diagram and set updatedAt', () => {
      useDiagramStore.setState({
        diagrams: [{
          id: 'test-1',
          name: 'Original',
          category: 'network',
          data: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }],
        isLoading: false,
        activeDiagramId: null,
      });

      useDiagramStore.getState().updateDiagram('test-1', { name: 'Updated' });
      
      const diagram = useDiagramStore.getState().diagrams[0];
      expect(diagram.name).toBe('Updated');
      expect(diagram.updatedAt).not.toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('deleteDiagram', () => {
    it('should delete a diagram', () => {
      useDiagramStore.setState({
        diagrams: [
          { id: '1', name: 'Diagram 1', category: 'network', data: null, createdAt: '', updatedAt: '' },
          { id: '2', name: 'Diagram 2', category: 'plumbing', data: null, createdAt: '', updatedAt: '' },
        ],
        isLoading: false,
        activeDiagramId: null,
      });

      useDiagramStore.getState().deleteDiagram('1');
      
      const state = useDiagramStore.getState();
      expect(state.diagrams).toHaveLength(1);
      expect(state.diagrams[0].id).toBe('2');
    });

    it('should clear activeDiagramId if deleted', () => {
      useDiagramStore.setState({
        diagrams: [
          { id: '1', name: 'Diagram 1', category: 'network', data: null, createdAt: '', updatedAt: '' },
        ],
        isLoading: false,
        activeDiagramId: '1',
      });

      useDiagramStore.getState().deleteDiagram('1');
      
      expect(useDiagramStore.getState().activeDiagramId).toBeNull();
    });
  });

  describe('getDiagram', () => {
    it('should return diagram by ID', () => {
      useDiagramStore.setState({
        diagrams: [
          { id: '1', name: 'Diagram 1', category: 'network', data: null, createdAt: '', updatedAt: '' },
          { id: '2', name: 'Diagram 2', category: 'plumbing', data: null, createdAt: '', updatedAt: '' },
        ],
        isLoading: false,
        activeDiagramId: null,
      });

      const diagram = useDiagramStore.getState().getDiagram('2');
      expect(diagram?.name).toBe('Diagram 2');
    });

    it('should return undefined for non-existent ID', () => {
      const diagram = useDiagramStore.getState().getDiagram('non-existent');
      expect(diagram).toBeUndefined();
    });
  });

  describe('setActiveDiagram', () => {
    it('should set active diagram ID', () => {
      useDiagramStore.getState().setActiveDiagram('test-id');
      expect(useDiagramStore.getState().activeDiagramId).toBe('test-id');
    });

    it('should clear active diagram when set to null', () => {
      useDiagramStore.setState({
        diagrams: [],
        isLoading: false,
        activeDiagramId: 'test-id',
      });

      useDiagramStore.getState().setActiveDiagram(null);
      expect(useDiagramStore.getState().activeDiagramId).toBeNull();
    });
  });

  describe('getDiagramsByCategory', () => {
    it('should filter diagrams by category', () => {
      useDiagramStore.setState({
        diagrams: [
          { id: '1', name: 'Network 1', category: 'network', data: null, createdAt: '', updatedAt: '' },
          { id: '2', name: 'Plumbing 1', category: 'plumbing', data: null, createdAt: '', updatedAt: '' },
          { id: '3', name: 'Network 2', category: 'network', data: null, createdAt: '', updatedAt: '' },
        ],
        isLoading: false,
        activeDiagramId: null,
      });

      const networkDiagrams = useDiagramStore.getState().getDiagramsByCategory('network');
      
      expect(networkDiagrams).toHaveLength(2);
      expect(networkDiagrams.every(d => d.category === 'network')).toBe(true);
    });
  });
});
