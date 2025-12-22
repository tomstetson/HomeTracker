# HomeTracker - AI Assistant Context File

> **Purpose**: This file provides continuity for AI coding assistants (Claude Code, Cursor, Windsurf, etc.) to understand the project's current state, implemented features, and future roadmap.
> 
> **Last Updated**: 2024-12-22 | **Version**: 2.0.0

---

## 🚀 SESSION SUMMARY: Dec 22, 2024 - Major SQLite & Storage Architecture Upgrade

### What Was Accomplished

This session implemented a **complete backend storage overhaul** transforming HomeTracker from a simple JSON-file app into a scalable, AI-powered home management system ready for homelab deployment.

#### 1. SQLite Database Implementation (`database.service.ts`)
- **Full relational schema** with 15+ tables
- WAL mode for performance
- FTS5 full-text search on inventory items
- Automatic schema migrations with versioning
- Tables: users, properties, items, images, ai_jobs, projects, vendors, maintenance_tasks, documents, warranties, transactions, budgets, diagrams, categories, settings, sync_log

#### 2. Image Storage System (`image-storage.service.ts`)
- Single and batch image uploads (100+ at once)
- Automatic thumbnail generation via Sharp
- EXIF rotation handling
- Base64 encoding for AI APIs
- Storage stats and orphan cleanup

#### 3. AI Batch Processing (`ai-batch-processor.service.ts`)
- **BYOK Support**: OpenAI, Anthropic, Google
- **Analysis Types**:
  - `inventory_detection` - Auto-create items with category, brand, condition
  - `warranty_detection` - Extract warranty info from labels/receipts
  - `appliance_identification` - Identify tools/appliances + maintenance schedules
  - `receipt_scan` - Parse purchase receipts
  - `condition_assessment` - Assess item condition
- Job queue with progress tracking
- Auto-create inventory items from analysis
- Cost estimation per job

#### 4. Storage Provider System (`storage-providers/`)
- **Pluggable architecture** for multiple backends
- `LocalStorageProvider` - Default, always available
- `WebDAVStorageProvider` - NAS support (Synology, QNAP, Nextcloud)
- Easy to extend with S3, Google Drive, OneDrive

#### 5. Backup Scheduler (`backup-scheduler.service.ts`)
- Cron-based automated backups
- Multi-provider destinations
- Configurable retention policies
- Compression (gzip) support
- Progress tracking and logging

### New API Endpoints

```
# Images
POST /api/images/upload           # Single image
POST /api/images/batch-upload     # Batch with AI job creation
GET  /api/images/:id              # Get image
GET  /api/images/:id/thumbnail    # Get thumbnail

# AI Jobs
POST /api/ai-jobs                 # Create analysis job
GET  /api/ai-jobs/:id             # Job status
POST /api/ai-jobs/configure       # Set AI provider
POST /api/ai-jobs/analyze-single  # Single image analysis

# Storage & Backup
POST /api/storage/providers/webdav   # Configure NAS
GET  /api/storage/providers          # List providers
POST /api/storage/schedules          # Create backup schedule
POST /api/storage/schedules/:id/run  # Run backup now
GET  /api/storage/backups            # List all backups
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        HomeTracker v2.0                         │
├─────────────────────────────────────────────────────────────────┤
│  SQLite Database (WAL mode)                                     │
│  ├── items + FTS5 search                                        │
│  ├── images with AI metadata                                    │
│  ├── ai_jobs / ai_job_items (batch processing)                  │
│  ├── warranties (linked to items)                               │
│  └── maintenance_tasks (with AI suggestions)                    │
├─────────────────────────────────────────────────────────────────┤
│  Storage Providers (pluggable)                                  │
│  ├── LocalStorageProvider (default)                             │
│  ├── WebDAVStorageProvider (NAS: Synology/QNAP/Nextcloud)       │
│  └── [Future: S3, Google Drive, OneDrive]                       │
├─────────────────────────────────────────────────────────────────┤
│  Backup Scheduler                                               │
│  ├── Cron-based automation                                      │
│  ├── Multi-provider destinations                                │
│  └── Retention policies + compression                           │
├─────────────────────────────────────────────────────────────────┤
│  AI Batch Processor (BYOK)                                      │
│  ├── inventory_detection    → Auto-create items                 │
│  ├── warranty_detection     → Extract warranty info             │
│  ├── appliance_identification → Tools + maintenance schedules   │
│  └── Providers: OpenAI, Anthropic, Google                       │
└─────────────────────────────────────────────────────────────────┘
```

