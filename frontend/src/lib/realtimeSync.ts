/**
 * Real-time Data Synchronization Service
 * 
 * Ensures data is always in sync between:
 * - Frontend (React/Zustand stores)
 * - Backend (JSON file)
 * - Excel file (source of truth for exports)
 * 
 * Features:
 * - Auto-sync on data changes (debounced)
 * - Periodic sync check (every 30 seconds)
 * - Conflict detection
 * - Offline queue for changes made while offline
 */

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export interface SyncConfig {
  autoSyncEnabled: boolean;
  syncIntervalMs: number;
  debounceMs: number;
  maxRetries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastSyncStatus: 'success' | 'failed' | 'pending' | null;
  pendingChanges: number;
  serverVersion: string | null;
  dataLocation: DataLocation;
}

export interface DataLocation {
  jsonPath: string;
  excelPath: string;
  filesPath: string;
  backupPath: string;
  dockerVolume: string;
  hostPath: string | null; // Resolved host path if available
}

export type SyncEventType = 'sync_start' | 'sync_complete' | 'sync_error' | 'status_change' | 'data_updated';

interface SyncEvent {
  type: SyncEventType;
  timestamp: string;
  data?: any;
}

class RealtimeSyncService {
  private config: SyncConfig = {
    autoSyncEnabled: true,
    syncIntervalMs: 30000, // Check every 30 seconds
    debounceMs: 2000, // Wait 2 seconds after last change before syncing
    maxRetries: 3,
  };

  private status: SyncStatus = {
    isOnline: false,
    isSyncing: false,
    lastSyncTime: null,
    lastSyncStatus: null,
    pendingChanges: 0,
    serverVersion: null,
    dataLocation: {
      jsonPath: '/app/backend/data/hometracker.json',
      excelPath: '/app/backend/data/hometracker.xlsx',
      filesPath: '/app/backend/data/files/',
      backupPath: '/app/backups/',
      dockerVolume: './data:/app/backend/data',
      hostPath: null,
    },
  };

  private listeners: Map<string, Set<(event: SyncEvent) => void>> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private offlineQueue: Array<{ collection: string; action: string; data: any }> = [];
  private retryCount = 0;

  constructor() {
    this.init();
  }

  private async init() {
    // Initial connection check
    await this.checkConnection();

    // Fetch data location from server
    await this.fetchDataLocation();

    // Start periodic sync check
    this.startPeriodicSync();

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      
      // Sync before page unload
      window.addEventListener('beforeunload', () => {
        if (this.status.pendingChanges > 0) {
          this.syncNow();
        }
      });
    }

