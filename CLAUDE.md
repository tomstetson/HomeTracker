# HomeTracker - AI Assistant Context File

> **Purpose**: This file provides continuity for AI coding assistants (Claude, Cursor, Windsurf, etc.) to understand the project's current state, architecture, and roadmap.
> 
> **Last Updated**: 2025-01-02 | **Version**: 2.0.0

---

## 📍 CURRENT STATUS: v2.0 Phase 2.5 Prep Complete

### Latest Session (Jan 2, 2025 - Evening)

**Docker Build & Test** ✅
- ✅ Fixed missing `@supabase/supabase-js` dependency in backend
- ✅ Fixed missing `express-rate-limit` dependency in backend
- ✅ Fixed healthcheck to use `curl` instead of `wget`
- ✅ Removed deprecated `version` attribute from docker-compose.yml
- ✅ Docker container builds and runs healthy
- ✅ All API endpoints tested and working

**Commits:**
- `025fd9d` fix: Use curl instead of wget for healthcheck
- `3360054` fix: Add missing backend dependencies for Docker build
- `417e8dd` docs: Update CLAUDE.md with Jan 2 session progress
- `38fa263` feat: Add validation middleware, Zod schemas, and fix dashboard endpoint

---

## 🔌 PLANNED: PowerTracker Integration (Power Monitoring Module)

**Source**: https://github.com/tomstetson/PowerTracker (Python/Flask)
**Goal**: Integrate Emporia Vue power monitoring as a HomeTracker module

### Integration Architecture
- **Hybrid approach**: Python worker (PyEmVue API) + Node.js (everything else)
- **Single container**: Python process managed by Supervisor alongside Node.js
- **Shared SQLite**: Power tables in hometracker.db

### Data Retention Strategy (Multi-Year Efficient Storage)
| Tier | Resolution | Retention | Size/Year |
|------|------------|-----------|-----------|
| Raw | 2-second | 7 days | ~30 MB |
| Aggregated | 1-minute | 90 days | ~15 MB |
| Historical | Hourly | Forever | ~5 MB |

### Key Features to Port
1. ✅ Live monitoring (2-second polling from Emporia Vue)
2. ✅ Adaptive learning (EMA-based baseline with anomaly detection)
3. ✅ Granular data backup with downsampling
4. ⏳ Integration with existing notification system

### Implementation Phases
- **Phase 1**: Core infrastructure (Python worker, DB migrations) - IN PROGRESS
- **Phase 2**: Data retention & downsampling
- **Phase 3**: Adaptive learning & anomaly detection
- **Phase 4**: API & real-time WebSocket
- **Phase 5**: Frontend UI (Power.tsx page)

### New Database Tables (Planned)
- `power_readings_raw` - 2-second readings (7-day retention)
- `power_readings_1min` - 1-minute aggregates (90-day retention)
- `power_readings_hourly` - Hourly summaries (forever)
- `power_baselines` - Adaptive learning (168 slots: 7 days × 24 hours)
- `power_events` - Detected anomalies
- `power_config` - Emporia credentials and settings

---

**Next Steps:**
1. Implement PowerTracker Phase 1 (Python worker + DB migrations)
2. Implement Maple AI Assistant (Phase 2.5)
3. Tag v2.0 release

### Release State
- **v1.0**: ✅ Complete
- **v2.0 Phase 2.1-2.4**: ✅ Complete (UX, Auth, Automation, Mobile)
- **v2.0 Phase 2.5**: ⏳ Planned (Maple AI Assistant)

### Key Documents
| Document | Purpose |
|----------|---------|
| `docs/V2_ROADMAP.md` | v2.0 phased roadmap with Maple |
| `docs/QUICKSTART.md` | 5-minute setup guide |
| `docs/DEPLOYMENT.md` | Full deployment guide |

---

## 🚀 COMPLETED: Phase 2.1-2.4 (Dec 2024)

### Phase 2.1: UX Polish ✅

#### 1. New UI Components Created

