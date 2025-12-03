import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

export interface Subtask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  assignedTo?: string; // Vendor name or "DIY"
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
  order: number;
}

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
  subtasks?: Subtask[];
}

const DEFAULT_PROJECTS: Project[] = [
    {
      id: '1',
      name: 'Kitchen Remodel',
      description: 'Complete kitchen renovation including new cabinets, countertops, and appliances',
      status: 'completed',
      priority: 'high',
      budget: 25000,
      actualCost: 18500,
      progress: 65,
      category: 'Renovation',
      tags: ['kitchen', 'major'],
      startDate: '2024-10-01',
      endDate: '2025-01-01',
      subtasks: [
        { id: '1-1', title: 'Demo existing cabinets', completed: true, order: 1 },
        { id: '1-2', title: 'Install new cabinets', completed: true, assignedTo: 'ABC Contractors', estimatedCost: 8000, order: 2 },
        { id: '1-3', title: 'Install countertops', completed: true, assignedTo: 'ABC Contractors', estimatedCost: 5000, order: 3 },
        { id: '1-4', title: 'Plumbing rough-in', completed: true, assignedTo: 'Joe\'s Plumbing', estimatedCost: 1500, order: 4 },
        { id: '1-5', title: 'Electrical work', completed: false, assignedTo: 'Smith Electric', estimatedCost: 2000, order: 5 },
        { id: '1-6', title: 'Install appliances', completed: false, order: 6 },
        { id: '1-7', title: 'Final inspection', completed: false, order: 7 },
      ],
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
      subtasks: [
        { id: '3-1', title: 'Get quotes from contractors', completed: true, order: 1 },
        { id: '3-2', title: 'Select contractor', completed: false, order: 2 },
        { id: '3-3', title: 'Schedule installation', completed: false, order: 3 },
        { id: '3-4', title: 'Remove old unit', completed: false, order: 4 },
        { id: '3-5', title: 'Install new unit', completed: false, order: 5 },
        { id: '3-6', title: 'Final inspection', completed: false, order: 6 },
      ],
    },
    {
      id: '4',
      name: 'Bathroom Tile',
      description: 'Retile master bathroom shower',
      status: 'in-progress',
      priority: 'medium',
      budget: 2500,
      actualCost: 2800,
      progress: 100,
      category: 'Bathroom',
      tags: ['bathroom', 'tile'],
      startDate: '2024-09-14',
      endDate: '2024-10-19',
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
  // Subtask methods
  addSubtask: (projectId: string, subtask: Omit<Subtask, 'id' | 'order'>) => void;
  updateSubtask: (projectId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (projectId: string, subtaskId: string) => void;
  toggleSubtask: (projectId: string, subtaskId: string) => void;
  reorderSubtasks: (projectId: string, subtaskIds: string[]) => void;
  getSubtaskProgress: (project: Project) => { completed: number; total: number; percentage: number };
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

  // Subtask methods
  addSubtask: (projectId, subtask) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const existingSubtasks = p.subtasks || [];
        const newSubtask: Subtask = {
          ...subtask,
          id: `${projectId}-${Date.now()}`,
          completed: false,
          order: existingSubtasks.length + 1,
        };
        return { ...p, subtasks: [...existingSubtasks, newSubtask] };
      }),
    }));
    get().saveToStorage();
  },

  updateSubtask: (projectId, subtaskId, updates) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId || !p.subtasks) return p;
        return {
          ...p,
          subtasks: p.subtasks.map((s) => (s.id === subtaskId ? { ...s, ...updates } : s)),
        };
      }),
    }));
    get().saveToStorage();
  },

  deleteSubtask: (projectId, subtaskId) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId || !p.subtasks) return p;
        return {
          ...p,
          subtasks: p.subtasks.filter((s) => s.id !== subtaskId),
        };
      }),
    }));
    get().saveToStorage();
  },

  toggleSubtask: (projectId, subtaskId) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId || !p.subtasks) return p;
        return {
          ...p,
          subtasks: p.subtasks.map((s) => 
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          ),
        };
      }),
    }));
    get().saveToStorage();
  },

  reorderSubtasks: (projectId, subtaskIds) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId || !p.subtasks) return p;
        const reordered = subtaskIds.map((id, index) => {
          const subtask = p.subtasks!.find((s) => s.id === id);
          return subtask ? { ...subtask, order: index + 1 } : null;
        }).filter(Boolean) as Subtask[];
        return { ...p, subtasks: reordered };
      }),
    }));
    get().saveToStorage();
  },

  getSubtaskProgress: (project) => {
    if (!project.subtasks || project.subtasks.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    const completed = project.subtasks.filter((s) => s.completed).length;
    const total = project.subtasks.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
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
