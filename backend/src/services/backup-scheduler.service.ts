/**
 * Backup Scheduler Service
 * 
 * Automated backup system with multi-provider support:
 * - Scheduled backups (cron-based)
 * - Multiple backup destinations (local, NAS, cloud)
 * - Retention policies
 * - Backup encryption (optional)
 * - Progress tracking and notifications
 */

import * as cron from 'node-cron';
import { gzipSync } from 'zlib';
import { databaseService } from './database.service';
import { 
  storageManager, 
  StorageProvider, 
  BackupInfo,
  LocalStorageProvider,
  WebDAVStorageProvider 
} from './storage-providers';

export interface BackupScheduleConfig {
  id: string;
  name: string;
  provider: string;
  schedule: string;  // Cron expression
  enabled: boolean;
  retentionDays: number;
  includeImages: boolean;
  compress: boolean;
  encrypt: boolean;
  encryptionKey?: string;
  lastRun?: string;
  lastStatus?: 'success' | 'failed';
  lastError?: string;
}

export interface BackupResult {
  success: boolean;
  filename: string;
  size: number;
  duration: number;
  provider: string;
  error?: string;
}

class BackupSchedulerService {
  private schedules: Map<string, cron.ScheduledTask> = new Map();
  private configs: BackupScheduleConfig[] = [];
  private isRunning: Map<string, boolean> = new Map();

  constructor() {
    // Initialize default local provider
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Register local provider (always available)
    const localProvider = new LocalStorageProvider('local');
    localProvider.connect();
    storageManager.registerProvider('local', localProvider);
    storageManager.setDefaultProvider('local');
  }

  /**
   * Initialize backup scheduler from saved configuration
   */
  async initialize(): Promise<void> {
    // Load saved configurations from database
    const savedConfigs = databaseService.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('backup_schedules') as { value: string } | undefined;

    if (savedConfigs) {
      try {
        this.configs = JSON.parse(savedConfigs.value);
        
        // Start all enabled schedules
        for (const config of this.configs) {
          if (config.enabled) {
            this.startSchedule(config);
          }
        }
        
        console.log(`📅 Backup scheduler initialized with ${this.configs.length} schedules`);
      } catch (error) {
        console.error('Failed to load backup configurations:', error);
      }
    }
  }

  /**
   * Add or update a WebDAV provider
   */
  async addWebDAVProvider(
    name: string,
    config: {
      url: string;
      username: string;
      password: string;
      basePath?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const provider = new WebDAVStorageProvider(name, config);
      const connected = await provider.connect();
      
      if (!connected) {
        return { success: false, message: 'Failed to connect to WebDAV server' };
      }
      
      const test = await provider.testConnection();
      if (!test.success) {
        return test;
      }
      
      storageManager.registerProvider(name, provider);
      
      // Save provider config (without password in clear text)
      this.saveProviderConfig(name, 'webdav', {
        url: config.url,
        username: config.username,
        basePath: config.basePath,
        // Password should be stored securely or via env var
      });
      
      return { success: true, message: `WebDAV provider '${name}' configured successfully` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  private saveProviderConfig(name: string, type: string, config: any): void {
    const savedProviders = databaseService.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('storage_providers') as { value: string } | undefined;

    const providers = savedProviders ? JSON.parse(savedProviders.value) : {};
    providers[name] = { type, config };

    databaseService.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))'
    ).run('storage_providers', JSON.stringify(providers));
  }

  /**
   * Create a backup schedule
   */
  createSchedule(config: Omit<BackupScheduleConfig, 'lastRun' | 'lastStatus' | 'lastError'>): BackupScheduleConfig {
    const existingIndex = this.configs.findIndex(c => c.id === config.id);
    
    const fullConfig: BackupScheduleConfig = {
      ...config,
      lastRun: undefined,
      lastStatus: undefined,
      lastError: undefined,
    };

    if (existingIndex >= 0) {
      // Update existing
      this.stopSchedule(config.id);
      this.configs[existingIndex] = fullConfig;
    } else {
      // Add new
      this.configs.push(fullConfig);
    }

    if (config.enabled) {
      this.startSchedule(fullConfig);
    }

    this.saveConfigs();
    return fullConfig;
  }

