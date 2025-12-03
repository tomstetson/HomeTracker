# Changelog

All notable changes to HomeTracker will be documented in this file.

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
- **Warranties** - Track warranty dates and coverage
- **Home Vitals** - Emergency shutoffs, paint colors, service history
- **Documents** - Store and organize home documents
- **Data Export** - View and download Excel reports
- **Backup** - Backup status and commands reference

#### UI/UX
- Full dark/light mode support
- Responsive design for all screen sizes
- Modern glass-morphism design
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
- Homelab architecture guide

### Technical Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Zustand
- **Backend**: Node.js, Express.js, ExcelJS
- **Storage**: JSON + Excel export
- **Deployment**: Docker, Nginx, Supervisor

---

## Roadmap

### [1.1.0] - Planned
- SQLite database option
- Recurring maintenance reminders
- Email notifications
- PWA support for mobile

### [2.0.0] - Future
- Multi-user support
- Optional PostgreSQL backend
- Photo storage
- Receipt OCR
- Home value tracking

