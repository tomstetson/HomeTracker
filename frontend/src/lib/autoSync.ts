// Auto-sync service
// Automatically syncs data between localStorage and backend on startup

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

interface SyncResult {
  success: boolean;
  message: string;
  source: 'backend' | 'local' | 'none';
}

// Check if backend is available
async function checkBackend(): Promise<boolean> {
  try {
    const healthUrl = API_URL.startsWith('/api') 
      ? '/api/health' 
      : `${API_URL}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get data from backend
async function fetchBackendData(): Promise<any | null> {
  try {
    const dataUrl = API_URL.startsWith('/api') 
      ? '/api/excel/data' 
      : `${API_URL}/api/excel/data`;
    const response = await fetch(dataUrl);
    if (!response.ok) return null;
    const result = await response.json();
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// Push data to backend
async function pushToBackend(data: any): Promise<boolean> {
  try {
    const dataUrl = API_URL.startsWith('/api') 
      ? '/api/excel/data' 
      : `${API_URL}/api/excel/data`;
    const response = await fetch(dataUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get all localStorage data
function getLocalData(): any {
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
      data[key] = stored ? JSON.parse(stored) : [];
    } catch {
      data[key] = [];
    }
  }

  // Get home vitals
  try {
    const vitals = localStorage.getItem('hometracker_homeVitals');
    if (vitals) {
      const parsed = JSON.parse(vitals);
      data.paintColors = parsed.state?.paintColors || [];
      data.homeVitals = parsed.state?.homeVitals || {};
      data.serviceHistory = parsed.state?.serviceHistory || [];
    }
  } catch {
    // Ignore
  }

  return data;
}

// Save data to localStorage
function saveToLocal(data: any): void {
  const mappings: Record<string, string> = {
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
}

// Check if local data has content
function hasLocalData(data: any): boolean {
  return Object.values(data).some((arr: any) => Array.isArray(arr) && arr.length > 0);
}

// Check if backend data has content
function hasBackendData(data: any): boolean {
  if (!data) return false;
  const collections = ['projects', 'items', 'vendors', 'warranties', 'maintenance', 'documents'];
  return collections.some(key => Array.isArray(data[key]) && data[key].length > 0);
}

// Main auto-sync function - called on app startup
export async function autoSync(): Promise<SyncResult> {
  console.log('🔄 HomeTracker: Starting auto-sync...');
  
  const isOnline = await checkBackend();
  
  if (!isOnline) {
    console.log('📴 Backend offline, using local data');
    return {
      success: true,
      message: 'Backend offline, using local data',
      source: 'local',
    };
  }

  console.log('✅ Backend online, checking data...');
  
  const localData = getLocalData();
  const backendData = await fetchBackendData();
  
  const localHasData = hasLocalData(localData);
  const backendHasData = hasBackendData(backendData);

  // Decision logic:
  // 1. If backend has data and local doesn't -> pull from backend
  // 2. If local has data and backend doesn't -> push to backend
  // 3. If both have data -> use backend as source of truth (can be changed)
  // 4. If neither has data -> no sync needed

  if (backendHasData && !localHasData) {
    console.log('📥 Importing data from backend...');
    saveToLocal(backendData);
    return {
      success: true,
      message: 'Data imported from backend',
      source: 'backend',
    };
  }

  if (localHasData && !backendHasData) {
    console.log('📤 Pushing local data to backend...');
    const pushed = await pushToBackend({
      ...localData,
      lastUpdated: new Date().toISOString(),
    });
    return {
      success: pushed,
      message: pushed ? 'Local data synced to backend' : 'Failed to sync to backend',
      source: 'local',
    };
  }

  if (backendHasData && localHasData) {
    // Backend is source of truth - update local
    console.log('🔄 Backend has data, updating local...');
    saveToLocal(backendData);
    return {
      success: true,
      message: 'Synced from backend (source of truth)',
      source: 'backend',
    };
  }

  console.log('📭 No data to sync');
  return {
    success: true,
    message: 'No data to sync',
    source: 'none',
  };
}

// Debounced sync - call this when data changes
let syncTimeout: NodeJS.Timeout | null = null;

export function scheduleSync(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  
  syncTimeout = setTimeout(async () => {
    const isOnline = await checkBackend();
    if (isOnline) {
      const localData = getLocalData();
      await pushToBackend({
        ...localData,
        lastUpdated: new Date().toISOString(),
      });
      console.log('✅ Background sync completed');
    }
  }, 5000); // 5 second debounce
}