| Component | Location | Purpose |
|-----------|----------|---------|
| `FormSection` | `components/ui/FormSection.tsx` | Collapsible form sections with expand/collapse, icons, badges, data indicators |
| `ImageWithFallback` | `components/ui/ImageWithFallback.tsx` | Smart image loading with skeleton states and graceful error fallback |
| `Progress` | `components/ui/Progress.tsx` | Progress bars + `AIProgress` component for AI job status display |
| `useFormMemory` | `hooks/useFormMemory.ts` | Hook for remembering last-used form values (category, location) |

#### 2. Items.tsx Improvements
- **Quick Add is now primary action** - Button reordered, more prominent
- **Collapsible form sections** - Add Item dialog uses `FormSection` for:
  - Photos (shows badge with count)
  - Purchase Details (brand, model, price, dates)
  - Warranty (provider, dates, coverage)
  - Replacement Tracking (consumables)
- **Basic info always visible** - Name, Category, Location, Condition
- **Mobile-responsive header** - Buttons wrap properly on small screens

#### 3. Maintenance.tsx Improvements
- **Quick Add Task dialog** - Minimal fields: title, category, priority, due date
- **Defaults to 1 week** from today if no date selected
- **Primary/secondary buttons** - Quick Add prominent, Detailed as outline

#### 4. Budget.tsx Improvements
- **Quick Add Transaction dialog** - Type, amount, description, category, date
- **Validation** - Amount must be > 0
- **Smart defaults** - Today's date pre-filled

#### 5. ImageGallery.tsx Improvements
- **ItemThumbnail** now handles image load errors gracefully
- Error state shows placeholder instead of broken image
- Reset error state when image URL changes

### Files Created/Modified

| File | Type | Changes |
|------|------|---------|
| `frontend/src/components/ui/FormSection.tsx` | **NEW** | Collapsible form sections |
| `frontend/src/components/ui/ImageWithFallback.tsx` | **NEW** | Smart image loading |
| `frontend/src/components/ui/Progress.tsx` | **NEW** | Progress bars + AI progress |
| `frontend/src/hooks/useFormMemory.ts` | **NEW** | Form value memory |
| `frontend/src/pages/Items.tsx` | Modified | Quick Add primary, collapsible sections |
| `frontend/src/pages/Maintenance.tsx` | Modified | Quick Add dialog added |
| `frontend/src/pages/Budget.tsx` | Modified | Quick Add dialog added |
| `frontend/src/components/ImageGallery.tsx` | Modified | Better error handling |

### What's Next

From v2.0 Roadmap Phase 2.1 remaining:
1. **Integrate useFormMemory** - Remember last category/location
2. **Enhanced Global Search** - Category grouping in results
3. **AI Progress indicators** - Use new Progress component in AI operations

---

## 🏗️ Architecture Overview

### Tech Stack
```
Frontend:  React 18 + TypeScript + Vite + Tailwind CSS + Zustand
Backend:   Node.js + Express + SQLite (better-sqlite3) + Sharp
AI:        BYOK (OpenAI, Anthropic, Google) - user provides API keys
Storage:   SQLite DB + Local files + WebDAV (NAS backup)
Deploy:    Docker (single container) + Nginx + Supervisor
```

### Database (SQLite with WAL mode)
```
Core Tables:
├── users, properties (multi-user ready)
├── items (FTS5 search), images
├── projects, vendors, maintenance_tasks
├── documents, warranties
├── transactions, budgets
├── diagrams, categories, settings
└── ai_jobs, ai_job_items (batch processing)
```

### Directory Structure
```
HomeTracker/
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   └── ui/         # Reusable primitives (Button, Dialog, FormSection, etc.)
│   │   ├── pages/          # Route components (12 pages)
│   │   ├── store/          # Zustand stores (14 stores)
│   │   ├── hooks/          # Custom hooks (useFormMemory, etc.)
│   │   └── lib/            # Utils, API client, AI service
├── backend/
│   ├── src/
│   │   ├── services/       # Business logic
│   │   │   ├── database.service.ts
│   │   │   ├── image-storage.service.ts
│   │   │   ├── ai-batch-processor.service.ts
│   │   │   ├── backup-scheduler.service.ts
│   │   │   └── storage-providers/
│   │   └── routes/         # API endpoints
├── docs/                   # Documentation
└── docker/                 # Docker configs
```

