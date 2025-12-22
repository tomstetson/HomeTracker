/**
 * Local Filesystem Storage Provider
 * 
 * Default storage provider for local file storage.
 * Always available, no configuration needed.
 */

import fs from 'fs';
import path from 'path';
import { StorageProvider, UploadResult, BackupInfo, StorageStats } from './index';

const DATA_DIR = path.join(__dirname, '../../../data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

export interface LocalStorageConfig {
  basePath?: string;
  backupsPath?: string;
}

export class LocalStorageProvider implements StorageProvider {
  readonly type = 'local';
  readonly name: string;
  
  private basePath: string;
  private backupsPath: string;
  private connected: boolean = false;

  constructor(name: string = 'local', config: LocalStorageConfig = {}) {
    this.name = name;
    this.basePath = config.basePath || DATA_DIR;
    this.backupsPath = config.backupsPath || BACKUPS_DIR;
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.basePath, this.backupsPath, path.join(this.basePath, 'images'), path.join(this.basePath, 'thumbnails')].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async connect(): Promise<boolean> {
    this.ensureDirectories();
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    return this.connected && fs.existsSync(this.basePath);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const testFile = path.join(this.basePath, '.test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return { success: true, message: 'Local storage is accessible' };
    } catch (error: any) {
      return { success: false, message: `Local storage error: ${error.message}` };
    }
  }

  async upload(buffer: Buffer, remotePath: string): Promise<UploadResult> {
    try {
      const fullPath = path.join(this.basePath, remotePath);
      const dir = path.dirname(fullPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(fullPath, buffer);
      
      return {
        success: true,
        path: remotePath,
        url: `/api/files/${remotePath}`,
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
      const fullPath = path.join(this.basePath, remotePath);
      if (!fs.existsSync(fullPath)) {
        return null;
      }
      return fs.readFileSync(fullPath);
    } catch (error) {
      return null;
    }
  }

  async delete(remotePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, remotePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async exists(remotePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, remotePath);
    return fs.existsSync(fullPath);
  }

  async list(remotePath: string): Promise<string[]> {
    try {
      const fullPath = path.join(this.basePath, remotePath);
      if (!fs.existsSync(fullPath)) {
        return [];
      }
      return fs.readdirSync(fullPath);
    } catch (error) {
      return [];
    }
  }

  async createDirectory(remotePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, remotePath);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async backup(data: Buffer, filename: string): Promise<UploadResult> {
    try {
      const backupPath = path.join(this.backupsPath, filename);
      fs.writeFileSync(backupPath, data);
      
      console.log(`💾 Local backup created: ${filename}`);
      
      return {
        success: true,
        path: backupPath,
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
      if (!fs.existsSync(this.backupsPath)) {
        return [];
      }
      
      const files = fs.readdirSync(this.backupsPath)
        .filter(f => f.endsWith('.backup') || f.endsWith('.tar.gz') || f.endsWith('.zip'));
      
      return files.map(filename => {
        const fullPath = path.join(this.backupsPath, filename);
        const stats = fs.statSync(fullPath);
        return {
          filename,
          path: fullPath,
          size: stats.size,
          createdAt: stats.birthtime,
          provider: this.name,
        };
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      return [];
    }
  }

  async restoreBackup(filename: string): Promise<Buffer | null> {
    try {
      const backupPath = path.join(this.backupsPath, filename);
      if (!fs.existsSync(backupPath)) {
        return null;
      }
      return fs.readFileSync(backupPath);
    } catch (error) {
      return null;
    }
  }

  async deleteOldBackups(retentionDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const backups = await this.listBackups();
      let deleted = 0;
      
      for (const backup of backups) {
        if (backup.createdAt < cutoffDate) {
          fs.unlinkSync(backup.path);
          deleted++;
        }
      }
      
      if (deleted > 0) {
        console.log(`🧹 Deleted ${deleted} old local backups`);
      }
      
      return deleted;
    } catch (error) {
      return 0;
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      let totalFiles = 0;
      let totalSize = 0;
      
      const countFiles = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            countFiles(fullPath);
          } else {
            totalFiles++;
            totalSize += fs.statSync(fullPath).size;
          }
        }
      };
      
      countFiles(this.basePath);
      
      return {
        totalFiles,
        totalSize,
      };
    } catch (error) {
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}
