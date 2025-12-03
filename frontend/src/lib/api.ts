// API utility for communicating with backend
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;
  private isOnline: boolean = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.checkConnection();
  }

  // Check if backend is available
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      this.isOnline = response.ok;
    } catch {
      this.isOnline = false;
    }
    return this.isOnline;
  }

  // Generic request handler
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return { success: false, error: 'Network error' };
    }
  }

  // Generic CRUD operations
  async get<T>(endpoint: string): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data: any): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string): Promise<{ success: boolean; error?: string }> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Specific API endpoints
  async getProjects() {
    return this.get<any[]>('/api/projects');
  }

  async createProject(project: any) {
    return this.post('/api/projects', project);
  }

  async updateProject(id: string, updates: any) {
    return this.put(`/api/projects/${id}`, updates);
  }

  async deleteProject(id: string) {
    return this.delete(`/api/projects/${id}`);
  }

  // Items
  async getItems() {
    return this.get<any[]>('/api/items');
  }

  async createItem(item: any) {
    return this.post('/api/items', item);
  }

  async updateItem(id: string, updates: any) {
    return this.put(`/api/items/${id}`, updates);
  }

  async deleteItem(id: string) {
    return this.delete(`/api/items/${id}`);
  }

  // Vendors
  async getVendors() {
    return this.get<any[]>('/api/vendors');
  }

  async createVendor(vendor: any) {
    return this.post('/api/vendors', vendor);
  }

  async updateVendor(id: string, updates: any) {
    return this.put(`/api/vendors/${id}`, updates);
  }

  async deleteVendor(id: string) {
    return this.delete(`/api/vendors/${id}`);
  }

  // Warranties
  async getWarranties() {
    return this.get<any[]>('/api/warranties');
  }

  async createWarranty(warranty: any) {
    return this.post('/api/warranties', warranty);
  }

  async updateWarranty(id: string, updates: any) {
    return this.put(`/api/warranties/${id}`, updates);
  }

  async deleteWarranty(id: string) {
    return this.delete(`/api/warranties/${id}`);
  }

  // Maintenance
  async getMaintenanceTasks() {
    return this.get<any[]>('/api/maintenance');
  }

  async createMaintenanceTask(task: any) {
    return this.post('/api/maintenance', task);
  }

  async updateMaintenanceTask(id: string, updates: any) {
    return this.put(`/api/maintenance/${id}`, updates);
  }

  async deleteMaintenanceTask(id: string) {
    return this.delete(`/api/maintenance/${id}`);
  }

  // Documents
  async getDocuments() {
    return this.get<any[]>('/api/documents');
  }

  async createDocument(doc: any) {
    return this.post('/api/documents', doc);
  }

  async updateDocument(id: string, updates: any) {
    return this.put(`/api/documents/${id}`, updates);
  }

  async deleteDocument(id: string) {
    return this.delete(`/api/documents/${id}`);
  }

  // Settings
  async getSettings() {
    return this.get('/api/settings');
  }

  async updateSettings(settings: any) {
    return this.put('/api/settings', settings);
  }

  // Excel operations
  async downloadExcel(): Promise<void> {
    window.open(`${this.baseUrl}/api/excel/download`, '_blank');
  }

  async syncToExcel(): Promise<{ success: boolean; error?: string }> {
    return this.post('/api/excel/sync', {});
  }

  async getAllData() {
    return this.get('/api/excel/data');
  }

  // Check if backend is available
  get online(): boolean {
    return this.isOnline;
  }
}

// Singleton instance
export const api = new ApiClient(API_URL);

// Sync localStorage to backend when coming online
export async function syncLocalToBackend(): Promise<void> {
  const isOnline = await api.checkConnection();
  if (!isOnline) return;

  // Sync each collection if backend is available
  const collections = [
    { key: 'projects', endpoint: '/api/projects' },
    { key: 'items', endpoint: '/api/items' },
    { key: 'vendors', endpoint: '/api/vendors' },
    { key: 'warranties', endpoint: '/api/warranties' },
    { key: 'maintenanceTasks', endpoint: '/api/maintenance' },
    { key: 'documents', endpoint: '/api/documents' },
  ];

  for (const { key, endpoint } of collections) {
    const stored = localStorage.getItem(`hometracker_${key}`);
    if (stored) {
      const data = JSON.parse(stored);
      // Bulk update backend with local data
      await api.put(`${endpoint}/bulk`, data);
    }
  }
}


