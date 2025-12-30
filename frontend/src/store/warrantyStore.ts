import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

export interface Warranty {
  id: string;
  itemId?: string;
  itemName: string;
  provider: string;
  type: 'manufacturer' | 'extended' | 'home_warranty';
  startDate: string;
  endDate: string;
  coverageDetails?: string;
  policyNumber?: string;
  cost?: number;
  claimContact?: string;
  claimPhone?: string;
  claimEmail?: string;
  notes?: string;
}

const DEFAULT_WARRANTIES: Warranty[] = [
  {
    id: '1',
    itemId: '1',
    itemName: 'Samsung Refrigerator',
    provider: 'Samsung',
    type: 'manufacturer',
    startDate: '2023-05-15',
    endDate: '2025-05-15',
    coverageDetails: 'Full parts and labor for 2 years',
    policyNumber: 'SAM-2023-123456',
    claimPhone: '1-800-SAMSUNG',
    notes: 'Keep receipt in safe',
  },
  {
    id: '2',
    itemId: '2',
    itemName: 'LG Washer',
    provider: 'LG Electronics',
    type: 'manufacturer',
    startDate: '2022-08-20',
    endDate: '2023-08-20',
    coverageDetails: 'Parts and labor',
    policyNumber: 'LG-2022-789',
    claimPhone: '1-800-243-0000',
    notes: 'WARRANTY EXPIRED',
  },
  {
    id: '3',
    itemName: 'Water Heater',
    provider: 'American Home Shield',
    type: 'home_warranty',
    startDate: '2024-01-01',
    endDate: '2025-01-01',
    coverageDetails: 'Full replacement if needed',
    policyNumber: 'AHS-2024-456',
    cost: 599,
    claimPhone: '1-888-492-7359',
    claimEmail: 'claims@ahs.com',
    notes: 'Renews annually',
  },
];

interface WarrantyStore {
  warranties: Warranty[];
  isLoading: boolean;
  setWarranties: (warranties: Warranty[]) => void;
  addWarranty: (warranty: Warranty) => void;
  updateWarranty: (id: string, updates: Partial<Warranty>) => void;
  deleteWarranty: (id: string) => void;
  getExpiringWarranties: (days: number) => Warranty[];
  getExpiredWarranties: () => Warranty[];
  getActiveWarranties: () => Warranty[];
  searchWarranties: (query: string) => Warranty[];
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useWarrantyStore = create<WarrantyStore>((set, get) => ({
  warranties: [],
  isLoading: true,
  
  setWarranties: (warranties) => {
    set({ warranties });
    get().saveToStorage();
  },
  
  addWarranty: (warranty) => {
    set((state) => ({ warranties: [...state.warranties, warranty] }));
    get().saveToStorage();
  },
  
  updateWarranty: (id, updates) => {
    set((state) => ({
      warranties: state.warranties.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }));
    get().saveToStorage();
  },
  
  deleteWarranty: (id) => {
    set((state) => ({ warranties: state.warranties.filter((w) => w.id !== id) }));
    get().saveToStorage();
  },
  
  getExpiringWarranties: (days) => {
    const warranties = get().warranties;
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
    return warranties.filter((w) => {
      const endDate = new Date(w.endDate);
      return endDate > today && endDate <= futureDate;
    }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  },
  
  getExpiredWarranties: () => {
    const warranties = get().warranties;
    const today = new Date();
    return warranties.filter((w) => new Date(w.endDate) < today);
  },
  
  getActiveWarranties: () => {
    const warranties = get().warranties;
    const today = new Date();
    return warranties.filter((w) => new Date(w.endDate) >= today);
  },
  
  searchWarranties: (query) => {
    const warranties = get().warranties;
    const lowerQuery = query.toLowerCase();
    return warranties.filter(
      (w) =>
        w.itemName.toLowerCase().includes(lowerQuery) ||
        w.provider.toLowerCase().includes(lowerQuery) ||
        w.policyNumber?.toLowerCase().includes(lowerQuery)
    );
  },
  
  loadFromStorage: () => {
    try {
      const stored = getCollection('warranties');
      if (stored && stored.length > 0) {
        set({ warranties: stored, isLoading: false });
      } else {
        set({ warranties: DEFAULT_WARRANTIES, isLoading: false });
        get().saveToStorage();
      }
    } catch (error) {
      console.error('Failed to load warranties:', error);
      set({ warranties: DEFAULT_WARRANTIES, isLoading: false });
    }
  },
  
  saveToStorage: () => {
    try {
      const warranties = get().warranties;
      saveCollection('warranties', warranties);
    } catch (error) {
      console.error('Failed to save warranties:', error);
    }
  },
}));

// Load data on initialization
useWarrantyStore.getState().loadFromStorage();















