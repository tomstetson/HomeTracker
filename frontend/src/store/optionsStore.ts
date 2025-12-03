import { create } from 'zustand';
// Options are stored separately in localStorage, not in the main storage file

/**
 * Central store for all user-customizable options/lists in the app.
 * This allows users to add/remove options for dropdowns throughout the app.
 * All options sync to localStorage and can be exported to Excel/JSON.
 */

// Default options that ship with the app (can't be removed)
export const DEFAULT_OPTIONS = {
  // Inventory categories
  inventoryCategories: [
    'Kitchen Appliances',
    'Laundry',
    'HVAC',
    'Electronics',
    'Furniture',
    'Outdoor/Garden',
    'Tools',
    'Lighting',
    'Plumbing',
    'Security',
    'Other',
  ],
  
  // Vendor categories/specialties
  vendorCategories: [
    'Plumber',
    'Electrician',
    'HVAC',
    'Landscaper',
    'Handyman',
    'Roofer',
    'Painter',
    'Cleaner',
    'Pest Control',
    'Pool Service',
    'Appliance Repair',
    'General Contractor',
    'Other',
  ],
  
  // Sell platforms for inventory
  sellPlatforms: [
    'Facebook Marketplace',
    'Craigslist',
    'eBay',
    'OfferUp',
    'Nextdoor',
    'Mercari',
    'Poshmark',
    'Private Sale',
    'Donation',
    'Other',
  ],
  
  // Item conditions
  itemConditions: [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ],
  
  // Maintenance frequencies
  maintenanceFrequencies: [
    'One-time',
    'Weekly',
    'Bi-weekly',
    'Monthly',
    'Quarterly',
    'Semi-annually',
    'Annually',
    'As needed',
  ],
  
  // Project statuses (these shouldn't be customizable - Kanban structure)
  projectStatuses: ['backlog', 'planning', 'in-progress', 'completed'],
  
  // Emergency contact types
  emergencyContactTypes: [
    'Plumber',
    'Electrician',
    'HVAC',
    'Handyman',
    'Locksmith',
    'Family',
    'Neighbor',
    'Insurance',
    'Other',
  ],
  
  // Document categories
  documentCategories: [
    'Manual',
    'Receipt',
    'Invoice',
    'Warranty',
    'Photo',
    'Contract',
    'Insurance',
    'Permit',
    'Other',
  ],
  
  // Paint finishes
  paintFinishes: [
    'Flat/Matte',
    'Eggshell',
    'Satin',
    'Semi-Gloss',
    'High-Gloss',
  ],
  
  // Rooms (for paint colors, etc.)
  rooms: [
    'Living Room',
    'Kitchen',
    'Master Bedroom',
    'Bedroom 2',
    'Bedroom 3',
    'Bathroom',
    'Master Bathroom',
    'Dining Room',
    'Office',
    'Basement',
    'Garage',
    'Exterior',
    'Other',
  ],
};

export interface CustomOptions {
  inventoryCategories: string[];
  vendorCategories: string[];
  sellPlatforms: string[];
  maintenanceFrequencies: string[];
  emergencyContactTypes: string[];
  documentCategories: string[];
  paintFinishes: string[];
  rooms: string[];
}

interface OptionsStore {
  options: CustomOptions;
  
  // Get merged options (defaults + custom)
  getOptions: (key: keyof CustomOptions) => string[];
  
  // Add a custom option
  addOption: (key: keyof CustomOptions, value: string) => void;
  
  // Remove a custom option (only if not a default)
  removeOption: (key: keyof CustomOptions, value: string) => void;
  
  // Check if option is a default (can't be removed)
  isDefault: (key: keyof CustomOptions, value: string) => boolean;
  
  // Storage
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const STORAGE_KEY = 'customOptions';

export const useOptionsStore = create<OptionsStore>((set, get) => ({
  options: {
    inventoryCategories: [],
    vendorCategories: [],
    sellPlatforms: [],
    maintenanceFrequencies: [],
    emergencyContactTypes: [],
    documentCategories: [],
    paintFinishes: [],
    rooms: [],
  },
  
  getOptions: (key) => {
    const defaults = DEFAULT_OPTIONS[key] || [];
    const custom = get().options[key] || [];
    // Merge defaults + custom, remove duplicates, sort
    const merged = [...new Set([...defaults, ...custom])];
    return merged.sort((a, b) => a.localeCompare(b));
  },
  
  addOption: (key, value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    
    const current = get().options[key] || [];
    const defaults = DEFAULT_OPTIONS[key] || [];
    
    // Don't add if already exists in defaults or custom
    if (defaults.includes(trimmed) || current.includes(trimmed)) return;
    
    set((state) => ({
      options: {
        ...state.options,
        [key]: [...current, trimmed],
      },
    }));
    get().saveToStorage();
  },
  
  removeOption: (key, value) => {
    // Can't remove defaults
    if (get().isDefault(key, value)) return;
    
    set((state) => ({
      options: {
        ...state.options,
        [key]: state.options[key].filter((v) => v !== value),
      },
    }));
    get().saveToStorage();
  },
  
  isDefault: (key, value) => {
    const defaults = DEFAULT_OPTIONS[key] || [];
    return defaults.includes(value);
  },
  
  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(`hometracker_${STORAGE_KEY}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ options: parsed });
      }
    } catch (error) {
      console.error('Failed to load custom options:', error);
    }
  },
  
  saveToStorage: () => {
    try {
      const { options } = get();
      localStorage.setItem(`hometracker_${STORAGE_KEY}`, JSON.stringify(options));
    } catch (error) {
      console.error('Failed to save custom options:', error);
    }
  },
}));

// Load on initialization
useOptionsStore.getState().loadFromStorage();

