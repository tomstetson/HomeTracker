# HomeTracker v2.0 Roadmap

**Created:** January 2025  
**Based on:** Comprehensive code review and UI/UX analysis

---

## Vision Statement

HomeTracker v2.0 focuses on **user experience refinement**, **multi-user support**, and **intelligent automation**. The foundation is solid; now we polish and expand.

---

## Release Phases

### Phase 2.1: UX Polish (2-3 weeks)
### Phase 2.2: Multi-User Foundation (3-4 weeks)  
### Phase 2.3: Smart Automation (2-3 weeks)
### Phase 2.4: Mobile Experience (2-3 weeks)

---

## Phase 2.1: UX Polish

### Priority 1: Form Improvements

#### Quick Add Everywhere
**Problem:** Full forms are intimidating for quick data entry.  
**Solution:** Prominent Quick Add buttons across all modules.

| Module | Quick Add Fields | Full Form Access |
|--------|-----------------|------------------|
| Items | Name, Category, Location | "More options" link |
| Maintenance | Title, Due Date, Priority | "Add details" link |
| Projects | Name, Category, Status | "Full form" button |
| Vendors | Business Name, Phone, Category | "Complete profile" link |
| Transactions | Amount, Category, Date | "Add details" link |

**Implementation:**
```typescript
// Pattern: Two-button approach
<div className="flex gap-2">
  <Button onClick={openQuickAdd}>
    <Plus /> Quick Add
  </Button>
  <Button variant="outline" onClick={openFullForm}>
    <Settings /> Detailed Entry
  </Button>
</div>
```

**Effort:** 3-5 days  
**Files:** Items.tsx, Maintenance.tsx, Projects.tsx, Vendors.tsx, Budget.tsx

---

#### Collapsible Form Sections
**Problem:** Long forms with 20+ fields overwhelm users.  
**Solution:** Accordion sections with smart defaults.

```
Basic Info (always expanded)
├── Name, Category, Location

Purchase Details (collapsed)
├── Date, Price, Current Value

Warranty Info (collapsed if empty)
├── Provider, End Date, Coverage

Advanced Options (collapsed)
├── Serial Number, Consumable Info
```

**Implementation:**
```tsx
const [expandedSections, setExpandedSections] = useState(['basic']);

<FormSection 
  title="Warranty Info" 
  expanded={expandedSections.includes('warranty')}
  onToggle={() => toggleSection('warranty')}
  hasData={!!item.warranty?.endDate}
>
  {/* Warranty fields */}
</FormSection>
```

**Effort:** 2-3 days  
**Files:** Items.tsx (Add/Edit dialogs)

---

#### Remember Last Used Values
**Problem:** Users often add items to the same category/location.  
**Solution:** LocalStorage-based form memory.

```typescript
// useFormMemory hook
const useFormMemory = (formKey: string) => {
  const [memory, setMemory] = useState(() => 
    JSON.parse(localStorage.getItem(`form_memory_${formKey}`) || '{}')
  );
  
  const remember = (field: string, value: string) => {
    const updated = { ...memory, [field]: value };
    localStorage.setItem(`form_memory_${formKey}`, JSON.stringify(updated));
    setMemory(updated);
  };
  
  return { lastUsed: memory, remember };
};
```

**Effort:** 1 day  
**Files:** New hook + integration

---

### Priority 2: Visual Feedback

#### Image Loading States
**Problem:** Failed images show broken placeholders.  
**Solution:** Skeleton loaders + graceful fallbacks.

```tsx
const ImageWithFallback = ({ src, alt, fallbackIcon: Icon = Package }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  
  return (
    <div className="relative aspect-square">
      {status === 'loading' && <Skeleton className="absolute inset-0" />}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <img 
        src={src} 
        alt={alt}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={cn(status !== 'loaded' && 'opacity-0')}
      />
    </div>
  );
};
```

**Effort:** 2 days  
**Files:** ImageGallery.tsx, Items.tsx, Documents.tsx

---

#### AI Operation Progress
**Problem:** AI operations feel like black boxes.  
**Solution:** Real-time progress indicators.

```tsx
const AIProgressBar = ({ jobId }: { jobId: string }) => {
  const { job } = useAIJob(jobId);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{job.status}</span>
        <span>{job.processed}/{job.total}</span>
      </div>
      <Progress value={(job.processed / job.total) * 100} />
      <p className="text-xs text-muted-foreground">
        Processing: {job.currentItem}
      </p>
    </div>
  );
};
```

**Effort:** 2 days  
**Files:** AIJobMonitor.tsx, InventoryWizard.tsx

---

### Priority 3: Navigation Improvements

#### Unified Search Enhancement
**Problem:** Global search could be smarter.  
**Solution:** Category-aware search with filters.

