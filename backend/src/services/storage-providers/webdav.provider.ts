/**
 * WebDAV Storage Provider
 * 
 * Supports NAS devices and cloud services:
 * - Synology DSM
 * - QNAP
 * - Nextcloud
 * - ownCloud
 * - Any WebDAV-compatible server
 */

import { createClient, WebDAVClient, FileStat } from 'webdav';
import { StorageProvider, UploadResult, BackupInfo, StorageStats } from './index';

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  basePath?: string;  // e.g., '/HomeTracker'
  backupsPath?: string;  // e.g., '/HomeTracker/backups'
}

export class WebDAVStorageProvider implements StorageProvider {
  readonly type = 'webdav';
  readonly name: string;
  
  private client: WebDAVClient | null = null;
  private config: WebDAVConfig;
  private basePath: string;
  private backupsPath: string;

  constructor(name: string, config: WebDAVConfig) {
    this.name = name;
    this.config = config;
    this.basePath = config.basePath || '/HomeTracker';
    this.backupsPath = config.backupsPath || `${this.basePath}/backups`;
  }

  async connect(): Promise<boolean> {
    try {
      this.client = createClient(this.config.url, {
        username: this.config.username,
        password: this.config.password,
      });
      
      // Ensure base directories exist
      await this.ensureDirectories();
      
      console.log(`📡 Connected to WebDAV: ${this.config.url}`);
      return true;
    } catch (error: any) {
      console.error(`WebDAV connection failed: ${error.message}`);
      return false;
    }
  }

  private async ensureDirectories(): Promise<void> {
    if (!this.client) return;
    
    const dirs = [
      this.basePath,
      `${this.basePath}/images`,
      `${this.basePath}/thumbnails`,
      `${this.basePath}/documents`,
      this.backupsPath,
    ];
    
    for (const dir of dirs) {
      try {
        const exists = await this.client.exists(dir);
        if (!exists) {
          await this.client.createDirectory(dir, { recursive: true });
        }
      } catch (error) {
        // Directory might already exist or parent needs to be created first
      }
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async isConnected(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      await this.client.exists(this.basePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      if (!this.client) {
        return { success: false, message: 'Failed to create WebDAV client' };
      }
      
      // Try to list the base directory
      await this.client.getDirectoryContents(this.basePath);
      
      return { 
        success: true, 
        message: `Connected to ${this.config.url}${this.basePath}` 
      };
    } catch (error: any) {
      // If base path doesn't exist, try to create it
      if (error.status === 404) {
        try {
          await this.ensureDirectories();
          return { 
            success: true, 
            message: `Connected and created ${this.basePath}` 
          };
        } catch (createError: any) {
          return { 
            success: false, 
            message: `Failed to create base directory: ${createError.message}` 
          };
        }
      }
      
      return { 
        success: false, 
        message: `WebDAV error: ${error.message}` 
      };
    }
  }

  async upload(buffer: Buffer, remotePath: string): Promise<UploadResult> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      if (!this.client) {
        throw new Error('WebDAV client not connected');
      }
      
      const fullPath = `${this.basePath}/${remotePath}`;
      
      // Ensure parent directory exists
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      try {
        const parentExists = await this.client.exists(parentDir);
        if (!parentExists) {
          await this.client.createDirectory(parentDir, { recursive: true });
        }
      } catch (error) {
        // Parent might already exist
      }
      
      await this.client.putFileContents(fullPath, buffer);
      
      return {
        success: true,
        path: fullPath,
        url: `${this.config.url}${fullPath}`,
        size: buffer.length,
      };
    } catch (error: any) {
      return {
        success: false,
        path: remotePath,
        size: 0,
        error: error.message,
      };
    }
  }

  async download(remotePath: string): Promise<Buffer | null> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      if (!this.client) {
        return null;
      }
      
      const fullPath = remotePath.startsWith(this.basePath) 
        ? remotePath 
        : `${this.basePath}/${remotePath}`;
      
      const content = await this.client.getFileContents(fullPath);
      