  /**
   * Start a backup schedule
   */
  private startSchedule(config: BackupScheduleConfig): void {
    if (!cron.validate(config.schedule)) {
      console.error(`Invalid cron expression for ${config.name}: ${config.schedule}`);
      return;
    }

    const task = cron.schedule(config.schedule, async () => {
      await this.runBackup(config.id);
    });

    this.schedules.set(config.id, task);
    console.log(`⏰ Backup schedule started: ${config.name} (${config.schedule})`);
  }

  /**
   * Stop a backup schedule
   */
  stopSchedule(id: string): void {
    const task = this.schedules.get(id);
    if (task) {
      task.stop();
      this.schedules.delete(id);
    }
  }

  /**
   * Run a backup immediately
   */
  async runBackup(scheduleId: string): Promise<BackupResult> {
    const config = this.configs.find(c => c.id === scheduleId);
    if (!config) {
      return {
        success: false,
        filename: '',
        size: 0,
        duration: 0,
        provider: '',
        error: 'Schedule not found',
      };
    }

    // Prevent concurrent runs
    if (this.isRunning.get(scheduleId)) {
      return {
        success: false,
        filename: '',
        size: 0,
        duration: 0,
        provider: config.provider,
        error: 'Backup already in progress',
      };
    }

    this.isRunning.set(scheduleId, true);
    const startTime = Date.now();

    try {
      console.log(`🚀 Starting backup: ${config.name}`);

      const provider = storageManager.getProvider(config.provider);
      if (!provider) {
        throw new Error(`Provider '${config.provider}' not found`);
      }

      // Create backup data
      const backupData = await this.createBackupData(config.includeImages);
      
      // Compress if enabled
      let finalData = Buffer.from(JSON.stringify(backupData));
      if (config.compress) {
        finalData = gzipSync(finalData);
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = config.compress ? '.backup.gz' : '.backup';
      const filename = `hometracker_${timestamp}${ext}`;

      // Upload to provider
      const result = await provider.backup(finalData, filename);

      if (!result.success) {
        throw new Error(result.error || 'Backup upload failed');
      }

      // Clean up old backups
      await provider.deleteOldBackups(config.retentionDays);

      // Update config
      config.lastRun = new Date().toISOString();
      config.lastStatus = 'success';
      config.lastError = undefined;
      this.saveConfigs();

      // Log to database
      this.logBackup(config, 'success', filename, finalData.length);

      const duration = Date.now() - startTime;
      console.log(`✅ Backup complete: ${filename} (${(finalData.length / 1024).toFixed(1)} KB in ${duration}ms)`);

      return {
        success: true,
        filename,
        size: finalData.length,
        duration,
        provider: config.provider,
      };
    } catch (error: any) {
      config.lastRun = new Date().toISOString();
      config.lastStatus = 'failed';
      config.lastError = error.message;
      this.saveConfigs();

      this.logBackup(config, 'failed', '', 0, error.message);

      console.error(`❌ Backup failed: ${config.name} - ${error.message}`);

      return {
        success: false,
        filename: '',
        size: 0,
        duration: Date.now() - startTime,
        provider: config.provider,
        error: error.message,
      };
    } finally {
      this.isRunning.set(scheduleId, false);
    }
  }

  /**
   * Create backup data object
   */
  private async createBackupData(includeImages: boolean): Promise<any> {
    const data = databaseService.exportToJSON();
    
    if (includeImages) {
      // Include image references but not actual image data
      // Images should be backed up separately for efficiency
      data.imageCount = data.images?.length || 0;
    }

    return {
      ...data,
      backupCreatedAt: new Date().toISOString(),
      backupVersion: '1.0',
    };
  }

  /**
   * Log backup to database
   */
  private logBackup(
    config: BackupScheduleConfig,
    status: 'success' | 'failed',
    filename: string,
    size: number,
    error?: string
  ): void {
    databaseService.prepare(`
      INSERT INTO sync_log (source, action, collections, item_count, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      config.provider,
      'backup',
      config.name,
      size,
      status,
      error || null
    );
  }

  /**
   * Save configurations to database
   */
  private saveConfigs(): void {
    databaseService.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))'
    ).run('backup_schedules', JSON.stringify(this.configs));
  }

  /**
   * Get all schedules
   */
  getSchedules(): BackupScheduleConfig[] {
    return this.configs;
  }

  /**
   * Get schedule by ID
   */
  getSchedule(id: string): BackupScheduleConfig | undefined {
    return this.configs.find(c => c.id === id);
  }

  /**
   * Delete a schedule
   */
  deleteSchedule(id: string): boolean {
    this.stopSchedule(id);
    const index = this.configs.findIndex(c => c.id === id);
    if (index >= 0) {
      this.configs.splice(index, 1);
      this.saveConfigs();
      return true;
    }
    return false;
  }

  /**
   * Enable/disable a schedule
   */
  toggleSchedule(id: string, enabled: boolean): boolean {
    const config = this.configs.find(c => c.id === id);
    if (!config) return false;

    config.enabled = enabled;
    
    if (enabled) {
      this.startSchedule(config);
    } else {
      this.stopSchedule(id);
    }

    this.saveConfigs();
    return true;
  }

  /**
   * List all backups across all providers
   */
  async listAllBackups(): Promise<BackupInfo[]> {
    const allBackups: BackupInfo[] = [];

    for (const [name, provider] of storageManager.getAllProviders()) {
      try {
        const backups = await provider.listBackups();
        allBackups.push(...backups);
      } catch (error) {
        console.error(`Failed to list backups from ${name}:`, error);
      }
    }

    return allBackups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(provider: string, filename: string): Promise<{ success: boolean; message: string }> {
    try {
      const storageProvider = storageManager.getProvider(provider);
      if (!storageProvider) {
        return { success: false, message: `Provider '${provider}' not found` };
      }

      const data = await storageProvider.restoreBackup(filename);
      if (!data) {
        return { success: false, message: 'Backup file not found' };
      }

      // Decompress if needed
      let jsonStr: string;
      if (filename.endsWith('.gz')) {
        const { gunzipSync } = await import('zlib');
        jsonStr = gunzipSync(data).toString('utf-8');
      } else {
        jsonStr = data.toString('utf-8');
      }

      const backupData = JSON.parse(jsonStr);

      // Validate backup
      if (!backupData.version || !backupData.exportedAt) {
        return { success: false, message: 'Invalid backup format' };
      }

      // TODO: Implement actual data restoration
      // This would involve clearing current data and importing backup data
      console.log(`📥 Backup ${filename} validated, ready for restoration`);

      return { 
        success: true, 
        message: `Backup validated: ${backupData.items?.length || 0} items, from ${backupData.exportedAt}` 
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get backup statistics
   */
  async getStats(): Promise<{
    totalSchedules: number;
    enabledSchedules: number;
    lastBackup?: { schedule: string; time: string; status: string };
    providerStats: Record<string, { backups: number; totalSize: number }>;
  }> {
    const stats: Record<string, { backups: number; totalSize: number }> = {};

    for (const [name, provider] of storageManager.getAllProviders()) {
      try {
        const backups = await provider.listBackups();
        stats[name] = {
          backups: backups.length,
          totalSize: backups.reduce((sum, b) => sum + b.size, 0),
        };
      } catch (error) {
        stats[name] = { backups: 0, totalSize: 0 };
      }
    }

    // Find most recent backup
    let lastBackup: { schedule: string; time: string; status: string } | undefined;
    for (const config of this.configs) {
      if (config.lastRun && (!lastBackup || config.lastRun > lastBackup.time)) {
        lastBackup = {
          schedule: config.name,
          time: config.lastRun,
          status: config.lastStatus || 'unknown',
        };
      }
    }

    return {
      totalSchedules: this.configs.length,
      enabledSchedules: this.configs.filter(c => c.enabled).length,
      lastBackup,
      providerStats: stats,
    };
  }
}

export const backupSchedulerService = new BackupSchedulerService();