### Files Created/Modified

| File | Type | Purpose |
|------|------|---------|
| `backend/src/services/database.service.ts` | New | SQLite schema + migrations |
| `backend/src/services/image-storage.service.ts` | New | Image upload + thumbnails |
| `backend/src/services/ai-batch-processor.service.ts` | New | AI batch processing |
| `backend/src/services/backup-scheduler.service.ts` | New | Automated backups |
| `backend/src/services/storage-providers/index.ts` | New | Provider interface |
| `backend/src/services/storage-providers/local.provider.ts` | New | Local filesystem |
| `backend/src/services/storage-providers/webdav.provider.ts` | New | NAS/WebDAV |
| `backend/src/routes/images.routes.ts` | New | Image API |
| `backend/src/routes/ai-jobs.routes.ts` | New | AI jobs API |
| `backend/src/routes/storage.routes.ts` | New | Storage/backup API |
| `backend/src/server.ts` | Modified | Added new routes |
| `backend/Dockerfile` | Modified | Added Sharp/SQLite deps |
| `docker-compose.yml` | Modified | Image volumes, AI env vars |
| `docs/STORAGE_ARCHITECTURE_RECOMMENDATIONS.md` | New | Architecture doc |

### Dependencies Added (Backend)
- `better-sqlite3` - SQLite database
- `sharp` - Image processing
- `webdav` - NAS connectivity
- `node-cron` - Scheduled backups
- `uuid` - ID generation

### What's Next (Recommended Priority)

1. **Frontend Image Upload Component** - Create unified upload UI for inventory/warranty
2. **Frontend AI Job Status UI** - Show progress, results, create items from analysis
3. **Frontend Storage Settings** - Configure NAS, view backups, run manual backup
4. **Integrate AI into Inventory Page** - Batch upload photos → auto-categorize
5. **Integrate AI into Warranty Page** - Scan warranty cards/receipts

### Docker Deployment Ready

```bash
# Configure NAS backup
curl -X POST http://localhost:3001/api/storage/providers/webdav \
  -d '{"name":"nas","url":"https://nas.local:5006","username":"user","password":"pass"}'

# Create daily backup schedule  
curl -X POST http://localhost:3001/api/storage/schedules \
  -d '{"name":"Daily NAS","provider":"nas","schedule":"0 2 * * *","retentionDays":30}'

# Batch upload inventory photos with AI analysis
curl -X POST http://localhost:3001/api/images/batch-upload \
  -F "images=@photo1.jpg" -F "images=@photo2.jpg" \
  -F "entityType=item" -F "createAIJob=true"
```

---

## 🏠 Project Overview

**HomeTracker** is a self-hosted home management application designed for homelabbers. It provides a single source of truth for tracking all aspects of home ownership including projects, inventory, maintenance, warranties, vendors, documents, diagrams, and budgets.

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite 7, Tailwind CSS, Zustand (state management)
- **Backend**: Node.js 20, Express.js, SQLite (better-sqlite3), Sharp (images)
- **Database**: SQLite with WAL mode, FTS5 full-text search
- **Storage**: SQLite DB + JSON export + Image files (local/NAS/cloud)
- **Deployment**: Docker (multi-stage build), Nginx, Supervisor
- **Special Libraries**: tldraw (diagrams), mermaid (code diagrams), Tesseract.js (OCR), DOMPurify (XSS protection)
- **AI Integration**: BYOK (Bring Your Own Key) support for OpenAI, Anthropic (Claude), Google Gemini
- **Security**: ESLint security plugin, Secretlint, OSV Scanner, Semgrep (CI), Gitleaks, Trivy