```tsx
// Enhanced search results
<CommandList>
  <CommandGroup heading="Items">
    {itemResults.map(item => <SearchResult key={item.id} {...item} />)}
  </CommandGroup>
  <CommandGroup heading="Projects">
    {projectResults.map(project => <SearchResult key={project.id} {...project} />)}
  </CommandGroup>
  <CommandGroup heading="Documents">
    {docResults.map(doc => <SearchResult key={doc.id} {...doc} />)}
  </CommandGroup>
</CommandList>
```

**Effort:** 2 days  
**Files:** GlobalSearch.tsx

---

## Phase 2.2: Multi-User Foundation

### User Authentication System

#### Implementation Plan

1. **Backend Auth Routes** (3 days)
   ```typescript
   // auth.routes.ts - Expand existing stub
   POST /api/auth/register
   POST /api/auth/login
   POST /api/auth/logout
   GET  /api/auth/me
   POST /api/auth/refresh
   ```

2. **JWT Token Management** (2 days)
   - Access tokens (15 min expiry)
   - Refresh tokens (7 day expiry)
   - Secure HTTP-only cookies

3. **Frontend Auth Context** (2 days)
   ```typescript
   const AuthContext = createContext<{
     user: User | null;
     login: (email: string, password: string) => Promise<void>;
     logout: () => void;
     isAuthenticated: boolean;
   }>(null);
   ```

4. **Protected Routes** (1 day)
   ```tsx
   const ProtectedRoute = ({ children }) => {
     const { isAuthenticated, loading } = useAuth();
     
     if (loading) return <LoadingSpinner />;
     if (!isAuthenticated) return <Navigate to="/login" />;
     
     return children;
   };
   ```

5. **User Management UI** (2 days)
   - Login/Register pages
   - Profile settings
   - Password change

**Total Effort:** 10-12 days

---

### Property Sharing

#### Data Model Extension

```typescript
// New: Property sharing model
interface PropertyAccess {
  propertyId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invitedAt: string;
  acceptedAt?: string;
}

// Updated: All entities get property_id foreign key
// (Already exists in schema, just needs enforcement)
```

#### Sharing UI

```tsx
// PropertyShareDialog.tsx
<Dialog title="Share Property">
  <div className="space-y-4">
    <Input 
      label="Invite by email" 
      placeholder="family@example.com" 
    />
    <Select label="Role" options={[
      { value: 'admin', label: 'Admin - Full access' },
      { value: 'member', label: 'Member - Add/edit items' },
      { value: 'viewer', label: 'Viewer - Read only' },
    ]} />
    <Button>Send Invitation</Button>
  </div>
  
  <h3>Current Access</h3>
  <UserList users={propertyUsers} />
</Dialog>
```

**Effort:** 5-7 days

---

## Phase 2.3: Smart Automation

### Intelligent Reminders

#### Notification System Enhancement

```typescript
// notification-scheduler.service.ts
class NotificationScheduler {
  // Warranty expiration (30, 14, 7 days before)
  scheduleWarrantyReminders(warranty: Warranty) {
    const milestones = [30, 14, 7];
    milestones.forEach(days => {
      const notifyDate = subDays(new Date(warranty.endDate), days);
      this.schedule(notifyDate, {
        type: 'warranty_expiring',
        title: `Warranty expiring in ${days} days`,
        body: warranty.itemName,
        actionUrl: `/warranties/${warranty.id}`,
      });
    });
  }
  
  // Maintenance due (day before, day of)
  scheduleMaintenanceReminders(task: MaintenanceTask) { ... }
  
  // Project milestones
  scheduleProjectReminders(project: Project) { ... }
}
```

#### Push Notification Integration

```typescript
// Frontend service worker registration
if ('Notification' in window && 'serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });
  
  await api.savePushSubscription(subscription);
}
```

**Effort:** 5-7 days

---

### AI-Powered Suggestions

#### Smart Categorization

```typescript
// When adding new item, suggest category based on name
const suggestCategory = async (itemName: string) => {
  const embedding = await getEmbedding(itemName);
  const similarItems = await findSimilarItems(embedding);
  
  const categoryCounts = similarItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)
    .slice(0, 3);
};
```

#### Predictive Maintenance

```typescript
// Analyze maintenance history to predict failures
const predictMaintenanceNeeds = async () => {
  const history = await getMaintenanceHistory();
  const items = await getItems();
  
  // Items without recent maintenance
  const neglected = items.filter(item => {
    const lastMaint = history.find(h => h.itemId === item.id);
    if (!lastMaint) return true;
    return daysSince(lastMaint.date) > 365;
  });
  
  // Items with frequent repairs (may need replacement)
  const frequent = items.filter(item => {
    const repairs = history.filter(h => h.itemId === item.id);
    return repairs.length > 3 && averageInterval(repairs) < 90;
  });
  
  return { neglected, frequentRepairs: frequent };
};
```

