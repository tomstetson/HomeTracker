/**
 * SQLite Database Service
 * 
 * Core database layer for HomeTracker with support for:
 * - Inventory items with AI-detected metadata
 * - Image storage with thumbnails
 * - AI batch processing jobs
 * - Future multi-user support
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'hometracker.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database with WAL mode for better performance
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema version for migrations
const SCHEMA_VERSION = 2;

/**
 * Database schema initialization
 */
function initializeSchema(): void {
  // Schema versioning table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_info (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Check current schema version
  const versionRow = db.prepare('SELECT value FROM schema_info WHERE key = ?').get('version') as { value: string } | undefined;
  const currentVersion = versionRow ? parseInt(versionRow.value, 10) : 0;

  if (currentVersion < SCHEMA_VERSION) {
    console.log(`📦 Migrating database from version ${currentVersion} to ${SCHEMA_VERSION}...`);
    runMigrations(currentVersion);
  }
}

/**
 * Run database migrations
 */
function runMigrations(fromVersion: number): void {
  const migrations: Record<number, () => void> = {
    1: migration_v1_initial_schema,
    2: migration_v2_power_tables,
  };

  for (let version = fromVersion + 1; version <= SCHEMA_VERSION; version++) {
    const migration = migrations[version];
    if (migration) {
      console.log(`  Running migration v${version}...`);
      migration();
    }
  }

  // Update schema version
  db.prepare('INSERT OR REPLACE INTO schema_info (key, value) VALUES (?, ?)').run('version', SCHEMA_VERSION.toString());
  console.log('✅ Database migrations complete');
}

/**
 * Migration v1: Initial schema
 */
