# Changelog

All notable changes to HomeTracker will be documented in this file.

## [1.2.0] - 2024-12-03

### 🚀 New Features

#### Maintenance Page Overhaul
- **List/Card View Toggle** - Switch between compact list view and detailed card view
- **Restore Completed Tasks** - Undo task completion, move back to pending
- **Stats Cards as Filters** - Click Overdue, Upcoming, Pending, or Completed to filter
- **Edit Task Dialog** - Edit existing tasks directly
- **Quick Complete** - One-click completion with ability to restore

#### UX Improvements
- **Unified Search** - Consistent search/filter across Tasks and History views
- **Priority Filtering** - Filter tasks by priority level
- **Category Filtering** - Filter by task category
- **Active Filter Indicators** - Visual highlight on active stat filters
- **Better Mobile Layout** - Single-column cards on mobile, responsive controls

### 🔧 Improvements
- Compact task rows with hover actions
- Clickable stat cards for quick filtering
- Clear filters button when filters active
- Improved responsive breakpoints
- Consistent icon-based actions

---

## [1.1.0] - 2024-12-03

### 🚀 New Features

#### Inventory Enhancements
- **Warranties per Item** - Attach warranty details (provider, policy #, end date) directly to inventory items
- **Sell Item Tracking** - Log sales with price, buyer, platform; track profit/loss
- **Soft Delete / Trash** - Items move to trash (180-day retention) before permanent deletion
- **Custom Categories** - Add/remove inventory categories via UI
- **Sale Platforms** - Customizable list of selling platforms (eBay, Facebook Marketplace, etc.)

#### Maintenance Service History
- **Tasks/History Toggle** - View mode switching between active tasks and service history
- **Service History Stats** - Track total completed, total spent, this year's costs
- **History Search & Filter** - Search and filter by category
- **Completion Details** - Log who performed work (DIY or vendor), actual cost, notes

#### Home Info Improvements
- **Simplified Value Tracking** - Inline home value entry (removed separate API dialog)
- **Paint Colors Tab** - Renamed from "Reference" for clarity
- **Emergency Contacts** - Clear Add/Edit UI with editable contact types
- **Utility Shutoffs** - Track water, gas, electrical panel locations

#### Centralized Options System
- **Options Store** - All customizable dropdowns managed centrally
- **EditableSelect Component** - Reusable component for customizable options
- **Vendor Categories** - Add/remove custom vendor types
- **Sync to Storage** - Custom options persist with all app data

#### Excel Export Updates
- **Home Values Sheet** - Track value history over time
- **Paint Colors Sheet** - All paint colors with room, brand, hex code
- **Emergency Contacts Sheet** - Emergency contact list
- **Sales History Sheet** - Auto-generated from sold inventory items

### 🔧 Improvements
- Custom delete confirmation dialogs (replaces browser prompts)
- Better dark mode support across all pages
- Improved responsive design
- Fixed various TypeScript errors

### 🗑️ Removed
- Deprecated HomeVitals.tsx (consolidated into HomeInfo)
- Hardcoded category/platform lists

---

## [1.0.0] - 2024-12-03

### 🎉 Initial Release

HomeTracker v1.0 - The complete home management solution for homelabbers.

### Features

#### Core Modules
- **Dashboard** - Overview with stats and quick actions
- **Projects** - Kanban board with drag-and-drop, tags, budgets
  - Adaptive view: Kanban on desktop, List on mobile
  - Glass-morphism card design
- **Inventory** - Track appliances, furniture, electronics
- **Maintenance** - Schedule and track home maintenance tasks
- **Vendors** - Directory of contractors and service providers
- **Documents** - Store and organize home documents
- **Home Info** - Property details, value tracking, emergency info
- **Settings** - App configuration, data management, backup

#### UI/UX
- Full dark/light mode support
- Responsive design for all screen sizes
- Modern glass-morphism design
- Global search (⌘K / Ctrl+K)
- Toast notifications
- Form validation with Zod

#### Backend
- Express.js REST API
- JSON file-based storage
- Real-time Excel export (hometracker.xlsx)
- Graceful shutdown with data persistence
- Health check endpoint

#### DevOps
- Single-container Docker deployment
- Docker Compose for easy setup
- Resource-limited for homelab efficiency
- Nginx reverse proxy built-in
- Supervisor process management
- Health checks

#### Backup & Storage
- Local backup scripts
- Cloud backup support (rclone)
- Multiple storage options documented
- 3-2-1 backup strategy guidance

### Documentation
- README with quick start guide
- Deployment guide for homelab
- Storage options documentation
- Backup strategy guide

### Technical Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Zustand
- **Backend**: Node.js, Express.js, ExcelJS
- **Storage**: JSON + Excel export
- **Deployment**: Docker, Nginx, Supervisor

---

## Roadmap

### [1.2.0] - Planned
- OCR for receipts and documents
- Email notifications for maintenance
- PWA support for mobile

### [2.0.0] - Future
- Multi-user support
- Optional PostgreSQL backend
- Photo storage improvements