      if (content instanceof Buffer) {
        return content;
      } else if (typeof content === 'string') {
        return Buffer.from(content);
      } else if (content instanceof ArrayBuffer) {
        return Buffer.from(content);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async delete(remotePath: string): Promise<boolean> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      if (!this.client) {
        return false;
      }
      
      const fullPath = remotePath.startsWith(this.basePath) 
        ? remotePath 
        : `${this.basePath}/${remotePath}`;
      
      await this.client.deleteFile(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async exists(remotePath: string): Promise<boolean> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      if (!this.client) {
        return false;
      }
      
      const fullPath = remotePath.startsWith(this.basePath) 
        ? remotePath 
        : `${this.basePath}/${remotePath}`;
      
      return await this.client.exists(fullPath);
    } catch (error) {
      return false;
    }
  }

  async list(remotePath: string): Promise<string[]> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      if (!this.client) {
        return [];
      }
      
      const fullPath = remotePath.startsWith(this.basePath) 
        ? remotePath 
        : `${this.basePath}/${remotePath}`;
      
      const contents = await this.client.getDirectoryContents(fullPath) as FileStat[];
      return contents.map(item => item.basename);
    } catch (error) {
      return [];
    }
  }

  async createDirectory(remotePath: string): Promise<boolean> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      if (!this.client) {
        return false;
      }
      
      const fullPath = remotePath.startsWith(this.basePath) 
        ? remotePath 
        : `${this.basePath}/${remotePath}`;
      
      await this.client.createDirectory(fullPath, { recursive: true });
      return true;
    } catch (error) {
      return false;
    }
  }

  async backup(data: Buffer, filename: string): Promise<UploadResult> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      if (!this.client) {
        throw new Error('WebDAV client not connected');
      }
      
      const backupPath = `${this.backupsPath}/${filename}`;
      
      await this.client.putFileContents(backupPath, data);
      
      console.log(`☁️ WebDAV backup created: ${filename} on ${this.name}`);
      
      return {
        success: true,
        path: backupPath,
        url: `${this.config.url}${backupPath}`,
        size: data.length,
      };
    } catch (error: any) {
      return {
        success: false,
        path: filename,
        size: 0,
        error: error.message,
      };
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      if (!this.client) {
        return [];
      }
      
      const contents = await this.client.getDirectoryContents(this.backupsPath) as FileStat[];
      
      return contents
        .filter(item => item.type === 'file' && 
          (item.basename.endsWith('.backup') || 
           item.basename.endsWith('.tar.gz') || 
           item.basename.endsWith('.zip')))
        .map(item => ({
          filename: item.basename,
          path: item.filename,
          size: item.size,
          createdAt: new Date(item.lastmod),
          provider: this.name,
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      return [];
    }
  }

  async restoreBackup(filename: string): Promise<Buffer | null> {
    const backupPath = `${this.backupsPath}/${filename}`;
    return this.download(backupPath);
  }

  async deleteOldBackups(retentionDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const backups = await this.listBackups();
      let deleted = 0;
      
      for (const backup of backups) {
        if (backup.createdAt < cutoffDate) {
          const success = await this.delete(backup.path);
          if (success) {
            deleted++;
          }
        }
      }
      
      if (deleted > 0) {
        console.log(`🧹 Deleted ${deleted} old WebDAV backups from ${this.name}`);
      }
      
      return deleted;
    } catch (error) {
      return 0;
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      if (!this.client) {
        await this.connect();
      }
      
      if (!this.client) {
        return { totalFiles: 0, totalSize: 0 };
      }
      
      let totalFiles = 0;
      let totalSize = 0;
      
      const countFiles = async (dir: string) => {
        try {
          const contents = await this.client!.getDirectoryContents(dir) as FileStat[];
          for (const item of contents) {
            if (item.type === 'directory') {
              await countFiles(item.filename);
            } else {
              totalFiles++;
              totalSize += item.size;
            }
          }
        } catch (error) {
          // Skip inaccessible directories
        }
      };
      
      await countFiles(this.basePath);
      
      return {
        totalFiles,
        totalSize,
      };
    } catch (error) {
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}