### Key Directories
```
HomeTracker/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main page components (11 pages)
│   │   ├── store/         # Zustand stores (14 stores)
│   │   ├── lib/           # Utilities, services, API helpers
│   │   └── test/          # Test setup and utilities
├── backend/               # Express.js backend
│   ├── src/
│   │   ├── services/      # Business logic (excel, file, email, maintenance-checker)
│   │   └── routes/        # API routes (12 route files)
├── docs/                  # Documentation (7 docs)
├── docker/                # Docker configs, nginx, supervisor
├── scripts/               # PowerShell scripts (security-audit)
└── .github/workflows/     # CI/CD (ci.yml, security.yml)
```

---

## 🔒 Security Infrastructure

### Local Security Tools
| Tool | Purpose | Command |
|------|---------|---------|
| **npm audit** | Dependency vulnerabilities | `npm audit` |
| **OSV Scanner** | Google's vulnerability DB | `osv-scanner --lockfile package-lock.json` |
| **Secretlint** | Secret detection | `npx secretlint "src/**/*"` |
| **ESLint Security** | Code security patterns | `npm run lint` |

### CI/CD Security (GitHub Actions)
- **security.yml**: OSV Scanner, Semgrep, Trivy, Gitleaks, npm audit
- **ci.yml**: Tests, linting, secretlint, builds

### Pre-commit Hooks (Husky + lint-staged)
- Secretlint on all staged files
- npm audit on backend/frontend changes

### Running Full Security Audit
```powershell
.\scripts\security-audit.ps1        # Full audit
.\scripts\security-audit.ps1 -Fix   # Auto-fix npm vulnerabilities
```

---

## ✅ Implemented Features (v1.8.0)

### Core Modules

| Module | File | Key Features |
|--------|------|--------------|
| **Dashboard** | `pages/Dashboard.tsx` | Stats cards, quick actions, recent projects, needs attention |
| **Projects** | `pages/Projects.tsx` | Kanban board (5 columns), drag-drop, subtasks, tags, budgets, mobile list view |
| **Inventory** | `pages/Items.tsx` | Items with warranties, categories, sell tracking, soft delete/trash (180-day retention) |
| **Inventory Wizard** | `pages/InventoryWizard.tsx` | Step-by-step guided inventory creation |
| **Maintenance** | `pages/Maintenance.tsx` | Tasks/History tabs, list/card views, recurring tasks, skip cycle, undo complete |
| **Vendors** | `pages/Vendors.tsx` | Vendor directory with ratings, custom categories, preferred filter |
| **Documents** | `pages/Documents.tsx` | File upload, OCR text extraction, category filtering, AI extraction |
| **Diagrams** | `pages/Diagrams.tsx` | tldraw editor, Mermaid code diagrams, zoom controls, PNG/SVG export, inventory integration, 7 diagram types, keyboard shortcuts |
| **Home Info** | `pages/HomeInfo.tsx` | Property details, value tracking, paint colors, emergency contacts |
| **Budget** | `pages/Budget.tsx` | Transaction tracking, income/expenses, category budgets, analytics, recurring transactions |
| **Settings** | `pages/Settings.tsx` | Theme toggle, API privacy, data export/import, backup, notification preferences |

### State Management (Zustand Stores)

| Store | File | Purpose |
|-------|------|---------|
| `useProjectStore` | `store/projectStore.ts` | Projects with subtasks |
| `useInventoryStore` | `store/inventoryStore.ts` | Items, categories, warranties, sales |
| `useMaintenanceStore` | `store/maintenanceStore.ts` | Tasks, history, service records |
| `useVendorStore` | `store/vendorStore.ts` | Vendor directory |
| `useDocumentStore` | `store/documentStore.ts` | Document metadata, OCR text |
| `useDiagramStore` | `store/diagramStore.ts` | Diagrams with tldraw/Mermaid data |
| `useHomeVitalsStore` | `store/homeVitalsStore.ts` | Property info, emergency contacts |
| `useOptionsStore` | `store/optionsStore.ts` | User-customizable dropdown options |
| `useWarrantyStore` | `store/warrantyStore.ts` | Standalone warranties (legacy) |
| `useAISettingsStore` | `store/aiSettingsStore.ts` | AI provider config, BYOK API keys |
| `useBudgetStore` | `store/budgetStore.ts` | Transactions, budgets, analytics |
| `useNotificationStore` | `store/notificationStore.ts` | In-app notifications, preferences |
| `usePropertyValueStore` | `store/propertyValueStore.ts` | Home value history tracking |

### UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `Layout` | `components/Layout.tsx` | App shell with sidebar navigation |
| `GlobalSearch` | `components/GlobalSearch.tsx` | Ctrl+K search dialog with AI natural language |
| `AIQueryPanel` | `components/AIQueryPanel.tsx` | Reusable AI chat component for any page |
| `MermaidAIAssistant` | `components/MermaidAIAssistant.tsx` | AI chat for diagram help |
| `DocumentExtractionModal` | `components/DocumentExtractionModal.tsx` | AI-powered document data extraction |
| `EditableSelect` | `components/ui/EditableSelect.tsx` | Dropdowns with add/edit/remove |
| `TagInput` | `components/ui/TagInput.tsx` | Tag management with suggestions |
| `Toast` | `components/ui/Toast.tsx` | Notification system |

### AI Services (lib/)

| Service | File | Purpose |
|---------|------|---------|
| `homeContext.ts` | `lib/homeContext.ts` | Aggregates all stores into AI-ready context |
| `aiService.ts` | `lib/aiService.ts` | LLM API calls, prompts, response parsing |

### Backend Services

| Service | File | Purpose |
|---------|------|---------|
| `excel.service.ts` | `backend/src/services/` | Real-time Excel export |
| `file.service.ts` | `backend/src/services/` | File upload, OCR processing |
| `sync.routes.ts` | `backend/src/routes/` | Data synchronization API |
| `email.service.ts` | `backend/src/services/` | Email notifications |
| `maintenance-checker.service.ts` | `backend/src/services/` | Daily maintenance checks |

### Diagram System Categories

The diagram system (`diagramStore.ts`) supports these categories:
- `network` - Network Diagram 🌐
- `plumbing` - Plumbing Layout 🚿
- `electrical` - Electrical Layout ⚡
- `floor-plan` - Floor Plan 🏠
- `hvac` - HVAC System ❄️
- `yard` - Yard / Landscape 🌳
- `other` - Other 📋

---

## 🔧 Current Data Models

### InventoryItem (inventoryStore.ts)
```typescript
interface InventoryItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  location: string;          // Where the item is located
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  photos: string[];
  tags: string[];
  warranty?: ItemWarranty;   // Embedded warranty
  status: 'active' | 'sold' | 'deleted';
  sale?: SaleRecord;         // For sold items
  consumableInfo?: ConsumableInfo; // For replacement parts
  deletedAt?: string;        // Soft delete timestamp
}

interface ConsumableInfo {
  isConsumable: boolean;                    // This is a consumable/replacement part
  replacementStorageLocation?: string;      // Where spares are stored (e.g., "Garage cabinet")
  stockQuantity?: number;                   // How many spares on hand
  reorderUrl?: string;                      // URL to reorder (Amazon, etc.)
  reorderThreshold?: number;                // Alert when stock drops below this
  linkedApplianceId?: string;               // ID of the appliance this part is for
  replacementIntervalMonths?: number;       // How often to replace (e.g., 6 months)
  lastReplacedDate?: string;                // When it was last replaced
  nextReplacementDate?: string;             // Auto-calculated next replacement
}
```

### MaintenanceTask (maintenanceStore.ts)
```typescript
interface MaintenanceTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string;
  recurrence?: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'none';
  status: 'pending' | 'completed';
  assignedTo?: string;
  estimatedCost?: number;
  actualCost?: number;
  completedDate?: string;
  completedBy?: string;
  completionNotes?: string;
  serviceHistory?: ServiceHistoryEntry[];
}
```

### Project (projectStore.ts)
```typescript
interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'backlog' | 'planning' | 'in-progress' | 'on-hold' | 'completed';
  priority: 'high' | 'medium' | 'low';
  budget: number;
  actualCost: number;
  startDate: string;
  endDate: string;
  progress: number;
  tags: string[];
  subtasks?: Subtask[];
}
```

---

## 📋 TODO - Features to Implement