**Effort:** 7-10 days

---

## Phase 2.4: Mobile Experience

### PWA Enhancements

#### Offline Support

```typescript
// service-worker.ts enhancements
const CACHE_NAME = 'hometracker-v2';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  // Critical CSS/JS bundles
];

// Cache API responses for offline viewing
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetched = fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
          return response;
        });
        return cached || fetched;
      })
    );
  }
});
```

#### Native-like Features

- Add to Home Screen prompt
- Badge API for notification count
- Share Target API for quick adds
- Background sync for offline changes

**Effort:** 5-7 days

---

### Mobile-First Components

#### Bottom Sheet Navigation

```tsx
// Mobile: Bottom nav for quick access
const MobileNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden">
    <div className="flex justify-around py-2">
      <NavItem icon={Home} href="/" label="Home" />
      <NavItem icon={Package} href="/items" label="Items" />
      <NavItem icon={Plus} href="/items?add=true" label="Add" primary />
      <NavItem icon={Wrench} href="/maintenance" label="Tasks" />
      <NavItem icon={Menu} onClick={openMore} label="More" />
    </div>
  </nav>
);
```

#### Swipe Gestures

```tsx
// Swipe to complete task
const TaskCard = ({ task }) => {
  const handlers = useSwipeable({
    onSwipedRight: () => completeTask(task.id),
    onSwipedLeft: () => openEditDialog(task),
  });
  
  return (
    <div {...handlers} className="touch-pan-y">
      <TaskContent task={task} />
    </div>
  );
};
```

**Effort:** 5-7 days

---

## Phase 2.5: Maple AI Assistant

### Overview
**Maple** 🍁 is HomeTracker's context-aware AI assistant that understands all your home data and helps manage your property through natural conversation.

### Core Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Chat UI | Floating chat button + slide-out panel | High |
| Context Engine | Understands all HomeTracker data | High |
| Natural Language Queries | "Show me items expiring soon" | High |
| Smart Actions | "Add refrigerator to kitchen" | High |
| BYOK Support | OpenAI, Anthropic, Google, Local LLMs | High |
| Conversation Memory | Remember context across sessions | Medium |
| Voice Input | Speech-to-text for queries | Medium |
| Proactive Suggestions | "Your AC filter is due for replacement" | Medium |

### Implementation Plan

```typescript
// maple.service.ts
class MapleService {
  // Build context from all HomeTracker data
  async buildContext(): Promise<MapleContext> {
    return {
      items: await getItems(),
      projects: await getProjects(),
      maintenance: await getMaintenanceTasks(),
      warranties: await getWarranties(),
      recentActivity: await getRecentActivity(),
      upcomingReminders: await getUpcomingReminders(),
    };
  }
  
  // Process natural language query
  async chat(message: string, context: MapleContext): Promise<MapleResponse> {
    // Route to appropriate handler based on intent
    const intent = await classifyIntent(message);
    
    switch (intent.type) {
      case 'query': return this.handleQuery(message, context);
      case 'action': return this.handleAction(message, context);
      case 'suggestion': return this.handleSuggestion(message, context);
      default: return this.handleGeneral(message, context);
    }
  }
}
```

### Chat UI Component

```tsx
// MapleChat.tsx
const MapleChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  return (
    <>
      {/* Floating button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-amber-500 rounded-full shadow-lg"
      >
        🍁
      </button>
      
      {/* Chat panel */}
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Maple">
        <ChatMessages messages={messages} />
        <ChatInput onSend={handleSend} />
      </BottomSheet>
    </>
  );
};
```

### Example Interactions

| User Says | Maple Response |
|-----------|----------------|
| "What maintenance is due this week?" | Lists upcoming tasks with action buttons |
| "Add a new Samsung TV to the living room" | Creates item, asks for details |
| "How much have I spent on repairs this year?" | Shows budget summary with chart |
| "My dishwasher is making noise" | Suggests maintenance task, finds warranty info |
| "When does my HVAC warranty expire?" | Shows warranty details and renewal options |

**Effort:** 10-14 days

---

## Feature Backlog (Future Phases)

### v3.0+

| Feature | Description | Priority |
|---------|-------------|----------|
| Room Organization | Assign items/projects to rooms | Medium |
| Calendar Integration | iCal/Google Calendar export | Medium |
| Receipt Scanning | Auto-create items from receipts (extend AI) | High |
| Insurance Reports | Generate home inventory PDF report | High |
| Depreciation Tracking | Track item value over time | Medium |
| Project Templates | Pre-built renovation templates | Low |
| Multi-Property Support | Track multiple homes | Low |

