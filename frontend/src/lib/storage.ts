// LocalStorage Database Layer
// This provides persistence for all app data
// Demo data is centralized in ./demoData.ts
// Migrations are handled in ./migrations/

import { runMigrations, needsMigration } from './migrations/runner';
import { consolidateStorageKeys, hasLegacyKeys } from './migrations/consolidate';
import { getLatestVersion } from './migrations/index';

const STORAGE_KEY = 'hometracker_data';

export interface StorageData {
  version: string;
  lastUpdated: string;
  items: any[];
  vendors: any[];
  projects: any[];
  maintenanceTasks: any[];
  warranties: any[];
  documents: any[];
  categories: any[];
  customOptions: any;
  homeVitals: any;
  diagrams: any[];
  aiSettings?: any;
  inventoryStaging?: any;
  transactions?: any[];
  budgets?: any[];
  settings?: {
    property?: any;
    notifications?: any;
    ai?: any;
    display?: any;
  };
  _migrationHistory?: any[];
  _migrationError?: any;
}

// Default empty data structure (demo data loaded separately via demoData.ts)
const getEmptyData = (): StorageData => ({
  version: getLatestVersion(),
  lastUpdated: new Date().toISOString(),
  items: [],
  vendors: [],
  projects: [],
  maintenanceTasks: [],
  warranties: [],
  documents: [],
  categories: [
    'Kitchen Appliances',
    'Laundry',
    'HVAC',
    'Electronics',
    'Furniture',
    'Tools',
    'Outdoor/Garden',
    'Lighting',
    'Plumbing',
    'Security',
  ],
  customOptions: {},
  homeVitals: {},
  diagrams: [],
  aiSettings: {},
  inventoryStaging: {},
  transactions: [],
  budgets: [],
});

// Initialize storage with empty data (demo data loaded separately)
export const initStorage = () => {
  // First, consolidate any legacy storage keys
  if (hasLegacyKeys()) {
    consolidateStorageKeys();
  }
  
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getEmptyData()));
  }
};

// Get all data (with automatic migration)
export const getAllData = (): StorageData => {
  const dataStr = localStorage.getItem(STORAGE_KEY);
  
  if (!dataStr) {
    initStorage();
    const newDataStr = localStorage.getItem(STORAGE_KEY);
    if (!newDataStr) {
      // Fallback if still no data
      return getEmptyData();
    }
    return JSON.parse(newDataStr);
  }
  
  let data = JSON.parse(dataStr);
  
  // Run migrations if needed
  if (needsMigration(data)) {
    const { data: migratedData, result } = runMigrations(data);
    
    // Save migrated data
    if (result.migrationsRun.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedData));
    }
    
    return migratedData;
  }
  
  return data;
};

// Save all data
export const saveAllData = (data: StorageData) => {
  data.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// Get specific collection
export const getCollection = (collection: keyof Omit<StorageData, 'version' | 'lastUpdated'>) => {
  const data = getAllData();
  return data[collection];
};

// Save specific collection
export const saveCollection = (
  collection: keyof Omit<StorageData, 'version' | 'lastUpdated'>,
  items: any
) => {
  const data = getAllData();
  data[collection] = items;
  saveAllData(data);
};

// Export all data as JSON
export const exportData = (): string => {
  const data = getAllData();
  return JSON.stringify(data, null, 2);
};

// Import data from JSON
export const importData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (data.version && data.lastUpdated) {
      saveAllData(data);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
};

// Clear all data
export const clearAllData = () => {
  localStorage.removeItem(STORAGE_KEY);
  initStorage();
};

// Initialize on load
initStorage();





