// Data synchronization service
// Syncs localStorage data with backend API

import { getAllData, saveAllData } from './storage';

// Dynamically determine API URL based on current browser location
function getApiUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3001`;
    }
  }
  return 'http://localhost:3001';
}

const API_URL = getApiUrl();

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

  // Get all data from consolidated storage
  private getLocalData(): Record<string, any> {
    const storageData = getAllData();
    
    return {
      projects: storageData.projects || [],
      items: storageData.items || [],
      vendors: storageData.vendors || [],
      warranties: storageData.warranties || [],
      maintenance: storageData.maintenanceTasks || [],
      documents: storageData.documents || [],
      settings: storageData.settings?.property || {},
    };
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

        // Update consolidated storage
        const storageData = getAllData();
        
        if (data.projects) storageData.projects = data.projects;
        if (data.items) storageData.items = data.items;
        if (data.vendors) storageData.vendors = data.vendors;
        if (data.warranties) storageData.warranties = data.warranties;
        if (data.maintenance) storageData.maintenanceTasks = data.maintenance;
        if (data.documents) storageData.documents = data.documents;
        
        if (data.settings) {
          if (!storageData.settings) {
            storageData.settings = { property: {}, notifications: {}, ai: {}, display: {} };
          }
          storageData.settings.property = data.settings;
        }

        saveAllData(storageData);
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


