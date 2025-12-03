// Data synchronization service
// Syncs localStorage data with backend API

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingChanges: number;
}

class DataSyncService {
  private syncStatus: SyncStatus = {
    isOnline: false,
    lastSync: null,
    pendingChanges: 0,
  };
  private syncInProgress = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  // Check if backend is available
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      this.syncStatus.isOnline = response.ok;
    } catch {
      this.syncStatus.isOnline = false;
    }
    this.notifyListeners();
    return this.syncStatus.isOnline;
  }

  // Subscribe to sync status changes
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.syncStatus));
  }

  // Get all localStorage data
  private getLocalData(): Record<string, any> {
    const collections = {
      projects: 'hometracker_projects',
      items: 'hometracker_items',
      vendors: 'hometracker_vendors',
      warranties: 'hometracker_warranties',
      maintenance: 'hometracker_maintenanceTasks',
      documents: 'hometracker_documents',
    };

    const data: Record<string, any> = {};
    
    for (const [key, storageKey] of Object.entries(collections)) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          data[key] = JSON.parse(stored);
        } else {
          data[key] = [];
        }
      } catch {
        data[key] = [];
      }
    }

    // Get settings
    try {
      const settings = localStorage.getItem('hometracker_settings');
      if (settings) {
        data.settings = JSON.parse(settings);
      }
    } catch {
      data.settings = {};
    }

    return data;
  }

  // Sync all localStorage data to backend
  async syncToBackend(): Promise<{ success: boolean; message: string }> {
    if (this.syncInProgress) {
      return { success: false, message: 'Sync already in progress' };
    }

    const isOnline = await this.checkConnection();
    if (!isOnline) {
      return { success: false, message: 'Backend not available' };
    }

    this.syncInProgress = true;

    try {
      const localData = this.getLocalData();
      
      // Add metadata
      const dataToSync = {
        ...localData,
        lastUpdated: new Date().toISOString(),
      };

      const response = await fetch(`${API_URL}/api/excel/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSync),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      this.syncStatus.lastSync = new Date().toISOString();
      this.syncStatus.pendingChanges = 0;
      this.notifyListeners();

      return { success: true, message: 'Data synced successfully' };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, message: 'Sync failed' };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync backend data to localStorage
  async syncFromBackend(): Promise<{ success: boolean; message: string }> {
    const isOnline = await this.checkConnection();
    if (!isOnline) {
      return { success: false, message: 'Backend not available' };
    }

    try {
      const response = await fetch(`${API_URL}/api/excel/data`);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      if (result.success && result.data) {
        const data = result.data;

        // Store each collection in localStorage
        const mappings = {
          projects: 'hometracker_projects',
          items: 'hometracker_items',
          vendors: 'hometracker_vendors',
          warranties: 'hometracker_warranties',
          maintenance: 'hometracker_maintenanceTasks',
          documents: 'hometracker_documents',
        };

        for (const [key, storageKey] of Object.entries(mappings)) {
          if (data[key]) {
            localStorage.setItem(storageKey, JSON.stringify(data[key]));
          }
        }

        if (data.settings) {
          localStorage.setItem('hometracker_settings', JSON.stringify(data.settings));
        }

        this.syncStatus.lastSync = new Date().toISOString();
        this.notifyListeners();

        return { success: true, message: 'Data imported from backend' };
      }

      return { success: false, message: 'No data received' };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, message: 'Import failed' };
    }
  }

  // Get current sync status
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Mark that there are pending changes
  markPendingChange() {
    this.syncStatus.pendingChanges++;
    this.notifyListeners();
  }
}

// Singleton instance
export const dataSyncService = new DataSyncService();

// Helper hook for React components
import { useState, useEffect } from 'react';

export function useDataSync() {
  const [status, setStatus] = useState<SyncStatus>(dataSyncService.getStatus());

  useEffect(() => {
    return dataSyncService.subscribe(setStatus);
  }, []);

  return {
    status,
    syncToBackend: () => dataSyncService.syncToBackend(),
    syncFromBackend: () => dataSyncService.syncFromBackend(),
    checkConnection: () => dataSyncService.checkConnection(),
  };
}


