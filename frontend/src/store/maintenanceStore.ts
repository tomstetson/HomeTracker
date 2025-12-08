import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

export interface MaintenanceTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  dueDate: string;
  completedDate?: string;
  recurrence?: 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  assignedTo?: string;
  relatedItem?: string;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
  
  // Link to inventory items for part tracking
  linkedInventoryId?: string;           // Primary appliance this task is for
  requiredPartIds?: string[];           // Inventory IDs of parts needed for this task
  partStorageHint?: string;             // Quick reference: "Spares in: Garage cabinet"
}

const DEFAULT_TASKS: MaintenanceTask[] = [
  {
    id: '1',
    title: 'Replace HVAC Filter',
    description: 'Change air filter in main HVAC system',
    category: 'HVAC',
    priority: 'high',
    status: 'pending',
    dueDate: '2024-12-15',
    recurrence: 'quarterly',
    estimatedCost: 25,
    assignedTo: 'Homeowner',
  },
  {
    id: '2',
    title: 'Clean Gutters',
    description: 'Remove leaves and debris from gutters',
    category: 'Exterior',
    priority: 'medium',
    status: 'pending',
    dueDate: '2024-12-10',
    recurrence: 'quarterly',
    estimatedCost: 150,
  },
  {
    id: '3',
    title: 'Test Smoke Detectors',
    description: 'Test all smoke and CO detectors',
    category: 'Safety',
    priority: 'high',
    status: 'overdue',
    dueDate: '2024-11-15',
    recurrence: 'monthly',
    estimatedCost: 0,
  },
  {
    id: '4',
    title: 'Service Water Heater',
    description: 'Annual water heater flush and inspection',
    category: 'Plumbing',
    priority: 'medium',
    status: 'completed',
    dueDate: '2024-10-01',
    completedDate: '2024-09-28',
    recurrence: 'yearly',
    actualCost: 120,
    notes: 'All good, no issues found',
  },
];

interface MaintenanceStore {
  tasks: MaintenanceTask[];
  isLoading: boolean;
  setTasks: (tasks: MaintenanceTask[]) => void;
  addTask: (task: MaintenanceTask) => void;
  updateTask: (id: string, updates: Partial<MaintenanceTask>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string, actualCost?: number, notes?: string) => void;
  getUpcomingTasks: () => MaintenanceTask[];
  getOverdueTasks: () => MaintenanceTask[];
  getTasksByStatus: (status: MaintenanceTask['status']) => MaintenanceTask[];
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useMaintenanceStore = create<MaintenanceStore>((set, get) => ({
  tasks: [],
  isLoading: true,
  
  setTasks: (tasks) => {
    set({ tasks });
    get().saveToStorage();
  },
  
  addTask: (task) => {
    set((state) => ({ tasks: [...state.tasks, task] }));
    get().saveToStorage();
  },
  
  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)),
    }));
    get().saveToStorage();
  },
  
  deleteTask: (id) => {
    set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
    get().saveToStorage();
  },
  
  completeTask: (id, actualCost, notes) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status: 'completed' as const,
              completedDate: new Date().toISOString().split('T')[0],
              actualCost,
              notes: notes || task.notes,
            }
          : task
      ),
    }));
    get().saveToStorage();
  },
  
  getUpcomingTasks: () => {
    const tasks = get().tasks;
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return tasks.filter((task) => {
      const dueDate = new Date(task.dueDate);
      return task.status === 'pending' && dueDate <= thirtyDaysFromNow && dueDate >= today;
    });
  },
  
  getOverdueTasks: () => {
    const tasks = get().tasks;
    const today = new Date();
    return tasks.filter((task) => {
      const dueDate = new Date(task.dueDate);
      return task.status !== 'completed' && dueDate < today;
    });
  },
  
  getTasksByStatus: (status) => {
    const tasks = get().tasks;
    return tasks.filter((task) => task.status === status);
  },
  
  loadFromStorage: () => {
    try {
      const stored = getCollection('maintenanceTasks');
      if (stored && stored.length > 0) {
        set({ tasks: stored, isLoading: false });
      } else {
        set({ tasks: DEFAULT_TASKS, isLoading: false });
        get().saveToStorage();
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      set({ tasks: DEFAULT_TASKS, isLoading: false });
    }
  },
  
  saveToStorage: () => {
    try {
      const tasks = get().tasks;
      saveCollection('maintenanceTasks', tasks);
    } catch (error) {
      console.error('Failed to save tasks:', error);
    }
  },
}));

// Load data on initialization
useMaintenanceStore.getState().loadFromStorage();
