# HomeTracker Architecture Remediation Plan

This document provides a comprehensive plan to address all identified architecture issues, organized into phased implementation with detailed specifications.

---

## Executive Summary

| Phase | Focus | Duration | Key Deliverables |
|-------|-------|----------|------------------|
| **Phase 1** | Storage Consolidation | 1-2 weeks | Single storage key, backward compatibility |
| **Phase 2** | Data Migration System | 1-2 weeks | Versioned schema, auto-migration |
| **Phase 3** | Performance Optimization | 2-3 weeks | Debounced saves, memoization, code splitting |
| **Phase 4** | IndexedDB Implementation | 2-3 weeks | Large file support, compression |
| **Phase 5** | UX & Code Quality | 2-3 weeks | Onboarding, validation, error boundaries |

**Total Estimated Timeline**: 8-13 weeks

---

## Phase 1: Storage Consolidation

### Issue: A2 - Inconsistent Storage Keys

**Current State:**
```
localStorage keys:
├── hometracker_data        (main data)
├── hometracker_settings    (property settings - separate!)
└── hometracker_diagrams    (legacy diagram data - separate!)
```

**Target State:**
```
localStorage keys:
└── hometracker_data        (ALL data consolidated)
    ├── items[]
    ├── vendors[]
    ├── projects[]
    ├── maintenanceTasks[]
    ├── diagrams[]
    ├── settings {}          ← merged from hometracker_settings
    └── ... (all other data)
```

### Implementation Plan

#### Step 1.1: Update StorageData Interface

```typescript
// frontend/src/lib/storage.ts

export interface StorageData {
  version: string;
  lastUpdated: string;
  
  // Collections
  items: InventoryItem[];
  vendors: Vendor[];
  projects: Project[];
  maintenanceTasks: MaintenanceTask[];
  warranties: Warranty[];
  documents: Document[];
  diagrams: Diagram[];
  transactions: Transaction[];
  budgets: Budget[];
  
  // Settings (consolidated)
  settings: {
    property: PropertySettings;
    notifications: NotificationSettings;
    ai: AISettings;
    display: DisplaySettings;
  };
  
  // Metadata
  categories: string[];
  customOptions: Record<string, any>;
  homeVitals: HomeVitals;
}
```

#### Step 1.2: Create Migration Helper

```typescript
// frontend/src/lib/storageMigration.ts

export const consolidateStorageKeys = (): void => {
  const MAIN_KEY = 'hometracker_data';
  const LEGACY_KEYS = ['hometracker_settings', 'hometracker_diagrams'];
  
  const mainData = JSON.parse(localStorage.getItem(MAIN_KEY) || '{}');
  
  // Merge hometracker_settings
  const settingsData = localStorage.getItem('hometracker_settings');
  if (settingsData) {
    try {
      mainData.settings = {
        ...mainData.settings,
        property: JSON.parse(settingsData)
      };
      localStorage.removeItem('hometracker_settings');
      console.log('✅ Migrated hometracker_settings');
    } catch (e) {
      console.warn('Failed to migrate settings:', e);
    }
  }
  
  // Merge hometracker_diagrams (if any legacy data exists)
  const diagramsData = localStorage.getItem('hometracker_diagrams');
  if (diagramsData) {
    try {
      const legacyDiagrams = JSON.parse(diagramsData);
      mainData.diagrams = [
        ...(mainData.diagrams || []),
        ...legacyDiagrams.filter((d: any) => 
          !mainData.diagrams?.find((existing: any) => existing.id === d.id)
        )
      ];
      localStorage.removeItem('hometracker_diagrams');
      console.log('✅ Migrated hometracker_diagrams');
    } catch (e) {
      console.warn('Failed to migrate diagrams:', e);
    }
  }
  
  // Save consolidated data
  localStorage.setItem(MAIN_KEY, JSON.stringify(mainData));
};
```

#### Step 1.3: Update Affected Components

