import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

// Warranty info embedded in inventory item
export interface ItemWarranty {
  provider?: string;
  policyNumber?: string;
  startDate?: string;
  endDate?: string;
  coverageDetails?: string;
  contactPhone?: string;
  contactEmail?: string;
  documentId?: string; // Link to uploaded warranty document
}

// Sale record for sold items
export interface SaleRecord {
  saleDate: string;
  salePrice: number;
  buyer?: string;
  platform?: string; // e.g., "Facebook Marketplace", "Craigslist", "eBay", "Private"
  notes?: string;
}

// Consumable/replacement part info for items that need periodic replacement
export interface ConsumableInfo {
  isConsumable: boolean;                    // This is a consumable/replacement part
  replacementStorageLocation?: string;      // Where spares are stored (e.g., "Garage cabinet", "Attic", "Under kitchen sink")
  stockQuantity?: number;                   // How many spares on hand
  reorderUrl?: string;                      // URL to reorder (Amazon, etc.)
  reorderThreshold?: number;                // Alert when stock drops below this
  linkedApplianceId?: string;               // ID of the appliance this part is for (e.g., filter for refrigerator)
  replacementIntervalMonths?: number;       // How often to replace (e.g., 6 months for fridge filter)
  lastReplacedDate?: string;                // When it was last replaced
  nextReplacementDate?: string;             // Auto-calculated or manual next replacement
}

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
  notes?: string;
  photos: string[];
  tags: string[];
  
  // Warranty info (integrated)
  warranty?: ItemWarranty;
  
  // Sale tracking
  status: 'active' | 'sold' | 'deleted';
  sale?: SaleRecord;
  
  // Consumable/replacement part tracking
  consumableInfo?: ConsumableInfo;
  
  // Soft delete tracking
  deletedAt?: string; // ISO date when moved to trash
}

// Default categories - user can add more
export const DEFAULT_CATEGORIES = [
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
];

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
    notes: 'French door model with ice maker',
    photos: [],
    tags: ['appliance', 'kitchen'],
    status: 'active',
    warranty: {
      provider: 'Samsung',
      endDate: '2025-05-15',
      coverageDetails: '2-year manufacturer warranty',
    },
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
    notes: 'Front load, energy efficient',
    photos: [],
    tags: ['appliance', 'laundry'],
    status: 'active',
    warranty: {
      provider: 'LG',
      endDate: '2023-08-20',
      coverageDetails: '1-year manufacturer warranty - EXPIRED',
    },
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
    status: 'active',
  },
];

interface InventoryStore {
  items: InventoryItem[];
  categories: string[];
  isLoading: boolean;
  
  // Items CRUD
  setItems: (items: InventoryItem[]) => void;
  addItem: (item: InventoryItem) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  
  // Soft delete & restore
  softDeleteItem: (id: string) => void;
  restoreItem: (id: string) => void;
  permanentlyDeleteItem: (id: string) => void;
  emptyTrash: () => void;
  
  // Sell item
  sellItem: (id: string, sale: SaleRecord) => void;
  
  // Categories management
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  setCategories: (categories: string[]) => void;
  
  // Queries
  getActiveItems: () => InventoryItem[];
  getSoldItems: () => InventoryItem[];
  getDeletedItems: () => InventoryItem[];
  getExpiringWarranties: (daysAhead?: number) => InventoryItem[];
  searchItems: (query: string) => InventoryItem[];
  filterByCategory: (category: string) => InventoryItem[];
  
  // Stats
  getTotalValue: () => number;
  getTotalSaleRecoup: () => { totalPurchase: number; totalSale: number; profit: number };
  
  // Consumables/Parts
  getConsumables: () => InventoryItem[];
  getConsumablesNeedingReplacement: (daysAhead?: number) => InventoryItem[];
  getConsumablesForAppliance: (applianceId: string) => InventoryItem[];
  updateConsumableInfo: (id: string, consumableInfo: Partial<ConsumableInfo>) => void;
  recordPartReplacement: (id: string) => void;
  
  // Storage
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// Helper to clean up old trash items (180 days)
const TRASH_RETENTION_DAYS = 180;
const cleanupOldTrash = (items: InventoryItem[]): InventoryItem[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - TRASH_RETENTION_DAYS);
  