function migration_v1_initial_schema(): void {
  db.exec(`
    -- Users table (for future multi-user support)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'user',
      settings JSON DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Properties table (homes)
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      property_type TEXT,
      year_built INTEGER,
      square_footage INTEGER,
      lot_size TEXT,
      bedrooms INTEGER,
      bathrooms REAL,
      purchase_date TEXT,
      purchase_price REAL,
      current_value REAL,
      notes TEXT,
      is_primary INTEGER DEFAULT 1,
      settings JSON DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'item', 'project', 'maintenance', 'vendor', 'document'
      color TEXT,
      icon TEXT,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Inventory items table
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      location TEXT,
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      purchase_date TEXT,
      purchase_price REAL,
      current_value REAL,
      condition TEXT CHECK(condition IN ('excellent', 'good', 'fair', 'poor', 'unknown')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'sold', 'donated', 'disposed', 'lost')),
      quantity INTEGER DEFAULT 1,
      warranty_expires TEXT,
      notes TEXT,
      tags JSON DEFAULT '[]',
      custom_fields JSON DEFAULT '{}',
      ai_metadata JSON DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Images table (supports any entity)
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL, -- 'item', 'project', 'document', 'property', 'maintenance'
      entity_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT,
      mime_type TEXT,
      file_size INTEGER,
      width INTEGER,
      height INTEGER,
      thumbnail_path TEXT,
      storage_path TEXT NOT NULL,
      storage_type TEXT DEFAULT 'local', -- 'local', 's3', 'webdav', etc.
      is_primary INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      ai_analysis JSON DEFAULT '{}',
      ai_processed INTEGER DEFAULT 0,
      ai_processed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- AI Processing Jobs table
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'image_analysis', 'batch_categorize', 'ocr', 'receipt_scan'
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
      priority INTEGER DEFAULT 0,
      input_data JSON NOT NULL,
      output_data JSON,
      error_message TEXT,
      progress INTEGER DEFAULT 0,
      total_items INTEGER DEFAULT 1,
      processed_items INTEGER DEFAULT 0,
      provider TEXT, -- 'openai', 'anthropic', 'google', 'local'
      model TEXT,
      tokens_used INTEGER,
      cost_estimate REAL,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- AI Job Items (for batch jobs)
    CREATE TABLE IF NOT EXISTS ai_job_items (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      image_id TEXT,
      item_id TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
      input_data JSON,
      output_data JSON,
      error_message TEXT,
      processed_at TEXT,
      FOREIGN KEY (job_id) REFERENCES ai_jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE SET NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
    );

    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      budget REAL,
      actual_cost REAL,
      progress INTEGER DEFAULT 0,
      start_date TEXT,
      due_date TEXT,
      completed_date TEXT,
      assigned_vendor_id TEXT,
      tags JSON DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
    );

    -- Vendors table
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      business_name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      address TEXT,
      categories JSON DEFAULT '[]',
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      is_preferred INTEGER DEFAULT 0,
      total_jobs INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );

    -- Maintenance tasks table
    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
      recurrence TEXT, -- 'daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual', null
      due_date TEXT,
      last_completed TEXT,
      next_due TEXT,
      estimated_time TEXT,
      estimated_cost REAL,
      actual_cost REAL,
      assigned_to TEXT,
      assigned_vendor_id TEXT,
      related_item_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
      FOREIGN KEY (related_item_id) REFERENCES items(id) ON DELETE SET NULL
    );

    -- Maintenance history
    CREATE TABLE IF NOT EXISTS maintenance_history (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      completed_date TEXT NOT NULL,
      completed_by TEXT,
      actual_cost REAL,
      vendor_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
    );

    -- Documents table
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      file_type TEXT,
      file_size INTEGER,
      storage_path TEXT NOT NULL,
      storage_type TEXT DEFAULT 'local',
      related_type TEXT, -- 'item', 'project', 'vendor', 'maintenance', 'property'
      related_id TEXT,
      tags JSON DEFAULT '[]',
      expiration_date TEXT,
      is_important INTEGER DEFAULT 0,
      ocr_text TEXT,
      ai_summary TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Warranties table
    CREATE TABLE IF NOT EXISTS warranties (
      id TEXT PRIMARY KEY,
      item_id TEXT,
      property_id TEXT,
      provider TEXT,
      type TEXT, -- 'manufacturer', 'extended', 'home_warranty'
      policy_number TEXT,
      start_date TEXT,
      end_date TEXT,
      cost REAL,
      coverage_details TEXT,
      claim_phone TEXT,
      claim_email TEXT,
      claim_website TEXT,
      document_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    );

    -- Transactions table (budget tracking)
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      category TEXT,
      description TEXT,
      date TEXT NOT NULL,
      vendor_id TEXT,
      project_id TEXT,
      item_id TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurring_frequency TEXT,
      receipt_document_id TEXT,
      tags JSON DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
      FOREIGN KEY (receipt_document_id) REFERENCES documents(id) ON DELETE SET NULL
    );

    -- Budgets table
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      name TEXT NOT NULL,
      category TEXT,
      amount REAL NOT NULL,
      period TEXT DEFAULT 'monthly' CHECK(period IN ('monthly', 'quarterly', 'annual')),
      start_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );

    -- Diagrams table
    CREATE TABLE IF NOT EXISTS diagrams (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'tldraw' CHECK(type IN ('tldraw', 'mermaid')),
      category TEXT,
      description TEXT,
      data JSON,
      mermaid_code TEXT,
      thumbnail BLOB,
      tags JSON DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );

    -- Settings table (key-value store)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSON NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Sync log table
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL, -- 'client', 'server', 'backup'
      action TEXT NOT NULL, -- 'push', 'pull', 'backup', 'restore'
      collections TEXT,
      item_count INTEGER,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_items_property ON items(property_id);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_updated ON items(updated_at);
    
    CREATE INDEX IF NOT EXISTS idx_images_entity ON images(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_images_ai_processed ON images(ai_processed);
    
    CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_ai_jobs_type ON ai_jobs(type);
    CREATE INDEX IF NOT EXISTS idx_ai_job_items_job ON ai_job_items(job_id);
    CREATE INDEX IF NOT EXISTS idx_ai_job_items_status ON ai_job_items(status);
    
    CREATE INDEX IF NOT EXISTS idx_projects_property ON projects(property_id);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    
    CREATE INDEX IF NOT EXISTS idx_maintenance_property ON maintenance_tasks(property_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_maintenance_due ON maintenance_tasks(next_due);
    
    CREATE INDEX IF NOT EXISTS idx_documents_property ON documents(property_id);
    CREATE INDEX IF NOT EXISTS idx_documents_related ON documents(related_type, related_id);
    
    CREATE INDEX IF NOT EXISTS idx_transactions_property ON transactions(property_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    
    CREATE INDEX IF NOT EXISTS idx_warranties_item ON warranties(item_id);
    CREATE INDEX IF NOT EXISTS idx_warranties_end_date ON warranties(end_date);

    -- Full-text search for items
    CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
      name, description, brand, model, notes, location,
      content='items',
      content_rowid='rowid'
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, name, description, brand, model, notes, location)
      VALUES (NEW.rowid, NEW.name, NEW.description, NEW.brand, NEW.model, NEW.notes, NEW.location);
    END;

    CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, name, description, brand, model, notes, location)
      VALUES('delete', OLD.rowid, OLD.name, OLD.description, OLD.brand, OLD.model, OLD.notes, OLD.location);
    END;

    CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, name, description, brand, model, notes, location)
      VALUES('delete', OLD.rowid, OLD.name, OLD.description, OLD.brand, OLD.model, OLD.notes, OLD.location);
      INSERT INTO items_fts(rowid, name, description, brand, model, notes, location)
      VALUES (NEW.rowid, NEW.name, NEW.description, NEW.brand, NEW.model, NEW.notes, NEW.location);
    END;

    -- Insert default user and property for single-user mode
    INSERT OR IGNORE INTO users (id, email, name, role) VALUES ('default', 'user@hometracker.local', 'Home Owner', 'admin');
    INSERT OR IGNORE INTO properties (id, user_id, name, is_primary) VALUES ('default', 'default', 'My Home', 1);
  `);
}