| File | Change Required |
|------|-----------------|
| `frontend/src/pages/HomeInfo.tsx` | Read/write from `settings.property` instead of separate key |
| `frontend/src/components/Layout.tsx` | Update `usePropertyInfo` hook to use consolidated storage |
| `frontend/src/store/diagramStore.ts` | Remove separate localStorage calls |
| `frontend/src/store/aiSettingsStore.ts` | Read from `settings.ai` |

#### Step 1.4: Backward Compatibility

```typescript
// Run on app initialization (storage.ts)
export const initStorage = () => {
  // First, consolidate any legacy keys
  consolidateStorageKeys();
  
  // Then proceed with normal initialization
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getEmptyData()));
  }
};
```

### Testing Checklist

- [ ] Fresh install works correctly
- [ ] Existing data with legacy keys migrates successfully
- [ ] Property settings persist after migration
- [ ] Diagrams preserve after migration
- [ ] No data loss during migration
- [ ] All stores read/write correctly

---

## Phase 2: Data Migration System

### Issue: A3 - No Data Versioning/Migration

**Current State:**
- Static version `1.0` that never changes
- Schema changes can break existing data
- No upgrade path for users

**Target State:**
- Semantic versioning for data schema
- Automatic migration on app load
- Migration history tracking

### Implementation Plan

#### Step 2.1: Create Migration Framework

```typescript
// frontend/src/lib/migrations/index.ts

export interface Migration {
  version: string;
  description: string;
  migrate: (data: any) => any;
}

export const migrations: Migration[] = [
  {
    version: '1.1.0',
    description: 'Consolidate storage keys',
    migrate: (data) => {
      // Migration logic from Phase 1
      return { ...data, version: '1.1.0' };
    }
  },
  {
    version: '1.2.0',
    description: 'Add settings namespace',
    migrate: (data) => {
      if (!data.settings) {
        data.settings = {
          property: {},
          notifications: { enabled: true },
          ai: {},
          display: { theme: 'system' }
        };
      }
      return { ...data, version: '1.2.0' };
    }
  },
  {
    version: '1.3.0',
    description: 'Normalize diagram data format',
    migrate: (data) => {
      // Remove invalid tldraw data
      if (data.diagrams) {
        data.diagrams = data.diagrams.map((d: any) => {
          if (d.data?.store) {
            // Validate tldraw data, clear if invalid
            const hasInvalidShapes = Object.values(d.data.store).some(
              (shape: any) => shape.type === 'text' && shape.props?.text
            );
            if (hasInvalidShapes) {
              return { ...d, data: null };
            }
          }
          return d;
        });
      }
      return { ...data, version: '1.3.0' };
    }
  }
];
```

#### Step 2.2: Migration Runner

```typescript
// frontend/src/lib/migrations/runner.ts

import { migrations, Migration } from './index';
import { compareVersions } from '../utils';

export const runMigrations = (data: any): any => {
  const currentVersion = data.version || '1.0.0';
  
  // Filter migrations that need to run
  const pendingMigrations = migrations
    .filter(m => compareVersions(m.version, currentVersion) > 0)
    .sort((a, b) => compareVersions(a.version, b.version));
  
  if (pendingMigrations.length === 0) {
    console.log('✅ Data is up to date');
    return data;
  }
  
  console.log(`🔄 Running ${pendingMigrations.length} migration(s)...`);
  
  let migratedData = { ...data };
  const migrationLog: string[] = [];
  
  for (const migration of pendingMigrations) {
    try {
      console.log(`  → Migrating to ${migration.version}: ${migration.description}`);
      migratedData = migration.migrate(migratedData);
      migrationLog.push(`${migration.version}: ${migration.description}`);
    } catch (error) {
      console.error(`❌ Migration ${migration.version} failed:`, error);
      // Store migration error for user notification
      migratedData._migrationError = {
        version: migration.version,
        error: String(error)
      };
      break;
    }
  }
  
  // Store migration history
  migratedData._migrationHistory = [
    ...(migratedData._migrationHistory || []),
    ...migrationLog.map(log => ({ date: new Date().toISOString(), log }))
  ];
  
  console.log('✅ Migrations complete');
  return migratedData;
};
```

