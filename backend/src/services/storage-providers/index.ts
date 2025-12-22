/**
 * Storage Provider Interface
 * 
 * Modular storage system supporting multiple backends:
 * - Local filesystem (default)
 * - WebDAV (NAS - Synology, QNAP, Nextcloud)
 * - S3-compatible (future: MinIO, Backblaze)
 * - Cloud (future: Google Drive, OneDrive)
 */

export interface StorageProviderConfig {
  type: 'local' | 'webdav' | 's3' | 'google-drive' | 'onedrive';
  name: string;
  enabled: boolean;
  isDefault?: boolean;
  // Provider-specific config
  config: Record<string, any>;
}

export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  provider: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  availableSpace?: number;
  usedSpace?: number;
}

export interface UploadResult {
  success: boolean;
  path: string;
  url?: string;
  size: number;
  error?: string;
}

/**
 * Storage Provider Interface
 * All storage providers must implement this interface
 */
export interface StorageProvider {
  readonly type: string;
  readonly name: string;
  
  // Connection
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  testConnection(): Promise<{ success: boolean; message: string }>;
  
  // File operations
  upload(buffer: Buffer, remotePath: string): Promise<UploadResult>;
  download(remotePath: string): Promise<Buffer | null>;
  delete(remotePath: string): Promise<boolean>;
  exists(remotePath: string): Promise<boolean>;
  list(remotePath: string): Promise<string[]>;
  
  // Directory operations
  createDirectory(remotePath: string): Promise<boolean>;
  
  // Backup operations
  backup(data: Buffer, filename: string): Promise<UploadResult>;
  listBackups(): Promise<BackupInfo[]>;
  restoreBackup(filename: string): Promise<Buffer | null>;
  deleteOldBackups(retentionDays: number): Promise<number>;
  
  // Stats
  getStats(): Promise<StorageStats>;
}

/**
 * Storage Provider Manager
 * Manages multiple storage providers and routes operations
 */
export class StorageProviderManager {
  private providers: Map<string, StorageProvider> = new Map();
  private defaultProvider: string = 'local';

  registerProvider(name: string, provider: StorageProvider): void {
    this.providers.set(name, provider);
    console.log(`📦 Registered storage provider: ${name} (${provider.type})`);
  }

  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`);
    }
    this.defaultProvider = name;
    console.log(`📦 Default storage provider set to: ${name}`);
  }

  getProvider(name?: string): StorageProvider | undefined {
    return this.providers.get(name || this.defaultProvider);
  }

  getDefaultProvider(): StorageProvider | undefined {
    return this.providers.get(this.defaultProvider);
  }

  getAllProviders(): Map<string, StorageProvider> {
    return this.providers;
  }

  async testAllConnections(): Promise<Record<string, { success: boolean; message: string }>> {
    const results: Record<string, { success: boolean; message: string }> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.testConnection();
      } catch (error: any) {
        results[name] = { success: false, message: error.message };
      }
    }
    
    return results;
  }
}

// Singleton instance
export const storageManager = new StorageProviderManager();

// Re-export providers
export { LocalStorageProvider } from './local.provider';
export { WebDAVStorageProvider } from './webdav.provider';