---

## 📊 Feature Modules

### Frontend Pages (12)

| Page | Route | Key Features |
|------|-------|--------------|
| Dashboard | `/` | Stats, quick actions, AI widget |
| Projects | `/projects` | Kanban board, subtasks, budgets |
| Inventory | `/items` | **Quick Add**, collapsible forms, images, warranties |
| Inventory Wizard | `/inventory-wizard` | AI-powered batch item creation |
| Warranties | `/warranties` | AI document scanning |
| Maintenance | `/maintenance` | **Quick Add**, recurring tasks, history |
| Vendors | `/vendors` | Directory, ratings, categories |
| Documents | `/documents` | Upload, OCR, AI extraction |
| Diagrams | `/diagrams` | TLDraw + Mermaid editors |
| Home Info | `/home-info` | Property, paint colors, emergency contacts |
| Budget | `/budget` | **Quick Add**, transactions, analytics |
| Backup | `/backup` | Providers, schedules, restore |
| Settings | `/settings` | Theme, AI config, data management |

### Backend APIs

| Route | Purpose |
|-------|---------|
| `/api/items/*` | Inventory CRUD |
| `/api/images/*` | Upload, thumbnails, batch |
| `/api/ai-jobs/*` | AI batch processing |
| `/api/storage/*` | Backup management |
| `/api/files/*` | Document upload/OCR |
| `/api/maintenance/*` | Task management |
| `/api/vendors/*` | Vendor directory |
| `/api/projects/*` | Project management |

---

## 🎯 v2.0 Roadmap Progress

### Phase 2.1: UX Polish (Complete)
| Task | Status |
|------|--------|
| FormSection component | ✅ Complete |
| ImageWithFallback component | ✅ Complete |
| Progress/AIProgress component | ✅ Complete |
| useFormMemory hook | ✅ Complete |
| Items.tsx Quick Add + form memory | ✅ Complete |
| Items.tsx collapsible sections | ✅ Complete |
| Maintenance.tsx Quick Add + form memory | ✅ Complete |
| Budget.tsx Quick Add + form memory | ✅ Complete |
| Projects.tsx Quick Add + form memory | ✅ Complete |
| Vendors.tsx Quick Add + form memory | ✅ Complete |
| Image loading states | ✅ Complete |
| AIProgress in InventoryWizard | ✅ Complete |
| Enhanced global search (grouping) | ✅ Already implemented |

### Phase 2.2: Multi-User Foundation (Complete - Optional Auth)
| Task | Status |
|------|--------|
| Auth scaffolding (Supabase-ready) | ✅ Complete |
| Auth store (Zustand) | ✅ Complete |
| Login/Register pages | ✅ Complete |
| Protected routes wrapper | ✅ Complete |
| Backend auth middleware | ✅ Complete |
| Auth toggle (disabled by default) | ✅ Complete |
| Property sharing UI | ⏳ Pending |

**Authentication Mode:**
- **Default:** Auth DISABLED (homelab single-user mode)
- **Optional:** Enable Supabase Auth for multi-user

**To Enable Auth:**
1. Create a Supabase project at https://supabase.com
2. Copy `.env.example` to `.env` in both `frontend/` and `backend/`
3. Set `AUTH_ENABLED=true` (backend) and `VITE_AUTH_ENABLED=true` (frontend)
4. Add your Supabase URL and keys
5. Restart both servers

### Phase 2.3: Smart Automation (Complete)
| Task | Status |
|------|--------|
| Backend notification scheduler service | ✅ Complete |
| Notifications database table | ✅ Complete |
| Notifications API routes | ✅ Complete |
| Warranty expiration checks | ✅ Complete |
| Maintenance due reminders | ✅ Complete |
| Project deadline alerts | ✅ Complete |
| Predictive maintenance (neglected items) | ✅ Complete |
| AI suggestions service | ✅ Complete |
| Category auto-suggest | ✅ Complete |
| Maintenance task suggestions | ✅ Complete |
| Similar items finder | ✅ Complete |