/**
 * Migration v2: Power monitoring tables (PowerTracker integration)
 */
function migration_v2_power_tables(): void {
  db.exec(`
    -- Power readings: Raw 2-second data (7-day retention)
    CREATE TABLE IF NOT EXISTS power_readings_raw (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      total REAL NOT NULL,
      phase_a REAL,
      phase_b REAL,
      circuits JSON
    );
    CREATE INDEX IF NOT EXISTS idx_power_raw_ts ON power_readings_raw(ts DESC);

    -- Power readings: 1-minute aggregates (90-day retention)
    CREATE TABLE IF NOT EXISTS power_readings_1min (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      total_avg REAL,
      total_min REAL,
      total_max REAL,
      phase_a_avg REAL,
      phase_b_avg REAL,
      sample_count INTEGER,
      circuits_avg JSON
    );
    CREATE INDEX IF NOT EXISTS idx_power_1min_ts ON power_readings_1min(ts DESC);

    -- Power readings: Hourly summaries (forever)
    CREATE TABLE IF NOT EXISTS power_readings_hourly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      total_avg REAL,
      total_min REAL,
      total_max REAL,
      total_kwh REAL,
      phase_a_avg REAL,
      phase_b_avg REAL,
      peak_circuit TEXT,
      peak_circuit_watts REAL,
      anomaly_count INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_power_hourly_ts ON power_readings_hourly(ts DESC);

    -- Adaptive learning baselines (168 slots: 7 days × 24 hours)
    CREATE TABLE IF NOT EXISTS power_baselines (
      day_of_week INTEGER NOT NULL,
      hour INTEGER NOT NULL,
      ema_average REAL DEFAULT 0,
      ema_variance REAL DEFAULT 0,
      sample_count INTEGER DEFAULT 0,
      confidence REAL DEFAULT 0,
      last_updated TEXT,
      PRIMARY KEY (day_of_week, hour)
    );

    -- Power events/anomalies
    CREATE TABLE IF NOT EXISTS power_events (
      id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT,
      value REAL,
      baseline REAL,
      deviation REAL,
      resolved INTEGER DEFAULT 0,
      notified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_power_events_ts ON power_events(ts DESC);

    -- Power configuration
    CREATE TABLE IF NOT EXISTS power_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Power learning status
    CREATE TABLE IF NOT EXISTS power_learning_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      first_reading_ts INTEGER,
      total_readings INTEGER DEFAULT 0,
      confidence_pct REAL DEFAULT 0,
      is_ready INTEGER DEFAULT 0,
      last_updated TEXT DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO power_learning_status (id) VALUES (1);
  `);
  console.log('⚡ Power monitoring tables created');
}

// Initialize schema on module load
initializeSchema();

/**
 * Database helper class
 */
class DatabaseService {
  private db: Database.Database;

  constructor() {
    this.db = db;
  }

  // Generic CRUD operations
  
  getAll<T>(table: string, propertyId: string = 'default'): T[] {
    const stmt = this.db.prepare(`SELECT * FROM ${table} WHERE property_id = ? ORDER BY created_at DESC`);
    return stmt.all(propertyId) as T[];
  }