### Removed/Completed Items
| Feature | Status |
|---------|--------|
| ~~Voice Input~~ | Moved to Maple (Phase 2.5) |
| ~~Smart Home Integration~~ | Replaced by Maple AI |
| ~~Contractor Scheduling~~ | Low value, removed |
| ~~Community Templates~~ | Low value, removed |
| ~~Offline Indicator~~ | ✅ Complete (Phase 2.4) |
| ~~Form Memory~~ | ✅ Complete (Phase 2.1) |
| ~~Loading States~~ | ✅ Complete (Phase 2.1) |

---

## Success Metrics

### Phase 2.1 Goals ✅ COMPLETE
- [x] Form completion time reduced by 40% (Quick Add)
- [x] Zero "broken image" occurrences (ImageWithFallback)
- [x] AI operations show progress feedback (AIProgress)

### Phase 2.2 Goals ✅ COMPLETE (Optional Auth Mode)
- [x] Auth scaffolding ready (Supabase)
- [x] Auth toggle (disabled by default for homelab)
- [ ] Property sharing UI (deferred - single user priority)

### Phase 2.3 Goals ✅ COMPLETE
- [x] Notification scheduler service
- [x] Category suggestions working
- [x] Predictive maintenance recommendations

### Phase 2.4 Goals ✅ COMPLETE
- [x] PWA configured with caching
- [x] Offline indicator functional
- [x] Mobile bottom nav + gestures

### Phase 2.5 Goals (Maple AI)
- [ ] Chat UI component
- [ ] Context-aware responses
- [ ] Natural language queries
- [ ] BYOK provider support

---

## Phase 2.6: Technical Debt Resolution (REQUIRED BEFORE MAPLE AI)

> **CRITICAL:** All items marked as **Critical** or **High** priority MUST be completed before starting Phase 2.5 (Maple AI). This ensures a stable, secure, and maintainable foundation for the AI assistant.

---

### TD-1: Test Coverage (Critical Priority)

**Current State:** 11 test files exist in frontend, 0 in backend. ~30% coverage of critical paths.

#### TD-1.1: Frontend Store Tests
**Problem:** Only 4 of 15 stores have unit tests.  
**Impact:** Regressions in state management go undetected.  
**Effort:** 5-7 days

| Store | Has Tests | Priority | Complexity |
|-------|-----------|----------|------------|
| `projectStore.ts` | ✅ | - | - |
| `notificationStore.ts` | ✅ | - | - |
| `inventoryStore.ts` | ✅ | - | - |
| `diagramStore.ts` | ✅ | - | - |
| `authStore.ts` | ❌ | Critical | Medium |
| `budgetStore.ts` | ❌ | High | High |
| `documentStore.ts` | ❌ | High | Medium |
| `maintenanceStore.ts` | ❌ | High | Medium |
| `warrantyStore.ts` | ❌ | High | Medium |
| `vendorStore.ts` | ❌ | Medium | Low |
| `aiSettingsStore.ts` | ❌ | High | Medium |
| `homeVitalsStore.ts` | ❌ | Medium | Low |
| `inventoryStagingStore.ts` | ❌ | Medium | Medium |
| `optionsStore.ts` | ❌ | Low | Low |
| `propertyValueStore.ts` | ❌ | Low | Low |

**Implementation Pattern:**
```typescript
// Example: authStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('should initialize with default state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('should handle login', async () => {
    // Mock Supabase client
    vi.mock('../lib/supabase', () => ({
      supabase: { auth: { signInWithPassword: vi.fn() } }
    }));
    // Test login flow
  });
});
```

**Files to Create:**
- `frontend/src/store/authStore.test.ts`
- `frontend/src/store/budgetStore.test.ts`
- `frontend/src/store/documentStore.test.ts`
- `frontend/src/store/maintenanceStore.test.ts`
- `frontend/src/store/warrantyStore.test.ts`
- `frontend/src/store/vendorStore.test.ts`
- `frontend/src/store/aiSettingsStore.test.ts`
- `frontend/src/store/homeVitalsStore.test.ts`
- `frontend/src/store/inventoryStagingStore.test.ts`
- `frontend/src/store/optionsStore.test.ts`
- `frontend/src/store/propertyValueStore.test.ts`

---

#### TD-1.2: Frontend Library Tests
**Problem:** Only 5 of 12 library files have tests.  
**Impact:** Core utilities may have edge case bugs.  
**Effort:** 3-4 days

