import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Tesseract from 'tesseract.js';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const FILES_DIR = path.join(DATA_DIR, 'files');
const THUMBNAILS_DIR = path.join(DATA_DIR, 'thumbnails');

// Ensure directories exist
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

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

export interface FileMetadata {
  files: StoredFile[];
  lastUpdated: string;
}

const METADATA_FILE = path.join(DATA_DIR, 'files-metadata.json');

// Load or initialize metadata
function loadMetadata(): FileMetadata {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading file metadata:', error);
  }
  return { files: [], lastUpdated: new Date().toISOString() };
}

function saveMetadata(metadata: FileMetadata): void {
  metadata.lastUpdated = new Date().toISOString();
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// Supported image types for OCR
const OCR_SUPPORTED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

// Check if file type supports OCR
function supportsOcr(mimeType: string): boolean {
  return OCR_SUPPORTED_TYPES.includes(mimeType.toLowerCase());
}

// Perform OCR on an image
async function performOcr(filePath: string): Promise<string> {
  try {
    console.log(`🔍 Starting OCR for: ${filePath}`);
    const result = await Tesseract.recognize(filePath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`   OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    console.log(`✅ OCR completed for: ${filePath}`);
    return result.data.text.trim();
  } catch (error) {
    console.error(`❌ OCR failed for: ${filePath}`, error);
    throw error;
  }
}

export const fileService = {
  // Save uploaded file
  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<StoredFile> {
    const id = uuidv4();
    const ext = path.extname(originalName) || '.bin';
    const filename = `${id}${ext}`;
    const filePath = path.join(FILES_DIR, filename);

    // Write file to disk
    fs.writeFileSync(filePath, buffer);

    const fileInfo: StoredFile = {
      id,
      originalName,
      filename,
      path: `/files/${filename}`,
      mimeType,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
      ocrStatus: supportsOcr(mimeType) ? 'pending' : 'not_applicable',
    };

    // Save metadata
    const metadata = loadMetadata();
    metadata.files.push(fileInfo);
    saveMetadata(metadata);

    // Start OCR in background if supported
    if (supportsOcr(mimeType)) {
      this.processOcr(id, filePath).catch(console.error);
    }

    return fileInfo;
  },

  // Process OCR for a file
  async processOcr(fileId: string, filePath: string): Promise<void> {
    const metadata = loadMetadata();
    const fileIndex = metadata.files.findIndex((f) => f.id === fileId);
    
    if (fileIndex === -1) return;

    // Update status to processing
    metadata.files[fileIndex].ocrStatus = 'processing';
    saveMetadata(metadata);

    try {
      const ocrText = await performOcr(filePath);
      
      // Reload metadata (might have changed)
      const updatedMetadata = loadMetadata();
      const updatedIndex = updatedMetadata.files.findIndex((f) => f.id === fileId);
      
      if (updatedIndex !== -1) {
        updatedMetadata.files[updatedIndex].ocrText = ocrText;
        updatedMetadata.files[updatedIndex].ocrStatus = 'completed';
        saveMetadata(updatedMetadata);
      }
    } catch (error) {
      // Reload and update status to failed
      const updatedMetadata = loadMetadata();
      const updatedIndex = updatedMetadata.files.findIndex((f) => f.id === fileId);
      
      if (updatedIndex !== -1) {
        updatedMetadata.files[updatedIndex].ocrStatus = 'failed';
        saveMetadata(updatedMetadata);
      }
    }
  },

  // Get file by ID
  getFile(fileId: string): StoredFile | null {
    const metadata = loadMetadata();
    return metadata.files.find((f) => f.id === fileId) || null;
  },

  // Get file path on disk
  getFilePath(filename: string): string {
    return path.join(FILES_DIR, filename);
  },

  // Get all files
  getAllFiles(): StoredFile[] {
    return loadMetadata().files;
  },

  // Delete file
  deleteFile(fileId: string): boolean {
    const metadata = loadMetadata();
    const fileIndex = metadata.files.findIndex((f) => f.id === fileId);
    
    if (fileIndex === -1) return false;

    const file = metadata.files[fileIndex];
    const filePath = path.join(FILES_DIR, file.filename);

    // Delete physical file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete thumbnail if exists
    if (file.thumbnailPath) {
      const thumbPath = path.join(THUMBNAILS_DIR, path.basename(file.thumbnailPath));
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    // Remove from metadata
    metadata.files.splice(fileIndex, 1);
    saveMetadata(metadata);

    return true;
  },

  // Search files by OCR text or filename
  searchFiles(query: string): StoredFile[] {
    const metadata = loadMetadata();
    const lowerQuery = query.toLowerCase();
    
    return metadata.files.filter((file) => {
      // Search in filename
      if (file.originalName.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      // Search in OCR text
      if (file.ocrText && file.ocrText.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      return false;
    });
  },

  // Re-run OCR for a file
  async reprocessOcr(fileId: string): Promise<boolean> {
    const file = this.getFile(fileId);
    if (!file || !supportsOcr(file.mimeType)) {
      return false;
    }

    const filePath = path.join(FILES_DIR, file.filename);
    if (!fs.existsSync(filePath)) {
      return false;
    }

    await this.processOcr(fileId, filePath);
    return true;
  },

  // Get storage stats
  getStorageStats(): { totalFiles: number; totalSize: number; ocrCompleted: number } {
    const metadata = loadMetadata();
    return {
      totalFiles: metadata.files.length,
      totalSize: metadata.files.reduce((sum, f) => sum + f.size, 0),
      ocrCompleted: metadata.files.filter((f) => f.ocrStatus === 'completed').length,
    };
  },
};

export default fileService;