  getById<T>(table: string, id: string): T | undefined {
    const stmt = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    return stmt.get(id) as T | undefined;
  }

  insert<T>(table: string, data: Record<string, any>): T {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => {
      const val = data[col];
      return typeof val === 'object' ? JSON.stringify(val) : val;
    });

    const stmt = this.db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
    stmt.run(...values);
    
    return this.getById<T>(table, data.id) as T;
  }

  update<T>(table: string, id: string, data: Record<string, any>): T | undefined {
    const columns = Object.keys(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = columns.map(col => {
      const val = data[col];
      return typeof val === 'object' ? JSON.stringify(val) : val;
    });

    const stmt = this.db.prepare(`UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = ?`);
    stmt.run(...values, id);
    
    return this.getById<T>(table, id);
  }

  delete(table: string, id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM ${table} WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Search items using full-text search
  searchItems(query: string, propertyId: string = 'default'): any[] {
    const stmt = this.db.prepare(`
      SELECT items.* FROM items
      JOIN items_fts ON items.rowid = items_fts.rowid
      WHERE items_fts MATCH ? AND items.property_id = ?
      ORDER BY rank
    `);
    return stmt.all(query, propertyId);
  }

  // Get items with their images
  getItemsWithImages(propertyId: string = 'default'): any[] {
    const stmt = this.db.prepare(`
      SELECT 
        i.*,
        (SELECT json_group_array(json_object(
          'id', img.id,
          'filename', img.filename,
          'thumbnail_path', img.thumbnail_path,
          'is_primary', img.is_primary,
          'ai_analysis', img.ai_analysis
        ))
        FROM images img 
        WHERE img.entity_type = 'item' AND img.entity_id = i.id
        ) as images
      FROM items i
      WHERE i.property_id = ?
      ORDER BY i.updated_at DESC
    `);
    
    const results = stmt.all(propertyId) as any[];
    return results.map(row => ({
      ...row,
      images: JSON.parse(row.images || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      custom_fields: JSON.parse(row.custom_fields || '{}'),
      ai_metadata: JSON.parse(row.ai_metadata || '{}'),
    }));
  }

  // AI Job operations
  createAIJob(job: {
    id: string;
    type: string;
    input_data: any;
    priority?: number;
    provider?: string;
    model?: string;
    created_by?: string;
  }): any {
    return this.insert('ai_jobs', {
      ...job,
      status: 'pending',
      progress: 0,
      total_items: Array.isArray(job.input_data.items) ? job.input_data.items.length : 1,
      processed_items: 0,
    });
  }

  getPendingAIJobs(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ai_jobs 
      WHERE status IN ('pending', 'processing') 
      ORDER BY priority DESC, created_at ASC
    `);
    return stmt.all();
  }

  updateAIJobProgress(jobId: string, processedItems: number, status?: string): void {
    const updates: Record<string, any> = {
      processed_items: processedItems,
      progress: Math.round((processedItems / (this.getById<any>('ai_jobs', jobId)?.total_items || 1)) * 100),
    };
    
    if (status) {
      updates.status = status;
      if (status === 'processing' && !this.getById<any>('ai_jobs', jobId)?.started_at) {
        updates.started_at = new Date().toISOString();
      }
      if (status === 'completed' || status === 'failed') {
        updates.completed_at = new Date().toISOString();
      }
    }
    
    this.update('ai_jobs', jobId, updates);
  }

  // Get unprocessed images for AI analysis
  getUnprocessedImages(limit: number = 100): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM images 
      WHERE ai_processed = 0 
      ORDER BY created_at ASC 
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  // Backup and export
  exportToJSON(): any {
    const tables = ['items', 'images', 'projects', 'vendors', 'maintenance_tasks', 
                    'documents', 'warranties', 'transactions', 'budgets', 'diagrams', 
                    'categories', 'properties', 'settings'];
    
    const data: Record<string, any[]> = {};
    
    for (const table of tables) {
      try {
        const stmt = this.db.prepare(`SELECT * FROM ${table}`);
        data[table] = stmt.all();
      } catch (e) {
        console.warn(`Could not export table ${table}:`, e);
        data[table] = [];
      }
    }
    
    return {
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      ...data,
    };
  }

  // Raw query access for advanced operations
  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  // Graceful shutdown
  close(): void {
    this.db.close();
  }
}

// Singleton instance
export const databaseService = new DatabaseService();

// Export the raw db for advanced use cases
export { db };
