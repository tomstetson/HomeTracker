import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

export interface Diagram {
  id: string;
  name: string;
  description?: string;
  category: 'network' | 'plumbing' | 'electrical' | 'floor-plan' | 'hvac' | 'yard' | 'other';
  data: any; // Excalidraw scene data
  thumbnail?: string; // Base64 thumbnail for preview
  createdAt: string;
  updatedAt: string;
}

export const DIAGRAM_CATEGORIES = [
  { value: 'network', label: 'Network Diagram', icon: '🌐' },
  { value: 'plumbing', label: 'Plumbing Layout', icon: '🚿' },
  { value: 'electrical', label: 'Electrical Layout', icon: '⚡' },
  { value: 'floor-plan', label: 'Floor Plan', icon: '🏠' },
  { value: 'hvac', label: 'HVAC System', icon: '❄️' },
  { value: 'yard', label: 'Yard / Landscape', icon: '🌳' },
  { value: 'other', label: 'Other', icon: '📋' },
];

interface DiagramStore {
  diagrams: Diagram[];
  isLoading: boolean;
  activeDiagramId: string | null;
  
  // CRUD operations
  addDiagram: (diagram: Omit<Diagram, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDiagram: (id: string, updates: Partial<Diagram>) => void;
  deleteDiagram: (id: string) => void;
  getDiagram: (id: string) => Diagram | undefined;
  
  // Active diagram
  setActiveDiagram: (id: string | null) => void;
  
  // Filtering
  getDiagramsByCategory: (category: Diagram['category']) => Diagram[];
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  diagrams: [],
  isLoading: true,
  activeDiagramId: null,

  addDiagram: (diagramData) => {
    const id = `diagram-${Date.now()}`;
    const now = new Date().toISOString();
    const newDiagram: Diagram = {
      ...diagramData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ diagrams: [...state.diagrams, newDiagram] }));
    get().saveToStorage();
    return id;
  },

  updateDiagram: (id, updates) => {
    set((state) => ({
      diagrams: state.diagrams.map((d) =>
        d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
      ),
    }));
    get().saveToStorage();
  },

  deleteDiagram: (id) => {
    set((state) => ({
      diagrams: state.diagrams.filter((d) => d.id !== id),
      activeDiagramId: state.activeDiagramId === id ? null : state.activeDiagramId,
    }));
    get().saveToStorage();
  },

  getDiagram: (id) => {
    return get().diagrams.find((d) => d.id === id);
  },

  setActiveDiagram: (id) => {
    set({ activeDiagramId: id });
  },

  getDiagramsByCategory: (category) => {
    return get().diagrams.filter((d) => d.category === category);
  },

  loadFromStorage: () => {
    try {
      const stored = getCollection('diagrams') as Diagram[] | null;
      if (stored && Array.isArray(stored)) {
        set({ diagrams: stored, isLoading: false });
      } else {
        set({ diagrams: [], isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load diagrams:', error);
      set({ diagrams: [], isLoading: false });
    }
  },

  saveToStorage: () => {
    try {
      const diagrams = get().diagrams;
      saveCollection('diagrams', diagrams);
    } catch (error) {
      console.error('Failed to save diagrams:', error);
    }
  },
}));

// Load on initialization
useDiagramStore.getState().loadFromStorage();









