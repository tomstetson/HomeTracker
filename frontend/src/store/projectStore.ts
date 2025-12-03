import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'backlog' | 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  budget?: number;
  actualCost?: number;
  startDate?: string;
  endDate?: string;
  progress: number;
  category: string;
  tags: string[];
}

const DEFAULT_PROJECTS: Project[] = [
    {
      id: '1',
      name: 'Kitchen Remodel',
      description: 'Complete kitchen renovation including new cabinets, countertops, and appliances',
      status: 'in-progress',
      priority: 'high',
      budget: 25000,
      actualCost: 18500,
      progress: 65,
      category: 'Renovation',
      tags: ['kitchen', 'major'],
      startDate: '2024-11-01',
      endDate: '2025-02-01',
    },
    {
      id: '2',
      name: 'Deck Repair',
      description: 'Fix damaged deck boards and restain',
      status: 'backlog',
      priority: 'medium',
      budget: 3000,
      progress: 0,
      category: 'Outdoor',
      tags: ['deck', 'maintenance'],
    },
    {
      id: '3',
      name: 'HVAC Upgrade',
      description: 'Replace old HVAC system with energy-efficient model',
      status: 'planning',
      priority: 'high',
      budget: 8000,
      progress: 15,
      category: 'HVAC',
      tags: ['hvac', 'energy'],
    },
    {
      id: '4',
      name: 'Bathroom Tile',
      description: 'Retile master bathroom shower',
      status: 'completed',
      priority: 'medium',
      budget: 2500,
      actualCost: 2800,
      progress: 100,
      category: 'Bathroom',
      tags: ['bathroom', 'tile'],
      startDate: '2024-09-15',
      endDate: '2024-10-20',
    },
];

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  moveProject: (id: string, newStatus: Project['status']) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: true,
  
  setProjects: (projects) => {
    set({ projects });
    get().saveToStorage();
  },
  
  addProject: (project) => {
    set((state) => ({ projects: [...state.projects, project] }));
    get().saveToStorage();
  },
  
  updateProject: (id, updates) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    get().saveToStorage();
  },
  
  deleteProject: (id) => {
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
    get().saveToStorage();
  },
  
  moveProject: (id, newStatus) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
    }));
    get().saveToStorage();
  },
  
  loadFromStorage: () => {
    try {
      const stored = getCollection('projects');
      if (stored && stored.length > 0) {
        set({ projects: stored, isLoading: false });
      } else {
        set({ projects: DEFAULT_PROJECTS, isLoading: false });
        get().saveToStorage();
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({ projects: DEFAULT_PROJECTS, isLoading: false });
    }
  },
  
  saveToStorage: () => {
    try {
      const projects = get().projects;
      saveCollection('projects', projects);
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  },
}));

// Load data on initialization
useProjectStore.getState().loadFromStorage();