    console.log('🔄 RealtimeSyncService initialized');
  }

  // Check connection to backend
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        this.status.isOnline = true;
        this.status.serverVersion = data.version || '1.0.0';
        this.retryCount = 0;
      } else {
        this.status.isOnline = false;
      }
    } catch {
      this.status.isOnline = false;
    }

    this.emit('status_change', this.status);
    return this.status.isOnline;
  }

  // Fetch actual data location from server
  private async fetchDataLocation() {
    try {
      const response = await fetch(`${API_URL}/api/system/info`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.dataLocation) {
          this.status.dataLocation = {
            ...this.status.dataLocation,
            ...data.dataLocation,
          };
        }
      }
    } catch {
      // Use defaults
    }
  }

  // Start periodic sync checking
  private startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (this.config.autoSyncEnabled && !this.status.isSyncing) {
        await this.checkConnection();
        
        if (this.status.isOnline && this.status.pendingChanges > 0) {
          await this.syncToServer();
        }
      }
    }, this.config.syncIntervalMs);
  }

  // Handle coming back online
  private async handleOnline() {
    console.log('📶 Back online, syncing...');
    await this.checkConnection();
    
    if (this.status.isOnline) {
      // Process offline queue
      await this.processOfflineQueue();
      
      // Sync any pending changes
      if (this.status.pendingChanges > 0) {
        await this.syncToServer();
      }
    }
  }

  // Handle going offline
  private handleOffline() {
    console.log('📴 Went offline');
    this.status.isOnline = false;
    this.emit('status_change', this.status);
  }

  // Process queued offline changes
  private async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    console.log(`Processing ${this.offlineQueue.length} offline changes...`);
    
    for (const item of this.offlineQueue) {
      try {
        await fetch(`${API_URL}/api/${item.collection}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
      } catch (e) {
        console.error('Failed to process offline item:', e);
      }
    }

    this.offlineQueue = [];
  }

  // Mark a change as pending (called when user modifies data)
  markChange(collection: string, action: string, data?: any) {
    this.status.pendingChanges++;
    this.emit('status_change', this.status);

    // If offline, queue the change
    if (!this.status.isOnline && data) {
      this.offlineQueue.push({ collection, action, data });
    }

    // Debounce sync
    if (this.config.autoSyncEnabled) {
      this.debouncedSync();
    }
  }

  // Debounced sync to avoid too many requests
  private debouncedSync() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      if (this.status.isOnline && this.status.pendingChanges > 0) {
        this.syncToServer();
      }
    }, this.config.debounceMs);
  }

  // Force immediate sync
  async syncNow(): Promise<{ success: boolean; message: string }> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    return this.syncToServer();
  }

  // Sync all data to server
  async syncToServer(): Promise<{ success: boolean; message: string }> {
    if (this.status.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    if (!this.status.isOnline) {
      await this.checkConnection();
      if (!this.status.isOnline) {
        return { success: false, message: 'Server offline' };
      }
    }

    this.status.isSyncing = true;
    this.status.lastSyncStatus = 'pending';
    this.emit('sync_start', {});

    try {
      // Gather all localStorage data
      const localData = this.getLocalStorageData();

      const response = await fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...localData,
          lastUpdated: new Date().toISOString(),
          clientVersion: '1.0.0',
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      this.status.lastSyncTime = new Date().toISOString();
      this.status.lastSyncStatus = 'success';
      this.status.pendingChanges = 0;
      this.retryCount = 0;

      this.emit('sync_complete', { serverTimestamp: result.timestamp });

      return { success: true, message: 'Sync complete' };
    } catch (error: any) {
      console.error('Sync failed:', error);
      this.status.lastSyncStatus = 'failed';
      this.retryCount++;

      // Retry logic
      if (this.retryCount < this.config.maxRetries) {
        setTimeout(() => this.syncToServer(), 5000 * this.retryCount);
      }

      this.emit('sync_error', { error: error.message });
      return { success: false, message: error.message || 'Sync failed' };
    } finally {
      this.status.isSyncing = false;
      this.emit('status_change', this.status);
    }
  }

  // Fetch data from server and update localStorage
  async syncFromServer(): Promise<{ success: boolean; message: string }> {
    if (!this.status.isOnline) {
      await this.checkConnection();
      if (!this.status.isOnline) {
        return { success: false, message: 'Server offline' };
      }
    }

    try {
      const response = await fetch(`${API_URL}/api/sync`);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        this.updateLocalStorage(result.data);
        this.status.lastSyncTime = new Date().toISOString();
        this.emit('data_updated', { source: 'server' });
        return { success: true, message: 'Data loaded from server' };
      }

      return { success: false, message: 'No data returned' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to fetch data' };
    }
  }

  // Get all data from localStorage
  private getLocalStorageData(): Record<string, any> {
    const collections: Record<string, string> = {
      projects: 'hometracker_projects',
      items: 'hometracker_items',
      vendors: 'hometracker_vendors',
      warranties: 'hometracker_warranties',
      maintenance: 'hometracker_maintenanceTasks',
      documents: 'hometracker_documents',
      homeVitals: 'hometracker_homeVitals',
    };

    const data: Record<string, any> = {};

    for (const [key, storageKey] of Object.entries(collections)) {
      try {
        const stored = localStorage.getItem(storageKey);
        data[key] = stored ? JSON.parse(stored) : [];
      } catch {
        data[key] = [];
      }
    }

    // Settings
    try {
      const settings = localStorage.getItem('hometracker_settings');
      data.settings = settings ? JSON.parse(settings) : {};
    } catch {
      data.settings = {};
    }

    return data;
  }

  // Update localStorage from server data
  private updateLocalStorage(data: Record<string, any>) {
    const mappings: Record<string, string> = {
      projects: 'hometracker_projects',
      items: 'hometracker_items',
      vendors: 'hometracker_vendors',
      warranties: 'hometracker_warranties',
      maintenance: 'hometracker_maintenanceTasks',
      documents: 'hometracker_documents',
      homeVitals: 'hometracker_homeVitals',
    };

    for (const [key, storageKey] of Object.entries(mappings)) {
      if (data[key]) {
        localStorage.setItem(storageKey, JSON.stringify(data[key]));
      }
    }

    if (data.settings) {
      localStorage.setItem('hometracker_settings', JSON.stringify(data.settings));
    }
  }

  // Event emitter
  on(event: SyncEventType, callback: (event: SyncEvent) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(type: SyncEventType, data: any) {
    const event: SyncEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    this.listeners.get(type)?.forEach(cb => cb(event));
  }

  // Get current status
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  // Get data location info
  getDataLocation(): DataLocation {
    return { ...this.status.dataLocation };
  }

  // Update configuration
  setConfig(config: Partial<SyncConfig>) {
    this.config = { ...this.config, ...config };
    
    if (config.syncIntervalMs) {
      this.startPeriodicSync();
    }
  }

  // Cleanup
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const realtimeSync = new RealtimeSyncService();

// React hook for using sync service
import { useState, useEffect, useCallback } from 'react';

export function useRealtimeSync() {
  const [status, setStatus] = useState<SyncStatus>(realtimeSync.getStatus());

  useEffect(() => {
    const unsubscribe = realtimeSync.on('status_change', (event) => {
      setStatus(event.data || realtimeSync.getStatus());
    });

    return unsubscribe;
  }, []);

  const syncNow = useCallback(() => realtimeSync.syncNow(), []);
  const syncFromServer = useCallback(() => realtimeSync.syncFromServer(), []);
  const markChange = useCallback((collection: string, action: string, data?: any) => {
    realtimeSync.markChange(collection, action, data);
  }, []);

  return {
    status,
    syncNow,
    syncFromServer,
    markChange,
    dataLocation: realtimeSync.getDataLocation(),
  };
}