| Library | Has Tests | Priority | Notes |
|---------|-----------|----------|-------|
| `notificationService.ts` | ✅ | - | - |
| `propertyValueService.ts` | ✅ | - | - |
| `maintenanceAutomation.ts` | ✅ | - | - |
| `imageAnalysis.ts` | ✅ | - | - |
| `documentExtraction.ts` | ✅ | - | - |
| `api.ts` | ❌ | Critical | Core API layer |
| `aiService.ts` | ❌ | Critical | AI integration |
| `autoSync.ts` | ❌ | High | Data sync logic |
| `dataSync.ts` | ❌ | High | Data sync logic |
| `fileApi.ts` | ❌ | Medium | File operations |
| `homeContext.ts` | ❌ | High | Context builder for AI |
| `realtimeSync.ts` | ❌ | Medium | Real-time updates |

**Files to Create:**
- `frontend/src/lib/api.test.ts`
- `frontend/src/lib/aiService.test.ts`
- `frontend/src/lib/autoSync.test.ts`
- `frontend/src/lib/dataSync.test.ts`
- `frontend/src/lib/fileApi.test.ts`
- `frontend/src/lib/homeContext.test.ts`
- `frontend/src/lib/realtimeSync.test.ts`

---

#### TD-1.3: Backend Unit Tests
**Problem:** Zero test files in backend.  
**Impact:** API regressions, service bugs go undetected.  
**Effort:** 7-10 days

| Service | Priority | Complexity | Test Focus |
|---------|----------|------------|------------|
| `database.service.ts` | Critical | High | CRUD operations, migrations |
| `auth.service.ts` | Critical | Medium | JWT, user management |
| `ai-batch-processor.service.ts` | Critical | High | Job processing, AI calls |
| `image-storage.service.ts` | High | Medium | Upload, thumbnail generation |
| `backup-scheduler.service.ts` | High | Medium | Backup creation, restoration |
| `excel.service.ts` | High | High | Data import/export |
| `notification-scheduler.service.ts` | Medium | Medium | Scheduling, delivery |
| `ai-suggestions.service.ts` | Medium | Medium | Suggestion generation |
| `maintenance-checker.service.ts` | Medium | Low | Due date checking |
| `file.service.ts` | Medium | Low | File operations |
| `email.service.ts` | Low | Low | Email sending |

**Setup Required:**
```bash
# Install test dependencies
cd backend
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

**Add to `backend/package.json`:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

**Implementation Pattern:**
```typescript
// backend/src/services/database.service.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { databaseService } from './database.service';

describe('databaseService', () => {
  beforeAll(() => {
    // Use in-memory SQLite for tests
    process.env.DATABASE_PATH = ':memory:';
  });

  it('should create tables on initialization', () => {
    const tables = databaseService.getTables();
    expect(tables).toContain('items');
    expect(tables).toContain('users');
  });

  it('should perform CRUD operations', () => {
    const item = databaseService.createItem({ name: 'Test', category: 'Test' });
    expect(item.id).toBeDefined();
    
    const retrieved = databaseService.getItem(item.id);
    expect(retrieved.name).toBe('Test');
  });
});
```

**Files to Create:**
- `backend/src/services/database.service.test.ts`
- `backend/src/services/auth.service.test.ts`
- `backend/src/services/ai-batch-processor.service.test.ts`
- `backend/src/services/image-storage.service.test.ts`
- `backend/src/services/backup-scheduler.service.test.ts`
- `backend/src/services/excel.service.test.ts`
- `backend/src/services/notification-scheduler.service.test.ts`

---

#### TD-1.4: E2E Tests with Playwright
**Problem:** No end-to-end tests exist.  
**Impact:** User workflows may break without detection.  
**Effort:** 5-7 days

**Setup:**
```bash
npm init playwright@latest
```

**Critical User Flows to Test:**

| Flow | Priority | Pages Involved |
|------|----------|----------------|
| Authentication (login/logout) | Critical | Login, Register |
| Add item with image | Critical | Items, ImageGallery |
| Create and complete project | High | Projects |
| Add warranty with reminder | High | Warranties |
| Schedule maintenance task | High | Maintenance |
| Backup and restore | High | Backup, Settings |
| AI job creation and monitoring | High | InventoryWizard, AIJobMonitor |
| Global search | Medium | All pages |
| Data export to Excel | Medium | Settings |

**Implementation Pattern:**
```typescript
// e2e/inventory.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Login if auth enabled
  });

  test('should add a new item', async ({ page }) => {
    await page.goto('/items');
    await page.click('button:has-text("Add Item")');
    await page.fill('input[name="name"]', 'Test Refrigerator');
    await page.selectOption('select[name="category"]', 'Appliances');
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('text=Test Refrigerator')).toBeVisible();
  });

  test('should upload image to item', async ({ page }) => {
    await page.goto('/items');
    // ... image upload test
  });
});
```

**Files to Create:**
- `e2e/auth.spec.ts`
- `e2e/inventory.spec.ts`
- `e2e/projects.spec.ts`
- `e2e/warranties.spec.ts`
- `e2e/maintenance.spec.ts`
- `e2e/backup.spec.ts`
- `e2e/ai-jobs.spec.ts`
- `e2e/search.spec.ts`
- `playwright.config.ts`

---

### TD-2: Error Handling (High Priority)

#### TD-2.1: Granular Error Boundaries
**Problem:** Single ErrorBoundary at App level catches all errors with same UI.  
**Impact:** Users lose entire page state on any error; poor UX.  
**Effort:** 2-3 days

**Current State:**
```
App.tsx
└── ErrorBoundary (catches everything)
    └── All Routes