### High Priority
- [x] ~~**Inventory Part Storage Location** - Track where replacement parts are stored (e.g., "garage cabinet") for maintenance reminders~~ ✅ v1.4.0
- [ ] **Maintenance Notifications** - Email/SMS alerts when maintenance is due (with part location info)
- [ ] **PWA Support** - Progressive Web App for mobile installation
- [x] ~~**Recurring Inventory Items** - Track consumables (filters, batteries) with restock reminders~~ ✅ v1.4.0

### Medium Priority
- [ ] **Floor Plan Templates** - Pre-built floor plan shapes in diagram editor
- [ ] **Multi-Property Support** - Manage multiple homes/properties
- [x] ~~**Receipt Scanning** - OCR with automatic data extraction~~ ✅ v1.7.0 (Document Intelligence)
- [ ] **Vendor Reviews** - Rate vendors after service calls
- [ ] **Budget Tracking** - Overall home budget with category breakdown

### Low Priority / Future
- [ ] **Multi-User Support** - Family member accounts
- [ ] **PostgreSQL Backend** - Optional database for larger deployments
- [ ] **Mobile App** - Native iOS/Android apps
- [ ] **Smart Home Integration** - Connect to Home Assistant, Google Home

---

## 🧪 Testing Notes

### Manual Test Checklist
1. **Dashboard** - Stats accurate, quick actions navigate correctly
2. **Projects** - Kanban drag-drop, subtask completion, tag management
3. **Inventory** - Add/edit/delete items, sell workflow, trash/restore
4. **Maintenance** - Add task, complete with details, skip cycle, view history
5. **Vendors** - Add vendor, category management, preferred toggle
6. **Documents** - File upload, OCR text appears in search, AI extraction button works
7. **Diagrams** - Create new, add inventory items, save, export PNG
8. **Home Info** - All tabs save correctly, paint colors, emergency contacts
9. **Settings** - Theme toggle, data export/import works
10. **Global Search** - Ctrl+K searches all data types

### Build Commands
```bash
# Frontend build (from /frontend)
npm run build

# Backend build (from /backend)
npm run build

# Docker build
docker build -t hometracker .
```

---

## 📝 Recent Changes (Last 5 Versions)

### v1.7.0 (2024-12-11)
- **Document Intelligence** - AI-powered data extraction from documents
  - `documentExtraction.ts` - Extraction types and parsing utilities
  - `DocumentExtractionModal.tsx` - Editable extraction results with one-click record creation
  - Extract vendors, items, receipts, warranties, and maintenance from OCR text
  - Smart matching suggestions for existing inventory/vendors
  - Automatic record linking to source documents
  - Feature toggle `enableDocumentIntelligence` in AI settings
- **Enhanced Document Store** - Extended with AI extraction fields
  - `aiExtracted` - Cached extraction results
  - `linkedRecords` - Track records created from documents

### v1.6.0 (2024-12-11)
- **AI Core Infrastructure** - Foundation for all AI features
  - `homeContext.ts` - Aggregates all stores into structured AI context
  - Enhanced `aiService.ts` with generic `sendPrompt()`, response parsing
  - `contextToPrompt()` and `contextToCompactJSON()` for AI prompts
- **Natural Language Search** - Ask questions in GlobalSearch (Ctrl+K)
  - Detects natural language queries automatically
  - "Ask AI Assistant" button for intelligent answers
  - Integrated into existing search modal
- **AI Query Panel Component** - Reusable chat component
  - Floating panel on Dashboard (when AI enabled)
  - Context-aware quick actions per page
  - Chat history within session
- **AI Feature Toggles** - Granular control in Settings
  - Natural Language Search
  - Document Intelligence
  - Maintenance Automation
  - Smart Home Assistant
  - Assistant Schedule (manual/daily/weekly)
- **HomeContext Builder** - Full home state for AI
  - Inventory with warranties, consumables, low stock
  - Maintenance with overdue, upcoming, by priority
  - Projects with active, stalled, budget tracking
  - Vendors with preferred, by category
  - Summary with needs attention, deadlines

### v1.5.0 (2024-12-10)
- **AI-Powered Diagram Assistant** - BYOK LLM integration for Mermaid diagrams
  - Support for OpenAI, Anthropic (Claude), Google Gemini
  - Chat interface for diagram help and troubleshooting
  - Quick actions: Fix Errors, Explain, Improve, Create New
  - Apply generated code directly to editor
  - API keys stored locally in browser (privacy-first)