  return items.filter((item) => {
    if (item.status !== 'deleted' || !item.deletedAt) return true;
    return new Date(item.deletedAt) > cutoffDate;
  });
};

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  categories: [...DEFAULT_CATEGORIES],
  isLoading: true,
  
  setItems: (items) => {
    set({ items });
    get().saveToStorage();
  },
  
  addItem: (item) => {
    const newItem = { ...item, status: item.status || 'active' as const };
    set((state) => ({ items: [...state.items, newItem] }));
    get().saveToStorage();
  },
  
  updateItem: (id, updates) => {
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
    get().saveToStorage();
  },
  
  // Soft delete - moves to trash
  softDeleteItem: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, status: 'deleted' as const, deletedAt: new Date().toISOString() }
          : item
      ),
    }));
    get().saveToStorage();
  },
  
  // Restore from trash
  restoreItem: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, status: 'active' as const, deletedAt: undefined }
          : item
      ),
    }));
    get().saveToStorage();
  },
  
  // Permanent delete
  permanentlyDeleteItem: (id) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    get().saveToStorage();
  },
  
  // Empty all trash
  emptyTrash: () => {
    set((state) => ({ items: state.items.filter((item) => item.status !== 'deleted') }));
    get().saveToStorage();
  },
  
  // Mark as sold with sale record
  sellItem: (id, sale) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, status: 'sold' as const, sale }
          : item
      ),
    }));
    get().saveToStorage();
  },
  
  // Category management
  addCategory: (category) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    set((state) => {
      if (state.categories.includes(trimmed)) return state;
      return { categories: [...state.categories, trimmed].sort() };
    });
    get().saveToStorage();
  },
  
  removeCategory: (category) => {
    set((state) => ({
      categories: state.categories.filter((c) => c !== category),
    }));
    get().saveToStorage();
  },
  
  setCategories: (categories) => {
    set({ categories });
    get().saveToStorage();
  },
  
  // Query helpers
  getActiveItems: () => get().items.filter((item) => item.status === 'active'),
  getSoldItems: () => get().items.filter((item) => item.status === 'sold'),
  getDeletedItems: () => get().items.filter((item) => item.status === 'deleted'),
  
  getExpiringWarranties: (daysAhead = 90) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    
    return get().items.filter((item) => {
      if (item.status !== 'active' || !item.warranty?.endDate) return false;
      const endDate = new Date(item.warranty.endDate);
      return endDate >= today && endDate <= futureDate;
    });
  },
  
  searchItems: (query) => {
    const items = get().getActiveItems();
    const lowerQuery = query.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery) ||
        item.brand?.toLowerCase().includes(lowerQuery) ||
        item.location.toLowerCase().includes(lowerQuery) ||
        item.modelNumber?.toLowerCase().includes(lowerQuery) ||
        item.serialNumber?.toLowerCase().includes(lowerQuery)
    );
  },
  
  filterByCategory: (category) => {
    const items = get().getActiveItems();
    return items.filter((item) => item.category === category);
  },
  
  // Stats
  getTotalValue: () => {
    return get().getActiveItems().reduce((sum, item) => sum + (item.currentValue || item.purchasePrice || 0), 0);
  },
  
  getTotalSaleRecoup: () => {
    const soldItems = get().getSoldItems();
    const totalPurchase = soldItems.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
    const totalSale = soldItems.reduce((sum, item) => sum + (item.sale?.salePrice || 0), 0);
    return {
      totalPurchase,
      totalSale,
      profit: totalSale - totalPurchase,
    };
  },
  
  // Get all items marked as consumables
  getConsumables: () => {
    return get().items.filter(
      (item) => item.status === 'active' && item.consumableInfo?.isConsumable
    );
  },
  
  // Get consumables that need replacement soon
  getConsumablesNeedingReplacement: (daysAhead = 30) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    
    return get().items.filter((item) => {
      if (item.status !== 'active' || !item.consumableInfo?.isConsumable) return false;
      if (!item.consumableInfo.nextReplacementDate) return false;
      
      const nextReplacement = new Date(item.consumableInfo.nextReplacementDate);
      return nextReplacement <= futureDate;
    });
  },
  
  // Get all consumable parts linked to a specific appliance
  getConsumablesForAppliance: (applianceId: string) => {
    return get().items.filter(
      (item) =>
        item.status === 'active' &&
        item.consumableInfo?.isConsumable &&
        item.consumableInfo.linkedApplianceId === applianceId
    );
  },
  
  // Update consumable info for an item
  updateConsumableInfo: (id, consumableInfo) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              consumableInfo: {
                ...item.consumableInfo,
                ...consumableInfo,
                isConsumable: consumableInfo.isConsumable ?? item.consumableInfo?.isConsumable ?? true,
              },
            }
          : item
      ),
    }));
    get().saveToStorage();
  },
  
  // Record that a part was replaced (updates lastReplacedDate and calculates nextReplacementDate)
  recordPartReplacement: (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item || !item.consumableInfo) return;
    
    const now = new Date().toISOString().split('T')[0];
    const intervalMonths = item.consumableInfo.replacementIntervalMonths || 6;
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + intervalMonths);
    
    // Decrement stock if tracked
    const newStock = item.consumableInfo.stockQuantity !== undefined
      ? Math.max(0, item.consumableInfo.stockQuantity - 1)
      : undefined;
    
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id
          ? {
              ...i,
              consumableInfo: {
                ...i.consumableInfo!,
                lastReplacedDate: now,
                nextReplacementDate: nextDate.toISOString().split('T')[0],
                stockQuantity: newStock,
              },
            }
          : i
      ),
    }));
    get().saveToStorage();
  },
  
  loadFromStorage: () => {
    try {
      const stored = getCollection('items');
      const storedCategories = getCollection('categories');
      
      if (stored && stored.length > 0) {
        // Clean up old trash items
        const cleaned = cleanupOldTrash(stored);
        // Migrate old items that don't have status field
        const migrated = cleaned.map((item: any) => ({
          ...item,
          status: item.status || 'active',
        }));
        set({ 
          items: migrated, 
          categories: storedCategories?.length > 0 ? storedCategories : DEFAULT_CATEGORIES,
          isLoading: false 
        });
        // Save if cleanup happened
        if (cleaned.length !== stored.length) {
          get().saveToStorage();
        }
      } else {
        set({ items: DEFAULT_ITEMS, categories: DEFAULT_CATEGORIES, isLoading: false });
        get().saveToStorage();
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      set({ items: DEFAULT_ITEMS, categories: DEFAULT_CATEGORIES, isLoading: false });
    }
  },
  
  saveToStorage: () => {
    try {
      const { items, categories } = get();
      saveCollection('items', items);
      saveCollection('categories', categories);
    } catch (error) {
      console.error('Failed to save items:', error);
    }
  },
}));

// Load data on initialization
useInventoryStore.getState().loadFromStorage();