```

**Target State:**
```
App.tsx
└── ErrorBoundary (app-level fallback)
    └── Layout
        └── Each Page with own ErrorBoundary
            └── Critical sections with granular boundaries
```

**Implementation:**
```tsx
// components/PageErrorBoundary.tsx
export const PageErrorBoundary = ({ 
  children, 
  pageName,
  onRetry 
}: { 
  children: ReactNode; 
  pageName: string;
  onRetry?: () => void;
}) => (
  <ErrorBoundary
    fallback={
      <PageErrorFallback 
        pageName={pageName} 
        onRetry={onRetry}
      />
    }
    onError={(error) => {
      // Log to error tracking service
      console.error(`Error in ${pageName}:`, error);
    }}
  >
    {children}
  </ErrorBoundary>
);

// Usage in App.tsx routes
<Route path="/items" element={
  <PageErrorBoundary pageName="Inventory" onRetry={() => window.location.reload()}>
    <Items />
  </PageErrorBoundary>
} />
```

**Pages to Wrap:**
- Dashboard, Items, Projects, Maintenance, Warranties
- Vendors, Documents, Diagrams, HomeInfo, Budget
- Settings, Backup, InventoryWizard

---

#### TD-2.2: Backend Global Error Handler
**Problem:** No centralized error handling; errors swallowed with generic messages.  
**Impact:** Debugging is difficult; inconsistent error responses.  
**Effort:** 1-2 days

**Current Pattern (Bad):**
```typescript
router.post('/', (req, res) => {
  try {
    const item = excelService.createItem(req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create item' });
    // Error details lost!
  }
});
```

**Target Pattern:**
```typescript
// middleware/error.middleware.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.statusCode,
      }
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(500).json({
    success: false,
    error: { message, code: 500 }
  });
};

// Usage in routes
router.post('/', asyncHandler(async (req, res) => {
  const item = await excelService.createItem(req.body);
  if (!item) throw new AppError(400, 'Failed to create item');
  res.json({ success: true, data: item });
}));
```

**Files to Create/Modify:**
- `backend/src/middleware/error.middleware.ts` (new)
- `backend/src/middleware/asyncHandler.ts` (new)
- `backend/src/server.ts` (add error handler)
- All route files (refactor to use asyncHandler)

---

### TD-3: API Security (High Priority)

#### TD-3.1: Rate Limiting
**Problem:** No rate limiting; API vulnerable to abuse/DoS.  
**Impact:** Service can be overwhelmed; resource exhaustion.  
**Effort:** 1 day

**Implementation:**
```typescript
// middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: { message: 'Too many requests, please try again later', code: 429 }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 login attempts per 15 min
  message: {
    success: false,
    error: { message: 'Too many login attempts', code: 429 }
  },
});

// Stricter limit for AI endpoints (expensive operations)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 AI jobs per hour
  message: {
    success: false,
    error: { message: 'AI rate limit exceeded', code: 429 }
  },
});

// server.ts
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/ai-jobs', aiLimiter);
```

**Dependencies to Add:**
```bash
cd backend
npm install express-rate-limit
```

---

#### TD-3.2: Input Validation with Zod
**Problem:** No schema validation on API inputs.  
**Impact:** Invalid data can corrupt database; potential injection vectors.  
**Effort:** 3-4 days

**Implementation Pattern:**
```typescript
// schemas/item.schema.ts
import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  location: z.string().max(200).optional(),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().positive().optional(),
  currentValue: z.number().positive().optional(),
  serialNumber: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateItemSchema = createItemSchema.partial();

// middleware/validate.middleware.ts
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: result.error.flatten(),
        }
      });
    }
    req.body = result.data; // Use validated/transformed data
    next();
  };
};

