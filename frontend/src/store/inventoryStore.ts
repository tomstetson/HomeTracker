import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  location: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  warrantyExpiration?: string;
  notes?: string;
  photos: string[];
  tags: string[];
}

const DEFAULT_ITEMS: InventoryItem[] = [
  {
    id: '1',
    name: 'Samsung Refrigerator',
    category: 'Kitchen Appliances',
    brand: 'Samsung',
    modelNumber: 'RF28R7351SR',
    serialNumber: 'ABC123456',
    location: 'Kitchen',
    purchaseDate: '2023-05-15',
    purchasePrice: 2499,
    currentValue: 2000,
    condition: 'excellent',
    warrantyExpiration: '2025-05-15',
    notes: 'French door model with ice maker',
    photos: [],
    tags: ['appliance', 'kitchen'],
  },
  {
    id: '2',
    name: 'LG Washer',
    category: 'Laundry',
    brand: 'LG',
    modelNumber: 'WM4000HWA',
    location: 'Laundry Room',
    purchaseDate: '2022-08-20',
    purchasePrice: 899,
    currentValue: 650,
    condition: 'good',
    warrantyExpiration: '2023-08-20',
    notes: 'Front load, energy efficient',
    photos: [],
    tags: ['appliance', 'laundry'],
  },
  {
    id: '3',
    name: 'Nest Thermostat',
    category: 'HVAC',
    brand: 'Google Nest',
    modelNumber: 'T3007ES',
    location: 'Hallway',
    purchaseDate: '2023-11-01',
    purchasePrice: 249,
    currentValue: 200,
    condition: 'excellent',
    notes: 'Smart thermostat with learning capability',
    photos: [],
    tags: ['smart-home', 'hvac'],
  },
];

interface InventoryStore {
  items: InventoryItem[];
  isLoading: boolean;
  setItems: (items: InventoryItem[]) => void;
  addItem: (item: InventoryItem) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  searchItems: (query: string) => InventoryItem[];
  filterByCategory: (category: string) => InventoryItem[];
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  isLoading: true,
  
  setItems: (items) => {
    set({ items });
    get().saveToStorage();
  },
  
  addItem: (item) => {
    set((state) => ({ items: [...state.items, item] }));
    get().saveToStorage();
  },
  
  updateItem: (id, updates) => {
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
    get().saveToStorage();
  },
  
  deleteItem: (id) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    get().saveToStorage();
  },
  
  searchItems: (query) => {
    const items = get().items;
    const lowerQuery = query.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery) ||
        item.brand?.toLowerCase().includes(lowerQuery) ||
        item.location.toLowerCase().includes(lowerQuery)
    );
  },
  
  filterByCategory: (category) => {
    const items = get().items;
    return items.filter((item) => item.category === category);
  },
  
  loadFromStorage: () => {
    try {
      const stored = getCollection('items');
      if (stored && stored.length > 0) {
        set({ items: stored, isLoading: false });
      } else {
        // First time - load default items
        set({ items: DEFAULT_ITEMS, isLoading: false });
        get().saveToStorage();
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      set({ items: DEFAULT_ITEMS, isLoading: false });
    }
  },
  
  saveToStorage: () => {
    try {
      const items = get().items;
      saveCollection('items', items);
    } catch (error) {
      console.error('Failed to save items:', error);
    }
  },
}));

// Load data on initialization
useInventoryStore.getState().loadFromStorage();