- **Mermaid Diagram Support** - Create diagrams using Mermaid.js syntax
  - Split-screen code editor with live preview
  - Syntax error highlighting
  - Link to Mermaid syntax documentation
- **Diagram Zoom Controls** - Full zoom functionality
  - Zoom in/out buttons with percentage display
  - Fit-to-screen and reset zoom buttons
  - Mouse wheel zoom in fullscreen mode (Ctrl+Scroll)
  - Keyboard shortcuts (Ctrl+/-/0)
- **Enhanced Export Options** - PNG and SVG export for all diagrams
- **Keyboard Shortcuts Dialog** - Quick reference for all shortcuts
- **AI Settings in Settings Page** - Centralized AI configuration
  - Provider selection with model options
  - Feature toggles for AI capabilities

### v1.4.0 (2024-12-08)
- **Inventory Part Storage Location Tracking** - Track where spare parts are stored
- ConsumableInfo interface for filters, batteries, and other replacement items
- Stock quantity tracking with low-stock alerts
- Linked appliance support (e.g., filter linked to refrigerator)
- Created CLAUDE.md AI continuity file

### v1.3.2 (2024-12-08)
- Fixed Excalidraw blank canvas issue
- Added proper container sizing for diagram editor
- Fixed dark mode styling for Excalidraw toolbar

### v1.3.1 (2024-12-08)
- Added Inventory Assets Panel to diagram editor
- Can drag/drop inventory items onto diagrams
- Items store inventory reference for dynamic linking

### v1.3.0 (2024-12-08)
- New Diagrams module with Excalidraw
- 7 diagram categories (network, plumbing, electrical, floor-plan, hvac, yard, other)
- Auto-save, thumbnails, PNG export

---

## 🔗 Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Main App Entry | `frontend/src/App.tsx` |
| Route Definitions | `frontend/src/App.tsx` |
| Navigation | `frontend/src/components/Layout.tsx` |
| Global CSS | `frontend/src/index.css` |
| Storage Utils | `frontend/src/lib/storage.ts` |
| API Client | `frontend/src/lib/api.ts` |
| AI Service | `frontend/src/lib/aiService.ts` |
| HomeContext Builder | `frontend/src/lib/homeContext.ts` |
| AI Settings Store | `frontend/src/store/aiSettingsStore.ts` |
| Theme Provider | `frontend/src/components/ThemeProvider.tsx` |
| Backend Entry | `backend/src/index.ts` |
| Excel Export | `backend/src/services/excel.service.ts` |
| Package.json (Frontend) | `frontend/package.json` |
| Package.json (Backend) | `backend/package.json` |

---

## 🚨 Known Issues

1. **React Router Warnings** - Future flag deprecation warnings for v7 (cosmetic only)
2. **Large Bundle Size** - Excalidraw adds ~1.5MB to bundle (expected)
3. **Backend Offline** - Frontend works in offline mode with localStorage

---

## 💡 Development Tips

1. **State Persistence**: All Zustand stores save to localStorage automatically via `storage.ts`
2. **Adding New Stores**: Create in `/store`, export from store file, import where needed
3. **Adding Routes**: Update `App.tsx` routes and `Layout.tsx` navigation
4. **Adding to Global Search**: Update `GlobalSearch.tsx` PAGES array and search logic
5. **Excalidraw**: Component needs explicit container dimensions (height/width)
6. **Adding AI Features**: 
   - Add feature toggle to `aiSettingsStore.ts` in `AIFeatureToggles`
   - Add toggle UI in `Settings.tsx` AI Features section
   - Use `isFeatureEnabled('featureName')` to check if enabled
   - Use `buildHomeContext()` to get full home state for AI prompts
   - Use `sendPrompt()` for generic AI calls with optional HomeContext

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

---

## 🧹 Local Development

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
| `@prisma/client` | Database ORM | **UNUSED** - Remove |
| `passport`, `passport-jwt`, `bcrypt`, `jsonwebtoken` | Auth | Mock only - keep for future |
| `tesseract.js` | OCR | Required - documents |
| `heic-convert` | iOS photos | Required - file uploads |

---

*This file is designed to be read by AI assistants. Keep it updated when making significant changes.*