// Usage in routes
router.post('/', validate(createItemSchema), (req, res) => {
  // req.body is now validated and typed
});
```

**Schemas to Create:**
- `backend/src/schemas/item.schema.ts`
- `backend/src/schemas/project.schema.ts`
- `backend/src/schemas/warranty.schema.ts`
- `backend/src/schemas/maintenance.schema.ts`
- `backend/src/schemas/vendor.schema.ts`
- `backend/src/schemas/document.schema.ts`
- `backend/src/schemas/ai-job.schema.ts`
- `backend/src/schemas/auth.schema.ts`

**Dependencies to Add:**
```bash
cd backend
npm install zod
```

---

#### TD-3.3: CORS Configuration
**Problem:** CORS allows all origins (`origin: true`).  
**Impact:** Any site can make requests to the API.  
**Effort:** 0.5 days

**Current (Insecure):**
```typescript
app.use(cors({ origin: true, credentials: true }));
```

**Target (Secure with Homelab Flexibility):**
```typescript
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'http://localhost:8080',
  ];
  
  // Add configured origins from env
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }
  
  // For homelab: allow same-network requests
  if (process.env.ALLOW_LAN === 'true') {
    return (origin: string | undefined, callback: Function) => {
      // Allow requests with no origin (same-origin, mobile apps, curl)
      if (!origin) return callback(null, true);
      
      // Allow configured origins
      if (origins.includes(origin)) return callback(null, true);
      
      // Allow LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const lanPattern = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
      if (lanPattern.test(origin)) return callback(null, true);
      
      callback(new Error('Not allowed by CORS'));
    };
  }
  
  return origins;
};

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

### TD-4: API Documentation (Medium Priority)

#### TD-4.1: OpenAPI/Swagger Documentation
**Problem:** No formal API documentation; 17 route files undocumented.  
**Impact:** Difficult for future development; no API contract.  
**Effort:** 3-4 days

**Implementation:**
```bash
cd backend
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

```typescript
// swagger.ts
import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HomeTracker API',
      version: '2.0.0',
      description: 'API for HomeTracker home management application',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/schemas/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);

// server.ts
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**Route Documentation Pattern:**
```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get all items
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Item'
 */
router.get('/', (req, res) => { ... });
```

**Routes to Document:**
- `item.routes.ts` - Items CRUD
- `warranty.routes.ts` - Warranties CRUD
- `maintenance.routes.ts` - Maintenance tasks
- `project.routes.ts` - Projects CRUD
- `vendor.routes.ts` - Vendors CRUD
- `document.routes.ts` - Documents CRUD
- `images.routes.ts` - Image upload/management
- `ai-jobs.routes.ts` - AI job management
- `storage.routes.ts` - Storage providers
- `auth.routes.ts` - Authentication
- `sync.routes.ts` - Data sync
- `property.routes.ts` - Property management
- `notifications.routes.ts` - Notifications
- `suggestions.routes.ts` - AI suggestions
- `excel.routes.ts` - Excel export
- `file.routes.ts` - File operations
- `dashboard.routes.ts` - Dashboard data

---

### TD-5: Code Quality (Medium Priority)

#### TD-5.1: Resolve TODO Comments
**Problem:** Unfinished functionality marked with TODO.  
**Impact:** Features incomplete or forgotten.  
**Effort:** 1-2 days

| Location | TODO | Priority | Action |
|----------|------|----------|--------|
| `backup-scheduler.service.ts:457` | "Implement actual data restoration" | High | Complete backup restore feature |

**Implementation for Backup Restore:**
```typescript
async restoreBackup(filename: string): Promise<{ success: boolean; message: string }> {
  const backupPath = path.join(this.localBackupDir, filename);
  
  if (!fs.existsSync(backupPath)) {
    return { success: false, message: 'Backup file not found' };
  }

  try {
    // 1. Create safety backup of current data
    await this.createSafetyBackup();
    
    // 2. Extract backup archive
    const tempDir = path.join(this.localBackupDir, 'restore_temp');
    await this.extractBackup(backupPath, tempDir);
    
    // 3. Validate backup structure
    const isValid = await this.validateBackupStructure(tempDir);
    if (!isValid) {
      throw new Error('Invalid backup structure');
    }
    
    // 4. Stop background services
    this.pauseScheduler();
    
    // 5. Replace database
    const dbBackup = path.join(tempDir, 'hometracker.db');
    if (fs.existsSync(dbBackup)) {
      databaseService.close();
      fs.copyFileSync(dbBackup, databaseService.getDbPath());
      databaseService.reconnect();
    }
    
    // 6. Replace uploads
    const uploadsBackup = path.join(tempDir, 'uploads');
    if (fs.existsSync(uploadsBackup)) {
      fs.rmSync(this.uploadsDir, { recursive: true, force: true });
      fs.cpSync(uploadsBackup, this.uploadsDir, { recursive: true });
    }
    
    // 7. Restart services
    this.resumeScheduler();
    
    // 8. Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return { success: true, message: `Restored from ${filename}` };
  } catch (error) {
    // Attempt to restore from safety backup
    await this.restoreSafetyBackup();
    return { success: false, message: `Restore failed: ${error.message}` };
  }
}
```

