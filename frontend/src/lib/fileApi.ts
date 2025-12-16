// File API service for uploading and managing documents with OCR

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export interface StoredFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  ocrText?: string;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable';
  thumbnailPath?: string;
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  ocrCompleted: number;
}

function getBaseUrl(): string {
  return API_URL.startsWith('/api') ? '' : API_URL;
}

export const fileApi = {
  // Upload a single file
  async uploadFile(file: File): Promise<StoredFile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${getBaseUrl()}/api/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    return result.data;
  },

  // Upload multiple files
  async uploadFiles(files: File[]): Promise<StoredFile[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${getBaseUrl()}/api/files/upload-multiple`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    return result.data;
  },

  // Get all files
  async getAllFiles(): Promise<StoredFile[]> {
    const response = await fetch(`${getBaseUrl()}/api/files`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }

    const result = await response.json();
    return result.data;
  },

  // Get file by ID
  async getFile(id: string): Promise<StoredFile> {
    const response = await fetch(`${getBaseUrl()}/api/files/${id}`);
    
    if (!response.ok) {
      throw new Error('File not found');
    }

    const result = await response.json();
    return result.data;
  },

  // Search files by query (searches filename and OCR text)
  async searchFiles(query: string): Promise<StoredFile[]> {
    const response = await fetch(
      `${getBaseUrl()}/api/files/search?q=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error('Search failed');
    }

    const result = await response.json();
    return result.data;
  },

  // Get file storage stats
  async getStats(): Promise<FileStats> {
    const response = await fetch(`${getBaseUrl()}/api/files/stats`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const result = await response.json();
    return result.data;
  },

  // Delete file
  async deleteFile(id: string): Promise<void> {
    const response = await fetch(`${getBaseUrl()}/api/files/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  },

  // Re-run OCR for a file
  async reprocessOcr(id: string): Promise<void> {
    const response = await fetch(`${getBaseUrl()}/api/files/${id}/ocr`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to start OCR');
    }
  },

  // Get download URL for a file
  getDownloadUrl(id: string): string {
    return `${getBaseUrl()}/api/files/${id}/download`;
  },

  // Get view URL for a file (for images)
  getViewUrl(id: string): string {
    return `${getBaseUrl()}/api/files/${id}/view`;
  },

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  },

  // Check if file type is an image
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  },

  // Check if file supports OCR
  supportsOcr(mimeType: string): boolean {
    const ocrTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
    ];
    return ocrTypes.includes(mimeType.toLowerCase());
  },
};

export default fileApi;










