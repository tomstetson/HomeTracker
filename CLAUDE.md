# HomeTracker - AI Assistant Context File

> **Purpose**: This file provides continuity for AI coding assistants (Claude Code, Cursor, Windsurf, etc.) to understand the project's current state, implemented features, and future roadmap.
> 
> **Last Updated**: 2024-12-08 | **Version**: 1.4.0

---

## 🏠 Project Overview

**HomeTracker** is a self-hosted home management application designed for homelabbers. It provides a single source of truth for tracking all aspects of home ownership including projects, inventory, maintenance, warranties, vendors, documents, and diagrams.

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand (state management)
- **Backend**: Node.js, Express.js, ExcelJS
- **Storage**: JSON files + Excel export (hometracker.xlsx)
- **Deployment**: Docker, Nginx, Supervisor
- **Special Libraries**: Excalidraw (diagrams), Tesseract.js (OCR)

### Key Directories
```
HomeTracker/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main page components
│   │   ├── store/         # Zustand stores (state management)
│   │   └── lib/           # Utilities, storage, API helpers
├── backend/               # Express.js backend
│   ├── src/
│   │   ├── services/      # Business logic (excel, file, sync)
│   │   └── routes/        # API routes
├── docs/                  # Documentation
└── docker/                # Docker configs, backup scripts
```

---

## ✅ Implemented Features (v1.3.2)

### Core Modules

| Module | File | Key Features |
|--------|------|--------------|
| **Dashboard** | `pages/Dashboard.tsx` | Stats cards, quick actions, recent projects, needs attention |
| **Projects** | `pages/Projects.tsx` | Kanban board (5 columns), drag-drop, subtasks, tags, budgets, mobile list view |
| **Inventory** | `pages/Items.tsx` | Items with warranties, categories, sell tracking, soft delete/trash (180-day retention) |
| **Maintenance** | `pages/Maintenance.tsx` | Tasks/History tabs, list/card views, recurring tasks, skip cycle, undo complete |
| **Vendors** | `pages/Vendors.tsx` | Vendor directory with ratings, custom categories, preferred filter |
| **Documents** | `pages/Documents.tsx` | File upload, OCR text extraction, category filtering |
| **Diagrams** | `pages/Diagrams.tsx` | Excalidraw editor, inventory integration, 7 diagram types, auto-save |
| **Home Info** | `pages/HomeInfo.tsx` | Property details, value tracking, paint colors, emergency contacts |
| **Settings** | `pages/Settings.tsx` | Theme toggle, API privacy, data export/import, backup |

### State Management (Zustand Stores)

| Store | File | Purpose |
|-------|------|---------|
| `useProjectStore` | `store/projectStore.ts` | Projects with subtasks |
| `useInventoryStore` | `store/inventoryStore.ts` | Items, categories, warranties, sales |
| `useMaintenanceStore` | `store/maintenanceStore.ts` | Tasks, history, service records |
| `useVendorStore` | `store/vendorStore.ts` | Vendor directory |
| `useDocumentStore` | `store/documentStore.ts` | Document metadata, OCR text |
| `useDiagramStore` | `store/diagramStore.ts` | Diagrams with Excalidraw data |
| `useHomeVitalsStore` | `store/homeVitalsStore.ts` | Property info, emergency contacts |
| `useOptionsStore` | `store/optionsStore.ts` | User-customizable dropdown options |
| `useWarrantyStore` | `store/warrantyStore.ts` | Standalone warranties (legacy) |

### UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `Layout` | `components/Layout.tsx` | App shell with sidebar navigation |
| `GlobalSearch` | `components/GlobalSearch.tsx` | Ctrl+K search dialog |
| `DiagramInventoryPanel` | `components/DiagramInventoryPanel.tsx` | Inventory sidebar in diagram editor |
| `EditableSelect` | `components/ui/EditableSelect.tsx` | Dropdowns with add/edit/remove |
| `TagInput` | `components/ui/TagInput.tsx` | Tag management with suggestions |
| `Toast` | `components/ui/Toast.tsx` | Notification system |

### Backend Services

| Service | File | Purpose |
|---------|------|---------|
| `excel.service.ts` | `backend/src/services/` | Real-time Excel export |
| `file.service.ts` | `backend/src/services/` | File upload, OCR processing |
| `sync.service.ts` | `backend/src/services/` | Data synchronization |

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
- [ ] **Receipt Scanning** - OCR with automatic data extraction
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
6. **Documents** - File upload, OCR text appears in search
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

### v1.2.1 (2024-12-03)
- Project subtasks with progress tracking
- Improved README with screenshots

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

---

*This file is designed to be read by AI assistants. Keep it updated when making significant changes.*