**AI Suggestions API:**
- `GET /api/suggestions/category?name=...` - Auto-suggest category
- `GET /api/suggestions/maintenance?name=...` - Suggest maintenance tasks
- `GET /api/suggestions/predictive` - Get predictive recommendations
- `GET /api/suggestions/similar?name=...` - Find similar items

### Smoke Test (Dec 30, 2024) ✅
**Fixes Applied:**
- `notification-scheduler.service.ts`: Fixed column names (`last_completed`, `related_item_id`, `due_date`)
- `ai-suggestions.service.ts`: Fixed 4 SQL queries to join categories table properly
- `server.ts`: Mounted missing `/api/dashboard` routes
- `frontend/package.json`: Added `"type": "module"` to fix postcss warning

**Performance Results:**
| Metric | Value |
|--------|-------|
| API response time | 0.1-0.3ms (cached), 5-9ms (cold) |
| Backend memory | ~290MB |
| Frontend memory | ~175MB |
| Boot time | <6 seconds |
| All 15+ endpoints | ✅ 200 OK |

### Phase 2.4: Mobile Experience (Complete)
| Task | Status |
|------|--------|
| PWA manifest + service worker | ✅ Configured |
| API caching (NetworkFirst) | ✅ Configured |
| Image caching (CacheFirst) | ✅ Configured |
| BottomSheet component | ✅ Complete |
| ActionSheet component | ✅ Complete |
| MobileNav (bottom tab bar) | ✅ Complete |
| Quick Add FAB | ✅ Complete |
| Safe area support | ✅ Complete |
| SwipeableRow component | ✅ Complete |
| PullToRefresh component | ✅ Complete |
| OfflineIndicator component | ✅ Complete |

**Mobile Components:**
- `BottomSheet.tsx` - Draggable sheet with snap points
- `ActionSheet.tsx` - Quick action menu
- `MobileNav.tsx` - Bottom tab bar with FAB
- `SwipeableRow.tsx` - Swipe-to-action for list items
- `PullToRefresh.tsx` - Pull down to refresh content
- `OfflineIndicator.tsx` - Network status banner

### Phase 2.5: Maple AI Assistant (Planned)
| Task | Status |
|------|--------|
| Maple chat UI component | ⏳ Pending |
| Context-aware conversation engine | ⏳ Pending |
| App feature knowledge base | ⏳ Pending |
| Natural language commands | ⏳ Pending |
| Item/project/maintenance queries | ⏳ Pending |
| Smart suggestions via chat | ⏳ Pending |
| Voice input support | ⏳ Pending |

**Maple Features (Planned):**
- 🍁 Context-aware chatbot branded "Maple"
- Understands all HomeTracker features and data
- Natural language queries: "Show me items expiring soon", "What maintenance is due?"
- Smart actions: "Add a new refrigerator to kitchen inventory"
- Integrated with AI suggestions service
- BYOK support (OpenAI, Anthropic, Google, local LLMs)
- Conversation history and memory

---

## 🔧 Development Commands

```bash
# Start development
cd backend && npm run dev    # Backend on :3001
cd frontend && npm run dev   # Frontend on :3000

# Build
cd frontend && npm run build
cd backend && npm run build

# Docker
docker-compose up --build    # Full stack on :8080

# Security audit
.\scripts\security-audit.ps1
```

---

## 🔒 Security Tools

| Tool | Purpose |
|------|---------|
| npm audit | Dependency vulnerabilities |
| OSV Scanner | Google's vulnerability DB |
| Secretlint | Secret detection |
| ESLint Security | Code patterns |
| CI/CD | Semgrep, Trivy, Gitleaks |

---

## 📝 Key Patterns

### Adding Quick Add to a Page
```tsx
// 1. Add state
const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

// 2. Primary button in header
<Button onClick={() => setIsQuickAddOpen(true)}>
  <Plus /> Quick Add
</Button>
<Button variant="outline" onClick={() => setIsDetailedOpen(true)}>
  <Settings /> Detailed
</Button>

// 3. Minimal dialog with defaults
<Dialog open={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)}>
  <form onSubmit={handleQuickSubmit}>
    {/* Only essential fields */}
  </form>
</Dialog>
```

