import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

export interface Document {
  id: string;
  name: string;
  category: 'manual' | 'receipt' | 'invoice' | 'warranty' | 'photo' | 'other';
  relatedTo?: string; // ID of related item/project/vendor
  relatedType?: 'item' | 'project' | 'vendor' | 'maintenance';
  fileType: string; // pdf, jpg, png, etc
  fileSize?: number; // in bytes
  uploadDate: string;
  description?: string;
  tags?: string[];
  url?: string; // For future file upload
  notes?: string;
  ocrText?: string; // Extracted text from OCR processing
}

const DEFAULT_DOCUMENTS: Document[] = [
  {
    id: '1',
    name: 'Samsung Fridge Manual',
    category: 'manual',
    relatedTo: '1',
    relatedType: 'item',
    fileType: 'pdf',
    fileSize: 2457600, // 2.4 MB
    uploadDate: '2023-05-15',
    description: 'User manual and warranty information',
    tags: ['manual', 'refrigerator', 'samsung'],
    notes: 'Keep this for warranty claims',
  },
  {
    id: '2',
    name: 'Home Depot Receipt - Kitchen Remodel',
    category: 'receipt',
    relatedTo: '1',
    relatedType: 'project',
    fileType: 'pdf',
    fileSize: 524288, // 512 KB
    uploadDate: '2024-03-15',
    description: 'Cabinets and hardware purchase',
    tags: ['receipt', 'kitchen', 'remodel'],
    notes: '$4,500 total',
  },
  {
    id: '3',
    name: 'HVAC Service Invoice',
    category: 'invoice',
    relatedType: 'maintenance',
    fileType: 'pdf',
    fileSize: 102400, // 100 KB
    uploadDate: '2024-09-15',
    description: 'Annual HVAC maintenance service',
    tags: ['invoice', 'hvac', 'maintenance'],
    notes: 'Joe\'s HVAC - $350',
  },
  {
    id: '4',
    name: 'Water Heater Warranty',
    category: 'warranty',
    fileType: 'pdf',
    fileSize: 1048576, // 1 MB
    uploadDate: '2024-01-01',
    description: 'American Home Shield warranty documents',
    tags: ['warranty', 'water heater'],
  },
];

interface DocumentStore {
  documents: Document[];
  isLoading: boolean;
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  searchDocuments: (query: string) => Document[];
  getDocumentsByCategory: (category: Document['category']) => Document[];
  getDocumentsByRelation: (relatedId: string, relatedType: Document['relatedType']) => Document[];
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  isLoading: true,
  
  setDocuments: (documents) => {
    set({ documents });
    get().saveToStorage();
  },
  
  addDocument: (document) => {
    set((state) => ({ documents: [...state.documents, document] }));
    get().saveToStorage();
  },
  
  updateDocument: (id, updates) => {
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
    get().saveToStorage();
  },
  
  deleteDocument: (id) => {
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) }));
    get().saveToStorage();
  },
  
  searchDocuments: (query) => {
    const documents = get().documents;
    const lowerQuery = query.toLowerCase();
    return documents.filter(
      (d) =>
        d.name.toLowerCase().includes(lowerQuery) ||
        d.description?.toLowerCase().includes(lowerQuery) ||
        d.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },
  
  getDocumentsByCategory: (category) => {
    const documents = get().documents;
    return documents.filter((d) => d.category === category);
  },
  
  getDocumentsByRelation: (relatedId, relatedType) => {
    const documents = get().documents;
    return documents.filter((d) => d.relatedTo === relatedId && d.relatedType === relatedType);
  },
  
  loadFromStorage: () => {
    try {
      const stored = getCollection('documents');
      if (stored && stored.length > 0) {
        set({ documents: stored, isLoading: false });
      } else {
        set({ documents: DEFAULT_DOCUMENTS, isLoading: false });
        get().saveToStorage();
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      set({ documents: DEFAULT_DOCUMENTS, isLoading: false });
    }
  },
  
  saveToStorage: () => {
    try {
      const documents = get().documents;
      saveCollection('documents', documents);
    } catch (error) {
      console.error('Failed to save documents:', error);
    }
  },
}));

// Load data on initialization
useDocumentStore.getState().loadFromStorage();
