// LocalStorage Database Layer
// This provides persistence for all app data

const STORAGE_KEY = 'hometracker_data';
const VERSION = '1.0';

export interface StorageData {
  version: string;
  lastUpdated: string;
  items: any[];
  vendors: any[];
  projects: any[];
  maintenanceTasks: any[];
  warranties: any[];
  documents: any[];
}

// Initialize storage with default data
export const initStorage = () => {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    const defaultData: StorageData = {
      version: VERSION,
      lastUpdated: new Date().toISOString(),
      items: [],
      vendors: [],
      projects: [],
      maintenanceTasks: [],
      warranties: [],
      documents: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  }
};

// Get all data
export const getAllData = (): StorageData => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    initStorage();
    return getAllData();
  }
  return JSON.parse(data);
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
  items: any[]
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