#### Step 2.3: Version Comparison Utility

```typescript
// frontend/src/lib/utils.ts (add to existing)

export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};
```

#### Step 2.4: Integration with Storage Layer

```typescript
// frontend/src/lib/storage.ts (updated)

import { runMigrations } from './migrations/runner';

export const getAllData = (): StorageData => {
  const data = localStorage.getItem(STORAGE_KEY);
  
  if (!data) {
    initStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  }
  
  let parsed = JSON.parse(data);
  
  // Run migrations if needed
  const migrated = runMigrations(parsed);
  
  // Save if migrations ran
  if (migrated.version !== parsed.version) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    
    // Notify user if there was a migration error
    if (migrated._migrationError) {
      console.warn('Migration had errors:', migrated._migrationError);
    }
  }
  
  return migrated;
};
```

### Testing Checklist

- [ ] Fresh install gets latest version
- [ ] Version 1.0.0 data migrates through all versions
- [ ] Migration errors don't corrupt data
- [ ] Migration history is recorded
- [ ] Rollback capability (export before migration)

---

## Phase 3: Performance Optimization

### Issue: P1 - Full Data Reload on Every Save

#### Step 3.1: Implement Debounced Saves

```typescript
// frontend/src/lib/storage.ts

import { debounce } from './utils';

// Pending changes queue
let pendingChanges: Partial<StorageData> = {};
let saveScheduled = false;

// Debounced save function
const debouncedSave = debounce(() => {
  if (Object.keys(pendingChanges).length === 0) return;
  
  const currentData = getAllData();
  const mergedData = {
    ...currentData,
    ...pendingChanges,
    lastUpdated: new Date().toISOString()
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));
  pendingChanges = {};
  saveScheduled = false;
}, 500); // 500ms debounce

// Optimized collection save
export const saveCollectionOptimized = (
  collection: keyof StorageData,
  items: any
) => {
  pendingChanges[collection] = items;
  
  if (!saveScheduled) {
    saveScheduled = true;
    debouncedSave();
  }
};

// Force immediate save (for critical operations)
export const forceSave = () => {
  debouncedSave.flush();
};
```

### Issue: P2 - No Memoization

#### Step 3.2: Add Zustand Selectors with Memoization

```typescript
// frontend/src/store/inventoryStore.ts (example pattern)

import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

// Create memoized selectors
export const useActiveItems = () => useInventoryStore(
  state => state.items.filter(i => i.status === 'active'),
  shallow
);

export const useTotalValue = () => useInventoryStore(
  state => state.items
    .filter(i => i.status === 'active')
    .reduce((sum, i) => sum + (i.currentValue || 0), 0)
);

// Usage in components:
// const activeItems = useActiveItems(); // Only re-renders when active items change
```

### Issue: P3 - Large Bundle Size (tldraw)

#### Step 3.3: Lazy Load Diagram Editor

```typescript
// frontend/src/pages/Diagrams.tsx

import { lazy, Suspense } from 'react';

// Lazy load tldraw (it's ~1MB)
const TldrawEditor = lazy(() => import('../components/TldrawEditor'));

// In the component:
{viewMode === 'editor' && (
  <Suspense fallback={<DiagramEditorSkeleton />}>
    <TldrawEditor
      diagram={activeDiagram}
      onSave={handleSave}
    />
  </Suspense>
)}
```

```typescript
// frontend/src/components/TldrawEditor.tsx (new file)

import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';

interface TldrawEditorProps {
  diagram: Diagram;
  onSave: (data: any) => void;
}

export default function TldrawEditor({ diagram, onSave }: TldrawEditorProps) {
  // All tldraw-specific logic moved here
  return (
    <Tldraw
      onMount={(editor: Editor) => {
        // ... initialization logic
      }}
    />
  );
}
```

### Performance Testing

