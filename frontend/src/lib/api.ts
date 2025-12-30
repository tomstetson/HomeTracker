// API utility for communicating with backend

// Dynamically determine API URL based on current browser location
// This allows the app to work when accessed from LAN/Tailscale
function getApiUrl(): string {
  // Check for explicit environment variable first
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  
  // If running in browser, use same host with backend port
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    // If not localhost, use the same hostname with backend port
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3001`;
    }
  }
  
  // Default to localhost for local development
  return 'http://localhost:3001';
}

const API_URL = getApiUrl();

// ============================================================
// IMAGE API TYPES
// ============================================================

export interface ImageUploadResult {
  id: string;
  filename: string;
  entityType: string;
  entityId: string;
  url: string;
  thumbnailUrl: string;
  isPrimary: boolean;
}

export interface BatchUploadResult {
  uploaded: number;
  failed: number;
  images: ImageUploadResult[];
  errors: { filename: string; error: string }[];
  aiJobId?: string;
  message: string;
}

export interface EntityImage {
  id: string;
  filename: string;
  entity_type: string;
  entity_id: string;
  is_primary: boolean;
  url: string;
  thumbnailUrl: string;
  ai_analysis?: any;
  created_at: string;
}

export interface ImageStats {
  totalImages: number;
  totalSize: number;
  totalSizeMB: string;
  byType: Record<string, number>;
}

// ============================================================
// AI JOBS API TYPES
// ============================================================

export type AIJobType = 
  | 'inventory_detection' 
  | 'warranty_detection' 
  | 'appliance_identification' 
  | 'receipt_scan' 
  | 'condition_assessment';

export type AIJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface AIJob {
  id: string;
  job_type: AIJobType;
  status: AIJobStatus;
  total_items: number;
  processed_items: number;
  failed_items: number;
  created_items: number;
  input_data: any;
  output_data: any;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface AIJobStats {
  totalJobs: number;
  byStatus: Record<AIJobStatus, number>;
  totalImagesProcessed: number;
  totalItemsCreated: number;
  averageProcessingTime: number;
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model?: string;
  endpoint?: string;
  hasApiKey: boolean;
}

// ============================================================
// STORAGE API TYPES
// ============================================================

export interface StorageProvider {
  name: string;
  type: 'local' | 'webdav';
  connected: boolean;
  stats: {
    totalFiles: number;
    totalSize: number;
    available?: number;
  };
}

export interface BackupInfo {
  filename: string;
  provider: string;
  size: number;
  sizeMB: string;
  createdAt: string;
  type: 'full' | 'data-only';
}

export interface BackupSchedule {
  id: string;
  name: string;
  provider: string;
  schedule: string; // cron expression
  enabled: boolean;
  retentionDays: number;
  includeImages: boolean;
  compress: boolean;
  encrypt: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface StorageStats {
  totalBackups: number;
  totalSize: number;
  lastBackup?: string;
  nextScheduledBackup?: string;
  providers: StorageProvider[];
}

// ============================================================
// API CLIENT CLASS
// ============================================================

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
        signal: AbortSignal.timeout(3000),
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

  // Request handler for FormData (file uploads)
  private async requestFormData<T>(
    endpoint: string,
    formData: FormData
  ): Promise<{ success: boolean; data?: T; error?: string; [key: string]: any }> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - browser will set it with boundary
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`API FormData request failed: ${endpoint}`, error);
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

  // ============================================================
  // IMAGE API METHODS
  // ============================================================

  /**
   * Upload a single image
   */
  async uploadImage(
    file: File,
    entityType: string,
    entityId: string,
    isPrimary: boolean = false
  ): Promise<{ success: boolean; image?: ImageUploadResult; error?: string }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    formData.append('isPrimary', String(isPrimary));

    return this.requestFormData('/api/images/upload', formData);
  }

  /**
   * Batch upload images with optional AI job creation
   */
  async batchUploadImages(
    files: File[],
    options: {
      entityType?: string;
      entityId?: string;
      createAIJob?: boolean;
      aiJobType?: AIJobType;
      provider?: string;
      model?: string;
    } = {}
  ): Promise<BatchUploadResult & { success: boolean; error?: string }> {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    formData.append('entityType', options.entityType || 'item');
    formData.append('entityId', options.entityId || 'pending');
    formData.append('createAIJob', String(options.createAIJob ?? true));
    formData.append('aiJobType', options.aiJobType || 'inventory_detection');
    if (options.provider) formData.append('provider', options.provider);
    if (options.model) formData.append('model', options.model);

    const result = await this.requestFormData<any>('/api/images/batch-upload', formData);
    return {
      success: result.success,
      uploaded: result.uploaded || 0,
      failed: result.failed || 0,
      images: result.images || [],
      errors: result.errors || [],
      aiJobId: result.aiJobId,
      message: result.message || '',
      error: result.error,
    };
  }

  /**
   * Get image URL (for <img> src)
   */
  getImageUrl(imageId: string): string {
    return `${this.baseUrl}/api/images/${imageId}`;
  }

  /**
   * Get thumbnail URL (for <img> src)
   */
  getThumbnailUrl(imageId: string): string {
    return `${this.baseUrl}/api/images/${imageId}/thumbnail`;
  }

  /**
   * Get all images for an entity
   */
  async getEntityImages(
    entityType: string,
    entityId: string
  ): Promise<{ success: boolean; images?: EntityImage[]; error?: string }> {
    return this.get(`/api/images/entity/${entityType}/${entityId}`);
  }

  /**
   * Delete an image
   */
  async deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
    return this.delete(`/api/images/${imageId}`);
  }

  /**
   * Set an image as primary for its entity
   */
  async setPrimaryImage(
    imageId: string,
    entityType: string,
    entityId: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.put(`/api/images/${imageId}/primary`, { entityType, entityId });
  }

  /**
   * Get image storage statistics
   */
  async getImageStats(): Promise<{ success: boolean; stats?: ImageStats; error?: string }> {
    return this.get('/api/images/stats');
  }

  /**
   * Clean up orphaned images
   */
  async cleanupOrphanedImages(): Promise<{ success: boolean; cleaned?: number; error?: string }> {
    return this.post('/api/images/cleanup', {});
  }

  // ============================================================
  // AI JOBS API METHODS
  // ============================================================

  /**
   * Create a new AI batch processing job
   */
  async createAIJob(
    imageIds: string[],
    jobType: AIJobType = 'inventory_detection',
    options: {
      createItems?: boolean;
      propertyId?: string;
      provider?: string;
      model?: string;
    } = {}
  ): Promise<{ success: boolean; jobId?: string; statusUrl?: string; error?: string }> {
    return this.post('/api/ai-jobs', {
      imageIds,
      jobType,
      createItems: options.createItems ?? true,
      propertyId: options.propertyId || 'default',
      provider: options.provider,
      model: options.model,
    });
  }

  /**
   * List all AI jobs
   */
  async getAIJobs(
    status?: AIJobStatus,
    limit: number = 50
  ): Promise<{ success: boolean; jobs?: AIJob[]; error?: string }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', String(limit));
    return this.get(`/api/ai-jobs?${params.toString()}`);
  }

  /**
   * Get a specific job's status
   */
  async getAIJob(jobId: string): Promise<{ success: boolean; job?: AIJob; error?: string }> {
    return this.get(`/api/ai-jobs/${jobId}`);
  }

  /**
   * Cancel a pending or processing job
   */
  async cancelAIJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    return this.post(`/api/ai-jobs/${jobId}/cancel`, {});
  }

  /**
   * Retry failed items in a job
   */
  async retryAIJob(jobId: string): Promise<{ success: boolean; retriedCount?: number; error?: string }> {
    return this.post(`/api/ai-jobs/${jobId}/retry`, {});
  }

  /**
   * Get AI processing statistics
   */
  async getAIStats(): Promise<{ success: boolean; stats?: AIJobStats; error?: string }> {
    return this.get('/api/ai-jobs/stats');
  }

  /**
   * Configure AI provider (BYOK)
   */
  async configureAI(config: {
    provider: 'openai' | 'anthropic' | 'google';
    apiKey?: string;
    model?: string;
    endpoint?: string;
  }): Promise<{ success: boolean; config?: AIConfig; error?: string }> {
    return this.post('/api/ai-jobs/configure', config);
  }

  /**
   * Get current AI configuration
   */
  async getAIConfig(): Promise<{ success: boolean; config?: AIConfig; savedConfig?: any; error?: string }> {
    return this.get('/api/ai-jobs/configure');
  }

  /**
   * Analyze a single image without creating a batch job
   */
  async analyzeSingleImage(
    imageId: string,
    analysisType: AIJobType = 'inventory_detection',
    options?: { provider?: string; model?: string }
  ): Promise<{ success: boolean; analysis?: any; error?: string }> {
    return this.post('/api/ai-jobs/analyze-single', {
      imageId,
      analysisType,
      provider: options?.provider,
      model: options?.model,
    });
  }

  // ============================================================
  // STORAGE API METHODS
  // ============================================================

  /**
   * Get all configured storage providers
   */
  async getStorageProviders(): Promise<{ success: boolean; providers?: StorageProvider[]; error?: string }> {
    return this.get('/api/storage/providers');
  }

  /**
   * Add a WebDAV storage provider (NAS)
   */
  async addWebDAVProvider(
    name: string,
    config: {
      url: string;
      username: string;
      password: string;
      basePath?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.post('/api/storage/providers/webdav', { name, ...config });
  }

  /**
   * Test a storage provider connection
   */
  async testStorageProvider(name: string): Promise<{ success: boolean; latency?: number; error?: string }> {
    return this.post(`/api/storage/providers/${name}/test`, {});
  }

  /**
   * Get all backups across all providers
   */
  async getBackups(): Promise<{ success: boolean; backups?: BackupInfo[]; error?: string }> {
    return this.get('/api/storage/backups');
  }

  /**
   * Get all backup schedules
   */
  async getBackupSchedules(): Promise<{ success: boolean; schedules?: BackupSchedule[]; error?: string }> {
    return this.get('/api/storage/schedules');
  }

  /**
   * Create a backup schedule
   */
  async createBackupSchedule(schedule: {
    name: string;
    provider: string;
    schedule: string; // cron expression
    enabled?: boolean;
    retentionDays?: number;
    includeImages?: boolean;
    compress?: boolean;
    encrypt?: boolean;
  }): Promise<{ success: boolean; schedule?: BackupSchedule; error?: string }> {
    return this.post('/api/storage/schedules', schedule);
  }

  /**
   * Run a backup immediately
   */
  async runBackup(scheduleId: string): Promise<{ success: boolean; result?: any; error?: string }> {
    return this.post(`/api/storage/schedules/${scheduleId}/run`, {});
  }

  /**
   * Enable or disable a backup schedule
   */
  async toggleBackupSchedule(
    scheduleId: string,
    enabled: boolean
  ): Promise<{ success: boolean; error?: string }> {
    return this.put(`/api/storage/schedules/${scheduleId}/toggle`, { enabled });
  }

  /**
   * Delete a backup schedule
   */
  async deleteBackupSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    return this.delete(`/api/storage/schedules/${scheduleId}`);
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(
    provider: string,
    filename: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.post('/api/storage/backups/restore', { provider, filename });
  }

  /**
   * Get storage and backup statistics
   */
  async getStorageStats(): Promise<{ success: boolean; stats?: StorageStats; error?: string }> {
    return this.get('/api/storage/stats');
  }

  // ============================================================
  // EXISTING API METHODS (Projects, Items, etc.)
  // ============================================================

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