---

#### TD-5.2: Consistent Error Messages
**Problem:** Error messages vary in format across routes.  
**Impact:** Frontend error handling is inconsistent.  
**Effort:** 1 day

**Current (Inconsistent):**
```typescript
// Some routes
res.status(500).json({ success: false, error: 'Failed to get items' });

// Other routes
res.status(500).json({ success: false, error: { message: 'Failed' } });

// Yet others
res.status(500).json({ error: 'Something went wrong' });
```

**Target (Consistent):**
```typescript
// All error responses follow this structure
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: number;
    details?: unknown; // Validation errors, etc.
  };
}

// Create helper
const errorResponse = (res: Response, status: number, message: string, details?: unknown) => {
  res.status(status).json({
    success: false,
    error: { message, code: status, details }
  });
};
```

---

### TD-6: Performance (Low Priority)

#### TD-6.1: Database Query Optimization
**Problem:** Some queries may be inefficient as data grows.  
**Impact:** Slow response times with large datasets.  
**Effort:** 2-3 days (when needed)

**Items to Review:**
- Add indexes for common query patterns
- Implement pagination for list endpoints
- Add query caching for frequently accessed data

---

### Technical Debt Tracking Summary

| ID | Item | Priority | Effort | Status |
|----|------|----------|--------|--------|
| **TD-1.1** | Frontend store tests | Critical | 5-7 days | ⏳ Pending |
| **TD-1.2** | Frontend library tests | Critical | 3-4 days | ⏳ Pending |
| **TD-1.3** | Backend unit tests | Critical | 7-10 days | 🔄 In Progress (100 tests) |
| **TD-1.4** | E2E tests (Playwright) | High | 5-7 days | ⏳ Pending |
| **TD-2.1** | Granular error boundaries | High | 2-3 days | ✅ Complete |
| **TD-2.2** | Backend error handler | High | 1-2 days | ✅ Complete |
| **TD-3.1** | Rate limiting | High | 1 day | ✅ Complete |
| **TD-3.2** | Input validation (Zod) | High | 3-4 days | ✅ Complete |
| **TD-3.3** | CORS configuration | High | 0.5 days | ✅ Complete |
| **TD-4.1** | API documentation | Medium | 3-4 days | ⏳ Pending |
| **TD-5.1** | Resolve TODOs | Medium | 1-2 days | ⏳ Pending |
| **TD-5.2** | Consistent error messages | Medium | 1 day | ⏳ Pending |
| **TD-6.1** | Database optimization | Low | 2-3 days | ⏳ Deferred |

**Total Estimated Effort:** 35-50 days (~9 days completed)

**Recommended Order:**
1. **Week 1-2:** TD-3.1 (Rate limiting), TD-3.2 (Validation), TD-3.3 (CORS), TD-2.2 (Backend errors)
2. **Week 3-4:** TD-1.3 (Backend tests), TD-2.1 (Error boundaries)
3. **Week 5-6:** TD-1.1 (Store tests), TD-1.2 (Library tests)
4. **Week 7-8:** TD-1.4 (E2E tests), TD-4.1 (API docs)
5. **Week 9:** TD-5.1 (TODOs), TD-5.2 (Error messages)

---

## Conclusion

HomeTracker v2.0 has achieved all core phase goals (2.1-2.4). **Phase 2.6 (Technical Debt Resolution) is now REQUIRED before proceeding to Phase 2.5 (Maple AI).** This ensures Maple is built on a stable, secure, and well-tested foundation.

**Phase Status:**
- Phase 2.1-2.4: ✅ Complete
- **Phase 2.6: ⏳ In Progress (Technical Debt - REQUIRED)**
- Phase 2.5: 🔒 Blocked (Maple AI - waiting on Phase 2.6)
- v3.0+: Future backlog

**Critical Path to Maple AI:**
```
Phase 2.6 Technical Debt (35-50 days)
├── TD-3: API Security (Week 1-2) ──────────┐
├── TD-2: Error Handling (Week 2) ──────────┤
├── TD-1.3: Backend Tests (Week 3-4) ───────┤
├── TD-1.1-1.2: Frontend Tests (Week 5-6) ──┼──► Phase 2.5: Maple AI (10-14 days)
├── TD-1.4: E2E Tests (Week 7-8) ───────────┤
└── TD-4-5: Docs & Quality (Week 9) ────────┘
```