```typescript
// frontend/src/lib/__tests__/performance.test.ts

import { performance } from 'perf_hooks';

describe('Performance benchmarks', () => {
  it('should save 1000 items in under 100ms', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Test Item ${i}`,
      // ... other fields
    }));
    
    const start = performance.now();
    saveCollection('items', items);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100);
  });
  
  it('should load data in under 50ms', () => {
    const start = performance.now();
    getAllData();
    const end = performance.now();
    
    expect(end - start).toBeLessThan(50);
  });
});
```

---

## Phase 4: IndexedDB Implementation

### Issue: A4 - LocalStorage Size Limits

**Current Limitation**: localStorage ~5-10MB
**Target**: Support 50MB+ with photos and documents

### Implementation Plan

#### Step 4.1: Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │  localStorage   │     │       IndexedDB              │   │
│  │  (~5MB limit)   │     │       (50MB+ limit)          │   │
│  ├─────────────────┤     ├─────────────────────────────┤   │
│  │ • Settings      │     │ • Photos (blobs)            │   │
│  │ • Small data    │     │ • Documents (blobs)         │   │
│  │ • Metadata      │     │ • Large diagrams            │   │
│  │ • References    │     │ • Backup snapshots          │   │
│  └─────────────────┘     └─────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Step 4.2: IndexedDB Wrapper

```typescript
// frontend/src/lib/indexedDB.ts

const DB_NAME = 'hometracker_db';
const DB_VERSION = 1;

interface DBSchema {
  photos: { id: string; itemId: string; blob: Blob; thumbnail: Blob };
  documents: { id: string; name: string; blob: Blob; metadata: any };
  backups: { id: string; timestamp: string; data: string };
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
    });
  }
  
  async savePhoto(id: string, itemId: string, file: File): Promise<void> {
    if (!this.db) await this.init();
    
    // Create thumbnail
    const thumbnail = await this.createThumbnail(file);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readwrite');
      const store = transaction.objectStore('photos');
      
      store.put({ id, itemId, blob: file, thumbnail });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
  
  async getPhoto(id: string): Promise<Blob | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result?.blob || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  private async createThumbnail(file: File, maxSize = 200): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
  
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }
}

export const indexedDBStorage = new IndexedDBStorage();
```

#### Step 4.3: Hybrid Storage Manager

```typescript
// frontend/src/lib/hybridStorage.ts

import { indexedDBStorage } from './indexedDB';
import { getAllData, saveCollection } from './storage';

export const hybridStorage = {
  // Photos stored in IndexedDB, references in localStorage
  async saveItemPhoto(itemId: string, file: File): Promise<string> {
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    // Save blob to IndexedDB
    await indexedDBStorage.savePhoto(photoId, itemId, file);
    
    // Update item with photo reference
    const data = getAllData();
    const item = data.items.find(i => i.id === itemId);
    if (item) {
      item.photos = [...(item.photos || []), photoId];
      saveCollection('items', data.items);
    }
    
    return photoId;
  },
  
  async getItemPhoto(photoId: string): Promise<string | null> {
    const blob = await indexedDBStorage.getPhoto(photoId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },
  
  // Automatic backup to IndexedDB
  async createBackup(): Promise<string> {
    const data = getAllData();
    const backupId = `backup-${new Date().toISOString()}`;
    
    await indexedDBStorage.saveBackup(backupId, JSON.stringify(data));
    
    return backupId;
  }
};
```

---

## Phase 5: UX & Code Quality

### Issue: U1 - No Onboarding Flow

#### Step 5.1: Onboarding Wizard Component

```typescript
// frontend/src/components/OnboardingWizard.tsx

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<StepProps>;
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to HomeTracker',
    description: 'Let\'s set up your home management system',
    component: WelcomeStep
  },
  {
    id: 'property',
    title: 'Your Property',
    description: 'Enter your property details',
    component: PropertyStep
  },
  {
    id: 'features',
    title: 'Choose Features',
    description: 'Select which features you want to use',
    component: FeaturesStep
  },
  {
    id: 'demo-data',
    title: 'Sample Data',
    description: 'Want to see how it works with sample data?',
    component: DemoDataStep
  }
];
```

### Issue: C2 - No Input Validation

#### Step 5.2: Zod Schema Validation

```typescript
// frontend/src/lib/schemas.ts

