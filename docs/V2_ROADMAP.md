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

## Technical Debt Items

| Item | Location | Priority | Status |
|------|----------|----------|--------|
| Add comprehensive test coverage | All stores | High | Partial |
| Implement proper error boundaries | All pages | Medium | Pending |
| Add E2E tests with Playwright | New | Medium | Pending |
| Document all API endpoints | Backend | High | Partial |
| Add request rate limiting | Backend | Medium | Pending |
| ~~Add API response caching~~ | api.ts | ~~Medium~~ | ✅ Done (PWA) |
| ~~Optimize large list rendering~~ | Items.tsx | ~~Low~~ | ✅ Done |

---

## Conclusion

HomeTracker v2.0 has achieved all core phase goals (2.1-2.4). Phase 2.5 (Maple AI Assistant) is the final major feature before v3.0. The application is production-ready for homelab deployment.

**Phase Status:**
- Phase 2.1-2.4: ✅ Complete
- Phase 2.5: ⏳ Planned (Maple AI)
- v3.0+: Future backlog