### Using Collapsible Form Sections
```tsx
import { FormSection } from '../components/ui/FormSection';

<FormSection
  title="Warranty"
  description="Coverage details"
  icon={<Shield className="w-4 h-4" />}
  hasData={!!warranty?.endDate}
  defaultExpanded={false}
>
  {/* Warranty fields */}
</FormSection>
```

### Using Form Memory Hook
```tsx
import { useFormDefaults } from '../hooks/useFormMemory';

const { getDefaults, saveValues } = useFormDefaults('items', defaultItem, ['category', 'location']);

// On form open
const defaults = getDefaults();

// On form submit
saveValues({ category, location });
```

---

## 🚨 Known Issues

1. **React Router v7 warnings** - Deprecation warnings (cosmetic)
2. **Large bundle** - TLDraw adds ~1.5MB (expected)
3. **Auth not implemented** - Single-user mode only

---

## 📚 Documentation Index

| Document | Status | Purpose |
|----------|--------|---------|
| `README.md` | Current | Project overview, quick start |
| `CLAUDE.md` | Current | AI assistant context (this file) |
| `docs/V1_STATUS_REPORT.md` | Current | v1.0 audit |
| `docs/V2_ROADMAP.md` | Current | v2.0 phases |
| `docs/DEPLOYMENT.md` | Current | Docker deployment |
| `docs/QUICKSTART.md` | Current | Setup guide |
| `docs/BACKUP_STRATEGY.md` | Current | Backup best practices |

### Archived (superseded by v2.0 work)
- `docs/V1_ROADMAP.md` - Features now implemented
- `docs/IMPROVEMENT_TRACKER.md` - Superseded by V2_ROADMAP
- `docs/CLEANUP_PLAN.md` - Partially completed
- `docs/ARCHITECTURE_REMEDIATION_PLAN.md` - Superseded by SQLite migration
- `UI_UX_ANALYSIS.md` - Superseded by V2_ROADMAP Phase 2.1

---

## 🤖 AI Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Feature Layer                        │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ GlobalSearch│ AIQueryPanel│ Mermaid Asst│ Document Intel   │
│ (NL Search) │ (Dashboard) │ (Diagrams)  │ (Future)         │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       └─────────────┴─────────────┴───────────────┘
                           │
                    ┌──────▼──────┐
                    │ aiService.ts │ ← sendPrompt(), parseResponse()
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │homeContext.ts│ ← buildHomeContext(), contextToPrompt()
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ OpenAI API  │    │Anthropic API│    │ Gemini API  │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## 💡 Development Tips

### Quick Start
```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Start development servers
cd backend && npm run dev    # Backend on :3001
cd frontend && npm run dev   # Frontend on :5173 (proxies /api to :3001)
```

### Docker Development
```bash
# Full production build
docker-compose up -d

# Development (backend in Docker, frontend local)
docker-compose -f docker-compose.dev.yml up -d
cd frontend && npm run dev
```

### Running Tests
```bash
cd frontend && npm test           # Run all tests
cd frontend && npm run test:ui    # Vitest UI
cd frontend && npm run test:coverage
```

---

## 📦 Dependency Notes

### Frontend Heavy Dependencies
| Package | Size | Purpose | Required |
|---------|------|---------|----------|
| `tldraw` | ~2MB | Diagram editor | Yes - core feature |
| `mermaid` | ~1MB | Code diagrams | Yes - core feature |
| `recharts` | ~500KB | Charts/graphs | Yes - dashboard/budget |
| `framer-motion` | ~150KB | Animations | Optional - can remove |

### Backend Notes
| Package | Purpose | Status |
|---------|---------|--------|
| `passport`, `passport-jwt`, `bcrypt`, `jsonwebtoken` | Auth | Mock only - keep for future |
| `tesseract.js` | OCR | Required - documents |
| `heic-convert` | iOS photos | Required - file uploads |
| `zod` | Schema validation | Required - API validation |

---

*This file is designed to be read by AI assistants. Keep it updated when making significant changes.*

