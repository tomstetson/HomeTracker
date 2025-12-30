<p align="center">
  <img src="docs/logo.svg" alt="HomeTracker Logo" width="120" height="120">
</p>

<h1 align="center">HomeTracker v2.0</h1>

<p align="center">
  <strong>The complete home management solution for homelabbers.</strong>
</p>

<p align="center">
  Track everything about your home in one place: projects, inventory, warranties, maintenance, vendors, documents, and more.<br>
  Self-hosted, privacy-focused, AI-powered, and designed for homelab deployment.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="Version 2.0">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
  <img src="https://img.shields.io/badge/docker-ready-blue" alt="Docker Ready">
  <img src="https://img.shields.io/badge/PWA-enabled-purple" alt="PWA Enabled">
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-screenshots">Screenshots</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-ai-features">AI Features</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-documentation">Documentation</a>
</p>

---

## 🏠 Why HomeTracker?

Managing a home involves tracking **a lot** of information: warranty expiration dates, maintenance schedules, project budgets, vendor contacts, paint colors, and more. HomeTracker brings it all together in one place.

**Built for homelabbers**, HomeTracker is:
- **Self-hosted** - Your data stays on your server
- **Privacy-focused** - No cloud accounts required, no data sharing
- **AI-powered** - BYOK (Bring Your Own Key) for OpenAI, Anthropic, or Google
- **Mobile-ready** - PWA with offline support and native-like experience
- **Resource-efficient** - Runs great on a Raspberry Pi or NAS
- **Docker-ready** - Single container deployment

---

## 📸 Screenshots

<table>
<tr>
<td width="50%">

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)
*At-a-glance overview of your home with quick actions*

</td>
<td width="50%">

### Project Tracker
![Projects](docs/screenshots/projects-kanban.png)
*Kanban board with drag-and-drop, budgets, and progress tracking*

</td>
</tr>
<tr>
<td width="50%">

### Maintenance
![Maintenance](docs/screenshots/maintenance.png)
*Schedule tasks, track service history, manage recurring maintenance*

</td>
<td width="50%">

### Inventory
![Inventory](docs/screenshots/inventory.png)
*Track appliances with warranties, values, and sale tracking*

</td>
</tr>
</table>

---

## ✨ Features

### 📋 Core Modules (12 Pages)

| Module | Description |
|--------|-------------|
| **Dashboard** | At-a-glance overview with analytics and quick actions |
| **Projects** | Kanban board with subtasks, budgets, progress tracking, and tags |
| **Inventory** | Track items with warranties, values, sell tracking, and AI categorization |
| **Warranties** | Dedicated warranty tracking with expiration alerts |
| **Maintenance** | Schedule tasks with priorities, recurrence, and predictive suggestions |
| **Vendors** | Directory of contractors with ratings and custom categories |
| **Documents** | Store files with OCR search and AI classification |
| **Diagrams** | Create floor plans with TLDraw and Mermaid |
| **Home Info** | Property details, value tracking, paint colors, emergency contacts |
| **Budget** | Track income, expenses, and budget goals by category |
| **Backup** | Automated backups to local storage or WebDAV (NAS) |
| **Settings** | App configuration, AI settings, data management |

### 🚀 Key Capabilities

- **🤖 AI-Powered** - Smart categorization, maintenance suggestions, predictive alerts (BYOK)
- **📱 PWA Mobile App** - Install on phone, works offline, native-like experience
- **🌙 Dark/Light Mode** - Beautiful UI with full theme support
- **🔍 Global Search** - Find anything with `Ctrl+K`
- **📊 Excel Export** - All data synced to `.xlsx` in real-time
- **📄 File Storage** - Upload receipts, manuals, photos with thumbnails
- **🔔 Smart Notifications** - Warranty expirations, maintenance due, project deadlines
- **💾 Auto-Backup** - Scheduled backups to local or NAS (WebDAV)
- **🐳 Docker Ready** - Single container deployment

---

## 🤖 AI Features

HomeTracker uses a **BYOK (Bring Your Own Key)** model - you provide your own API key from OpenAI, Anthropic, or Google. Your data stays private.

| Feature | Description |
|---------|-------------|
| **Smart Categorization** | Auto-suggest categories when adding items |
| **Maintenance Suggestions** | AI recommends maintenance tasks based on item type |
| **Predictive Alerts** | Identifies neglected items and frequent repairs |
| **Document Intelligence** | Extract text and classify uploaded documents |
| **Diagram Assistant** | Generate Mermaid diagrams from natural language |

**Supported Providers:**
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)

> **Note:** AI features are optional. HomeTracker works fully without AI configuration.

---

## 🚀 Quick Start

### Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/tomstetson/HomeTracker.git
cd HomeTracker

# Start with Docker Compose
docker-compose up -d

# Access at http://localhost:8080
```

### Development

```bash
# Clone the repository
git clone https://github.com/tomstetson/HomeTracker.git
cd HomeTracker

# Start backend
cd backend && npm install && npm run dev

# Start frontend (new terminal)
cd frontend && npm install && npm run dev

# Access at http://localhost:3000
```

---

## 🐳 Deployment

HomeTracker is designed for homelab deployment. All data persists in the `./data` directory.

```yaml
# docker-compose.yml
version: '3.8'
services:
  hometracker:
    build: .
    ports:
      - "8080:80"
    volumes:
      - ./data:/app/backend/data
      - ./backups:/app/backups
    restart: unless-stopped
```

### Data Files

| File | Description |
|------|-------------|
| `hometracker.db` | SQLite database (WAL mode) |
| `hometracker.xlsx` | Excel export (auto-generated) |
| `uploads/` | Uploaded documents and images |
| `backups/` | Automated backups (local + WebDAV) |

### Backup

```bash
# Manual backup
./docker/backup.sh

# Automated backup (crontab)
0 2 * * * /path/to/hometracker/docker/backup.sh
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Quick Start](docs/QUICKSTART.md) | 5-minute setup guide |
| [Deployment](docs/DEPLOYMENT.md) | Full deployment guide |
| [Storage Options](docs/STORAGE_OPTIONS.md) | Local, NAS, and cloud storage |
| [Backup Strategy](docs/BACKUP_STRATEGY.md) | 3-2-1 backup best practices |
| [Homelab Architecture](docs/HOMELAB_ARCHITECTURE.md) | Docker vs VM guide |
| [File Storage](docs/FILE_STORAGE.md) | Document storage & OCR |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Backend | Node.js, Express.js, SQLite (better-sqlite3), Sharp |
| AI | BYOK (OpenAI, Anthropic, Google) - user provides API keys |
| Storage | SQLite DB (WAL mode) + Local files + WebDAV (NAS) |
| Mobile | PWA with service worker, offline caching |
| Deployment | Docker, Nginx, Supervisor |

---

## 📱 Mobile Experience

HomeTracker is a **Progressive Web App (PWA)** that can be installed on your phone:

- **Install to Home Screen** - Works like a native app
- **Offline Support** - View data without internet connection
- **Bottom Navigation** - Mobile-optimized nav with quick actions
- **Touch Gestures** - Swipe actions on list items
- **Pull to Refresh** - Native-feeling interactions

---

## 🔒 Security

- **No cloud dependency** - All data stays on your server
- **Optional auth** - Enable Supabase authentication for multi-user
- **Secret scanning** - Secretlint integration for dev security
- **Security audits** - npm audit, OSV Scanner, Semgrep in CI/CD

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>HomeTracker v2.0</strong><br>
  Made with ❤️ for homeowners and homelabbers
</p>
