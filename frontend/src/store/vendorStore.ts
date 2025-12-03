import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

export interface Vendor {
  id: string;
  businessName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  website?: string;
  address?: string;
  category: string[];
  rating: number;
  totalJobs: number;
  notes?: string;
  isPreferred: boolean;
  lastUsed?: string;
}

const DEFAULT_VENDORS: Vendor[] = [
  {
    id: '1',
    businessName: 'Joe\'s Plumbing',
    contactPerson: 'Joe Smith',
    phone: '215-555-0101',
    email: 'joe@joesplumbing.com',
    website: 'www.joesplumbing.com',
    address: '123 Main St, Anytown, USA',
    category: ['Plumbing', 'Emergency'],
    rating: 5,
    totalJobs: 3,
    notes: 'Excellent work, very responsive. Fixed water heater quickly.',
    isPreferred: true,
    lastUsed: '2024-10-15',
  },
  {
    id: '2',
    businessName: 'Elite Electric',
    contactPerson: 'Sarah Johnson',
    phone: '215-555-0202',
    email: 'contact@eliteelectric.com',
    category: ['Electrical', 'Licensed'],
    rating: 4,
    totalJobs: 2,
    notes: 'Professional and thorough. Did great work on kitchen remodel.',
    isPreferred: true,
    lastUsed: '2024-11-01',
  },
  {
    id: '3',
    businessName: 'ABC Contractors',
    contactPerson: 'Mike Davis',
    phone: '215-555-0303',
    email: 'mike@abccontractors.com',
    website: 'www.abccontractors.com',
    category: ['General Contractor', 'Renovation'],
    rating: 5,
    totalJobs: 1,
    notes: 'Handled our kitchen remodel from start to finish. Highly recommend!',
    isPreferred: true,
    lastUsed: '2024-09-20',
  },
  {
    id: '4',
    businessName: 'Cool Air HVAC',
    phone: '215-555-0404',
    email: 'service@coolair.com',
    category: ['HVAC', 'Maintenance'],
    rating: 4,
    totalJobs: 4,
    notes: 'Regular maintenance provider. Always on time.',
    isPreferred: false,
    lastUsed: '2024-11-10',
  },
];

interface VendorStore {
  vendors: Vendor[];
  isLoading: boolean;
  setVendors: (vendors: Vendor[]) => void;
  addVendor: (vendor: Vendor) => void;
  updateVendor: (id: string, updates: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  searchVendors: (query: string) => Vendor[];
  getVendorsByCategory: (category: string) => Vendor[];
  getPreferredVendors: () => Vendor[];
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useVendorStore = create<VendorStore>((set, get) => ({
  vendors: [],
  isLoading: true,
  
  setVendors: (vendors) => {
    set({ vendors });
    get().saveToStorage();
  },
  
  addVendor: (vendor) => {
    set((state) => ({ vendors: [...state.vendors, vendor] }));
    get().saveToStorage();
  },
  
  updateVendor: (id, updates) => {
    set((state) => ({
      vendors: state.vendors.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));
    get().saveToStorage();
  },
  
  deleteVendor: (id) => {
    set((state) => ({ vendors: state.vendors.filter((v) => v.id !== id) }));
    get().saveToStorage();
  },
  
  searchVendors: (query) => {
    const vendors = get().vendors;
    const lowerQuery = query.toLowerCase();
    return vendors.filter(
      (v) =>
        v.businessName.toLowerCase().includes(lowerQuery) ||
        v.contactPerson?.toLowerCase().includes(lowerQuery) ||
        v.category.some((c) => c.toLowerCase().includes(lowerQuery))
    );
  },
  
  getVendorsByCategory: (category) => {
    const vendors = get().vendors;
    return vendors.filter((v) => v.category.includes(category));
  },
  
  getPreferredVendors: () => {
    const vendors = get().vendors;
    return vendors.filter((v) => v.isPreferred);
  },
  
  loadFromStorage: () => {
    try {
      const stored = getCollection('vendors');
      if (stored && stored.length > 0) {
        set({ vendors: stored, isLoading: false });
      } else {
        set({ vendors: DEFAULT_VENDORS, isLoading: false });
        get().saveToStorage();
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
      set({ vendors: DEFAULT_VENDORS, isLoading: false });
    }
  },
  
  saveToStorage: () => {
    try {
      const vendors = get().vendors;
      saveCollection('vendors', vendors);
    } catch (error) {
      console.error('Failed to save vendors:', error);
    }
  },
}));

// Load data on initialization
useVendorStore.getState().loadFromStorage();
