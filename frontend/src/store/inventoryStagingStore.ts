import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

/**
 * AI-detected object from image analysis
 */
export interface DetectedObject {
  name: string;              // e.g., "Refrigerator", "Television"
  category: string;          // e.g., "Kitchen Appliances", "Electronics"
  brand?: string;            // Detected brand (from logo/text)
  modelNumber?: string;      // If visible on device
  confidence: number;        // 0-1 confidence score
  suggestedLocation?: string; // AI-suggested room/location
  boundingBox?: {            // Where in image the object was detected
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Receipt match suggestion
 */
export interface ReceiptMatch {
  documentId: string;
  documentName: string;
  matchScore: number;        // 0-1 how confident we are in the match
  matchReason: string;       // e.g., "Brand 'LG' matches receipt vendor"
  extractedData?: {
    purchaseDate?: string;
    purchasePrice?: number;
    vendor?: string;
    warrantyInfo?: string;
  };
}

/**
 * Image in the staging pipeline
 */
export interface StagedImage {
  id: string;
  fileId: string;            // Backend file ID
  originalName: string;
  thumbnailUrl: string;
  fullUrl: string;
  uploadedAt: string;
  
  // Processing status
  status: 'pending' | 'analyzing' | 'analyzed' | 'duplicate' | 'error';
  errorMessage?: string;
  
  // Duplicate detection
  imageHash?: string;        // Perceptual hash for similarity
  duplicateOfId?: string;    // If this is a duplicate, which image is it a duplicate of
  similarImages?: string[];  // IDs of similar (but not exact duplicate) images
  
  // AI Analysis results
  detectedObjects: DetectedObject[];
  extractedText?: string;    // OCR text from image
  suggestedName?: string;
  suggestedCategory?: string;
  suggestedBrand?: string;
  
  // Receipt matching
  receiptMatches: ReceiptMatch[];
  selectedReceiptId?: string; // User-confirmed receipt link
}

/**
 * Staged inventory item ready for review
 */
export interface StagedInventoryItem {
  id: string;
  
  // Source images (could be multiple angles of same item)
  imageIds: string[];
  primaryImageId: string;
  
  // AI suggestions (editable by user)
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  location: string;
  suggestedLocation?: string; // AI-suggested location from image analysis
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  
  // Linked receipt
  linkedReceiptId?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  
  // Review status
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  reviewedAt?: string;
  notes?: string;
  
  // Confidence scores
  confidence: {
    name: number;
    category: number;
    brand: number;
    receiptMatch: number;
  };
}

/**
 * Inventory Wizard session
 */
export interface WizardSession {
  id: string;
  createdAt: string;
  status: 'uploading' | 'analyzing' | 'grouping' | 'matching' | 'reviewing' | 'complete';
  
  // Stats
  totalImages: number;
  processedImages: number;
  duplicatesFound: number;
  itemsDetected: number;
  itemsApproved: number;
}

interface InventoryStagingStore {
  // Current session
  session: WizardSession | null;
  stagedImages: StagedImage[];
  stagedItems: StagedInventoryItem[];
  
  // Actions
  startSession: () => string;
  endSession: () => void;
  updateSession: (updates: Partial<WizardSession>) => void;
  
  // Image management
  addStagedImage: (image: StagedImage) => void;
  updateStagedImage: (id: string, updates: Partial<StagedImage>) => void;
  removeStagedImage: (id: string) => void;
  markAsDuplicate: (id: string, duplicateOfId: string) => void;
  
  // Item management
  addStagedItem: (item: StagedInventoryItem) => void;
  updateStagedItem: (id: string, updates: Partial<StagedInventoryItem>) => void;
  removeStagedItem: (id: string) => void;
  approveItem: (id: string) => void;
  rejectItem: (id: string) => void;
  
  // Bulk operations
  approveAllItems: () => void;
  clearAll: () => void;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const COLLECTION_NAME = 'inventoryStaging';

export const useInventoryStagingStore = create<InventoryStagingStore>((set, get) => ({
  session: null,
  stagedImages: [],
  stagedItems: [],
  
  startSession: () => {
    const id = `session-${Date.now()}`;
    const session: WizardSession = {
      id,
      createdAt: new Date().toISOString(),
      status: 'uploading',
      totalImages: 0,
      processedImages: 0,
      duplicatesFound: 0,
      itemsDetected: 0,
      itemsApproved: 0,
    };
    set({ session, stagedImages: [], stagedItems: [] });
    get().saveToStorage();
    return id;
  },
  
  endSession: () => {
    set({ session: null, stagedImages: [], stagedItems: [] });
    get().saveToStorage();
  },
  
  updateSession: (updates) => {
    set((state) => ({
      session: state.session ? { ...state.session, ...updates } : null,
    }));
    get().saveToStorage();
  },
  
  addStagedImage: (image) => {
    set((state) => ({
      stagedImages: [...state.stagedImages, image],
      session: state.session ? {
        ...state.session,
        totalImages: state.session.totalImages + 1,
      } : null,
    }));
    get().saveToStorage();
  },
  
  updateStagedImage: (id, updates) => {
    set((state) => ({
      stagedImages: state.stagedImages.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      ),
    }));
    get().saveToStorage();
  },
  
  removeStagedImage: (id) => {
    set((state) => ({
      stagedImages: state.stagedImages.filter((img) => img.id !== id),
    }));
    get().saveToStorage();
  },
  
  markAsDuplicate: (id, duplicateOfId) => {
    set((state) => ({
      stagedImages: state.stagedImages.map((img) =>
        img.id === id
          ? { ...img, status: 'duplicate' as const, duplicateOfId }
          : img
      ),
      session: state.session ? {
        ...state.session,
        duplicatesFound: state.session.duplicatesFound + 1,
      } : null,
    }));
    get().saveToStorage();
  },
  
  addStagedItem: (item) => {
    set((state) => ({
      stagedItems: [...state.stagedItems, item],
      session: state.session ? {
        ...state.session,
        itemsDetected: state.session.itemsDetected + 1,
      } : null,
    }));
    get().saveToStorage();
  },
  
  updateStagedItem: (id, updates) => {
    set((state) => ({
      stagedItems: state.stagedItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
    get().saveToStorage();
  },
  
  removeStagedItem: (id) => {
    set((state) => ({
      stagedItems: state.stagedItems.filter((item) => item.id !== id),
    }));
    get().saveToStorage();
  },
  
  approveItem: (id) => {
    set((state) => ({
      stagedItems: state.stagedItems.map((item) =>
        item.id === id
          ? { ...item, status: 'approved' as const, reviewedAt: new Date().toISOString() }
          : item
      ),
      session: state.session ? {
        ...state.session,
        itemsApproved: state.session.itemsApproved + 1,
      } : null,
    }));
    get().saveToStorage();
  },
  
  rejectItem: (id) => {
    set((state) => ({
      stagedItems: state.stagedItems.map((item) =>
        item.id === id
          ? { ...item, status: 'rejected' as const, reviewedAt: new Date().toISOString() }
          : item
      ),
    }));
    get().saveToStorage();
  },
  
  approveAllItems: () => {
    const now = new Date().toISOString();
    set((state) => ({
      stagedItems: state.stagedItems.map((item) =>
        item.status === 'pending'
          ? { ...item, status: 'approved' as const, reviewedAt: now }
          : item
      ),
      session: state.session ? {
        ...state.session,
        itemsApproved: state.stagedItems.filter((i) => i.status === 'pending').length,
      } : null,
    }));
    get().saveToStorage();
  },
  
  clearAll: () => {
    set({ session: null, stagedImages: [], stagedItems: [] });
    get().saveToStorage();
  },
  
  loadFromStorage: () => {
    const data = getCollection(COLLECTION_NAME);
    if (data) {
      set({
        session: data.session || null,
        stagedImages: data.stagedImages || [],
        stagedItems: data.stagedItems || [],
      });
    }
  },
  
  saveToStorage: () => {
    const { session, stagedImages, stagedItems } = get();
    saveCollection(COLLECTION_NAME, { session, stagedImages, stagedItems });
  },
}));

// Initialize from storage
useInventoryStagingStore.getState().loadFromStorage();