import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['backlog', 'planning', 'in-progress', 'on-hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  budget: z.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.string().min(1, 'Category is required'),
  location: z.string().min(1, 'Location is required'),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  // ... more fields
});

// Validation helper
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; errors: Record<string, string> } => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.issues.forEach(issue => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });
  
  return { success: false, errors };
};
```

### Issue: C3 - Missing Error Boundaries

#### Step 5.3: Error Boundary Component

```typescript
// frontend/src/components/ErrorBoundary.tsx

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

---

## Implementation Roadmap

```
Week 1-2: Phase 1 (Storage Consolidation)
├── Day 1-2: Update StorageData interface
├── Day 3-4: Create migration helper
├── Day 5-7: Update affected components
├── Day 8-10: Testing and bug fixes
└── Day 11-14: Documentation and review

Week 3-4: Phase 2 (Migration System)
├── Day 1-3: Create migration framework
├── Day 4-5: Implement migration runner
├── Day 6-8: Add version comparison utilities
├── Day 9-10: Integration testing
└── Day 11-14: Edge case handling

Week 5-7: Phase 3 (Performance)
├── Day 1-3: Debounced saves
├── Day 4-6: Memoization implementation
├── Day 7-10: Code splitting for tldraw
├── Day 11-14: Performance testing
└── Day 15-21: Optimization iteration

Week 8-10: Phase 4 (IndexedDB)
├── Day 1-4: IndexedDB wrapper
├── Day 5-8: Hybrid storage manager
├── Day 9-12: Photo/document handling
├── Day 13-16: Migration from localStorage
└── Day 17-21: Testing and refinement

Week 11-13: Phase 5 (UX & Quality)
├── Day 1-5: Onboarding wizard
├── Day 6-9: Zod validation
├── Day 10-12: Error boundaries
├── Day 13-16: Loading states
└── Day 17-21: Final polish and testing
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | Critical | Auto-backup before migration, rollback capability |
| IndexedDB not supported | Low | High | Fallback to localStorage with size warnings |
| Performance regression | Medium | Medium | Benchmark tests, gradual rollout |
| Breaking changes | Medium | High | Semantic versioning, backward compatibility |

---

## Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Initial load time | ~2s | <1s | Lighthouse |
| Save operation | ~100ms | <50ms | Performance.now() |
| Bundle size | ~2MB | <1MB (initial) | webpack-bundle-analyzer |
| Storage efficiency | N/A | <50% of quota | navigator.storage.estimate() |
| Error rate | Unknown | <0.1% | Error boundary logging |

---

## Appendix: File Changes Summary

| File | Phase | Changes |
|------|-------|---------|
| `frontend/src/lib/storage.ts` | 1, 2, 3 | Major refactor |
| `frontend/src/lib/storageMigration.ts` | 1 | New file |
| `frontend/src/lib/migrations/` | 2 | New directory |
| `frontend/src/lib/indexedDB.ts` | 4 | New file |
| `frontend/src/lib/hybridStorage.ts` | 4 | New file |
| `frontend/src/lib/schemas.ts` | 5 | New file |
| `frontend/src/components/ErrorBoundary.tsx` | 5 | New file |
| `frontend/src/components/OnboardingWizard.tsx` | 5 | New file |
| `frontend/src/pages/HomeInfo.tsx` | 1 | Settings location change |
| `frontend/src/pages/Diagrams.tsx` | 3 | Lazy loading |
| `frontend/src/store/*.ts` | 1, 3 | Selector optimization |

---

*Document Version: 1.0*
*Created: December 21, 2024*
*Last Updated: December 21, 2024*
