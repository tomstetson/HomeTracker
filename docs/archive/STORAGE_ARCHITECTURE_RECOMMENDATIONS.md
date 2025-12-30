# HomeTracker Storage Architecture - Analysis & Recommendations

## Current Architecture Analysis

### What We Have Now

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌─────────────────┐                                            │
│  │  localStorage   │  hometracker_data (single JSON blob)       │
│  │  (~5MB limit)   │  + auto-migration system                   │
│  └────────┬────────┘                                            │
│           │ manual sync                                         │
└───────────┼─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express)                       │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ hometracker.json│───▶│hometracker.xlsx │ (generated)         │
│  │  (source of     │    │  (for viewing)  │                     │
│  │   truth)        │    │                 │                     │
│  └────────┬────────┘    └─────────────────┘                     │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ Docker Volume   │  ./data mounted                            │
│  │ (persistent)    │                                            │
│  └────────┬────────┘                                            │
└───────────┼─────────────────────────────────────────────────────┘
            │
            ▼  (external scripts via rclone)
┌─────────────────────────────────────────────────────────────────┐
│                    BACKUP (Manual/Cron)                         │
│  • Local: ./backups/*.tar.gz                                    │
│  • Cloud: rclone → OneDrive/GDrive/Backblaze                    │
│  • NAS: rclone → SFTP/CIFS mount                                │
└─────────────────────────────────────────────────────────────────┘
```

### Current Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| **localStorage 5MB limit** | Can't store photos/large files | High |
| **Frontend/backend disconnect** | Data can be out of sync | Medium |
| **No real database** | No transactions, queries, relationships | Medium |
| **External backup only** | Requires manual rclone setup | Medium |
| **Single-user design** | No multi-user/multi-property | Low |
| **No native cloud sync** | Relies on external scripts | Low |

---

## Recommendation: Tiered Architecture

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │   IndexedDB     │    │  localStorage   │                     │
│  │  (large files,  │    │  (settings,     │                     │
│  │   offline cache)│    │   preferences)  │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                              │
│           └──────────┬───────────┘                              │
│                      ▼                                          │
│            ┌─────────────────┐                                  │
│            │  Sync Manager   │  Auto-sync on change             │
│            │  (debounced)    │  Conflict resolution             │
│            └────────┬────────┘                                  │
└─────────────────────┼───────────────────────────────────────────┘
                      │ REST API / WebSocket
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express)                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Storage Layer                        │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │    │
│  │  │   SQLite    │  │  JSON Files │  │ File Store  │      │    │
│  │  │  (metadata, │  │  (export/   │  │ (photos,    │      │    │
│  │  │   queries)  │  │   backup)   │  │  documents) │      │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Backup Providers                       │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │    │
│  │  │  Local  │ │ Google  │ │OneDrive │ │  NAS/   │        │    │
│  │  │  Disk   │ │  Drive  │ │         │ │ WebDAV  │        │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Decision: Do We Need a Database?

### Analysis

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **JSON Files (current)** | Simple, portable, human-readable | No queries, no transactions | <1000 items |
| **SQLite** | SQL queries, transactions, single file | Slightly more complex | 1000-100K items |
| **PostgreSQL** | Full ACID, multi-user, scalable | Requires separate container | Multi-user, >100K items |

### Recommendation: **SQLite with JSON Export**

For a homelab app tracking home inventory/maintenance, SQLite is the sweet spot:

```typescript
// Proposed: backend/src/services/database.service.ts
import Database from 'better-sqlite3';

const db = new Database('./data/hometracker.db');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    data JSON,  -- Flexible schema for custom fields
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
  CREATE INDEX IF NOT EXISTS idx_items_updated ON items(updated_at);
`);

// Queries become powerful
const recentItems = db.prepare(`
  SELECT * FROM items 
  WHERE updated_at > datetime('now', '-7 days')
  ORDER BY updated_at DESC
`).all();
```

**Benefits:**
- Fast queries (find all items by category, search, etc.)
- Transactions (batch operations are atomic)
- Still single-file (easy to backup)
- JSON export for compatibility

---

## Storage Provider Integration

### Recommended Approach: Plugin Architecture

```typescript
// backend/src/services/storage-providers/index.ts

export interface StorageProvider {
  name: string;
  type: 'local' | 'cloud' | 'nas';
  
  // Core operations
  upload(file: Buffer, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  
  // Backup operations
  backup(data: Buffer, name: string): Promise<void>;
  restore(name: string): Promise<Buffer>;
  listBackups(): Promise<BackupInfo[]>;
  
  // Health check
  isConnected(): Promise<boolean>;
}

// Implementations
export { LocalStorageProvider } from './local.provider';
export { GoogleDriveProvider } from './google-drive.provider';
export { OneDriveProvider } from './onedrive.provider';
export { WebDAVProvider } from './webdav.provider';  // Works with Nextcloud, NAS
export { S3Provider } from './s3.provider';  // MinIO, Backblaze, AWS
```

### Provider Implementations

#### 1. Local Storage (Default)
```typescript
// Always available, no configuration needed
class LocalStorageProvider implements StorageProvider {
  private basePath = './data/files';
  
  async upload(file: Buffer, path: string): Promise<string> {
    const fullPath = join(this.basePath, path);
    await fs.promises.writeFile(fullPath, file);
    return `/api/files/${path}`;
  }
}
```

#### 2. Google Drive
```typescript
// Uses OAuth2 - user authenticates via UI
class GoogleDriveProvider implements StorageProvider {
  private drive: drive_v3.Drive;
  
  async authenticate(code: string): Promise<void> {
    // OAuth2 flow - store tokens in config
  }
  
  async upload(file: Buffer, path: string): Promise<string> {
    const response = await this.drive.files.create({
      requestBody: { name: path, parents: [this.folderId] },
      media: { body: Readable.from(file) },
    });
    return response.data.id;
  }
}
```

#### 3. OneDrive
```typescript
// Microsoft Graph API
class OneDriveProvider implements StorageProvider {
  private client: Client;  // @microsoft/microsoft-graph-client
  
  async upload(file: Buffer, path: string): Promise<string> {
    const response = await this.client
      .api(`/me/drive/root:/HomeTracker/${path}:/content`)
      .put(file);
    return response.id;
  }
}
```

#### 4. WebDAV (NAS, Nextcloud)
```typescript
// Works with Synology, QNAP, Nextcloud, ownCloud
class WebDAVProvider implements StorageProvider {
  private client: WebDAVClient;  // webdav package
  
  constructor(config: { url: string; username: string; password: string }) {
    this.client = createClient(config.url, {
      username: config.username,
      password: config.password,
    });
  }
  
  async upload(file: Buffer, path: string): Promise<string> {
    await this.client.putFileContents(`/HomeTracker/${path}`, file);
    return path;
  }
}
```

#### 5. S3-Compatible (MinIO, Backblaze B2)
```typescript
// Works with any S3-compatible storage
class S3Provider implements StorageProvider {
  private s3: S3Client;
  
  constructor(config: { endpoint: string; bucket: string; credentials: Credentials }) {
    this.s3 = new S3Client({
      endpoint: config.endpoint,
      region: 'auto',
      credentials: config.credentials,
    });
  }
  
  async upload(file: Buffer, path: string): Promise<string> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: `hometracker/${path}`,
      Body: file,
    }));
    return `s3://${this.bucket}/hometracker/${path}`;
  }
}
```

---

## Configuration UI

### Settings Page for Storage Providers

```typescript
// Frontend settings for storage providers
interface StorageConfig {
  // Primary storage (where files are saved)
  primary: {
    provider: 'local' | 'google-drive' | 'onedrive' | 'webdav' | 's3';
    config: ProviderConfig;
  };
  
  // Backup destinations (can have multiple)
  backups: Array<{
    provider: string;
    config: ProviderConfig;
    schedule: 'manual' | 'daily' | 'weekly';
    retention: number; // days
  }>;
}

// Example configuration
const config: StorageConfig = {
  primary: {
    provider: 'local',
    config: { path: './data/files' }
  },
  backups: [
    {
      provider: 'google-drive',
      config: { folderId: 'xxx' },
      schedule: 'daily',
      retention: 30
    },
    {
      provider: 'webdav',
      config: { url: 'https://nas.local/webdav', username: 'user' },
      schedule: 'weekly',
      retention: 90
    }
  ]
};
```

---

## Backup Strategy Enhancement

### Multi-Tier Backup

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKUP TIERS                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tier 1: Real-time (RPO: 0)                                 │
│  ├── SQLite WAL mode (write-ahead logging)                  │
│  └── Immediate JSON export on change                        │
│                                                             │
│  Tier 2: Local (RPO: 1 hour)                                │
│  ├── Hourly snapshot to ./backups/                          │
│  └── 7-day retention, rotated                               │
│                                                             │
│  Tier 3: Cloud (RPO: 24 hours)                              │
│  ├── Daily backup to configured cloud provider              │
│  ├── Encrypted before upload (AES-256)                      │
│  └── 30-day retention                                       │
│                                                             │
│  Tier 4: Cold Storage (RPO: 7 days)                         │
│  ├── Weekly backup to secondary provider                    │
│  └── 1-year retention                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Backup Job Scheduler

```typescript
// backend/src/services/backup-scheduler.service.ts

class BackupScheduler {
  private jobs: Map<string, CronJob> = new Map();
  
  async scheduleBackups(config: StorageConfig): Promise<void> {
    for (const backup of config.backups) {
      const cronExpression = this.getCronExpression(backup.schedule);
      
      const job = new CronJob(cronExpression, async () => {
        try {
          console.log(`📦 Starting ${backup.provider} backup...`);
          
          // Export data
          const data = await this.exportData();
          
          // Compress
          const compressed = await gzip(data);
          
          // Encrypt (optional)
          const encrypted = backup.encrypt 
            ? await encrypt(compressed, backup.encryptionKey)
            : compressed;
          
          // Upload
          const provider = this.getProvider(backup.provider);
          const filename = `hometracker_${Date.now()}.backup`;
          await provider.backup(encrypted, filename);
          
          // Cleanup old backups
          await this.cleanupOldBackups(provider, backup.retention);
          
          console.log(`✅ ${backup.provider} backup complete`);
        } catch (error) {
          console.error(`❌ ${backup.provider} backup failed:`, error);
          // Send notification
        }
      });
      
      job.start();
      this.jobs.set(backup.provider, job);
    }
  }
}
```

---

## Docker Compose for Homelab

### Enhanced docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  hometracker:
    build: .
    container_name: hometracker
    restart: unless-stopped
    ports:
      - "8080:80"
      - "3001:3001"
    volumes:
      # Database and files (CRITICAL)
      - hometracker-data:/app/backend/data
      
      # Local backup directory
      - ./backups:/app/backups
      
      # Optional: Mount NAS directly
      # - /mnt/nas/hometracker:/app/nas-backup
      
    environment:
      - NODE_ENV=production
      - TZ=${TZ:-America/New_York}
      
      # Database
      - DB_TYPE=sqlite
      - DB_PATH=/app/backend/data/hometracker.db
      
      # Storage provider credentials (optional)
      - GOOGLE_DRIVE_CREDENTIALS=${GOOGLE_DRIVE_CREDENTIALS:-}
      - ONEDRIVE_CLIENT_ID=${ONEDRIVE_CLIENT_ID:-}
      - WEBDAV_URL=${WEBDAV_URL:-}
      - S3_ENDPOINT=${S3_ENDPOINT:-}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY:-}
      - S3_SECRET_KEY=${S3_SECRET_KEY:-}
      
      # Encryption key for backups
      - BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-}
      
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

volumes:
  hometracker-data:
    driver: local
```

### With PostgreSQL (for multi-user/enterprise)

```yaml
# docker-compose.postgres.yml
version: '3.8'

services:
  hometracker:
    build: .
    depends_on:
      - postgres
    environment:
      - DB_TYPE=postgres
      - DATABASE_URL=postgresql://hometracker:${DB_PASSWORD}@postgres:5432/hometracker

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=hometracker
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=hometracker
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hometracker"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  hometracker-data:
  postgres-data:
```

---

## Implementation Roadmap

### Phase 1: Database Migration (Week 1-2)
```
[ ] Add better-sqlite3 dependency
[ ] Create database schema
[ ] Create migration from JSON to SQLite
[ ] Update ExcelService to use SQLite
[ ] Keep JSON export for compatibility
[ ] Add database backup to backup scripts
```

### Phase 2: Storage Provider Interface (Week 3-4)
```
[ ] Create StorageProvider interface
[ ] Implement LocalStorageProvider
[ ] Implement WebDAVProvider (NAS support)
[ ] Create provider configuration UI
[ ] Add storage provider selection to settings
```

### Phase 3: Cloud Providers (Week 5-6)
```
[ ] Implement GoogleDriveProvider with OAuth
[ ] Implement OneDriveProvider with OAuth
[ ] Implement S3Provider (MinIO/Backblaze)
[ ] OAuth callback handling in backend
[ ] Token refresh logic
```

### Phase 4: Backup Automation (Week 7-8)
```
[ ] Create BackupScheduler service
[ ] Add cron-based backup jobs
[ ] Implement backup encryption
[ ] Create backup management UI
[ ] Add backup restoration UI
[ ] Implement retention policies
```

### Phase 5: File Management (Week 9-10)
```
[ ] Add IndexedDB to frontend for large files
[ ] Create file upload to storage provider
[ ] Implement photo thumbnails
[ ] Add document preview
[ ] Sync files between providers
```

---

## Summary: What Should Change

| Component | Current | Recommended | Priority |
|-----------|---------|-------------|----------|
| **Database** | JSON file | SQLite (single-user) or PostgreSQL (multi-user) | High |
| **File Storage** | Local only | Provider-based (local, cloud, NAS) | High |
| **Backup** | External rclone | Built-in scheduler with multiple providers | Medium |
| **Frontend Storage** | localStorage | localStorage + IndexedDB | Medium |
| **Sync** | Manual | Auto-sync with conflict resolution | Medium |
| **Multi-user** | None | Optional with PostgreSQL | Low |

### Quick Wins (Can Do Now)

1. **SQLite migration** - Replace JSON with SQLite, keep JSON export
2. **WebDAV provider** - Enables NAS backup without rclone
3. **Built-in backup scheduler** - Cron in container, no external setup

### Long-term Goals

1. **Cloud OAuth** - Google Drive, OneDrive native integration
2. **Multi-property** - Support managing multiple homes
3. **Multi-user** - Family members with different access levels
4. **Mobile app** - React Native with offline sync

---

## Questions to Consider

1. **Do you need multi-user support?** → Determines database choice
2. **Primary backup destination?** → Determines which providers to implement first
3. **Photo storage volume?** → Determines if we need external file storage
4. **Offline-first priority?** → Determines IndexedDB implementation urgency
5. **Budget for cloud storage?** → Determines default provider recommendations
