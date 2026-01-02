import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { fileService } from '../services/file.service';

const router = Router();

// Rate limiters to prevent resource exhaustion attacks (CWE-770)
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 uploads per window
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'Too many uploads, please try again later' });
  },
});

const downloadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 downloads per window
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'Too many requests, please try again later' });
  },
});

// Configure multer for memory storage (we'll handle saving ourselves)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      // HEIC/HEIF (Apple formats - will be converted to JPEG)
      'image/heic',
      'image/heif',
      'image/heic-sequence',
      'image/heif-sequence',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    // Check by MIME type first
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    
    // Fallback: check by file extension for HEIC files (browsers may not detect MIME correctly)
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.heic' || ext === '.heif') {
      // Override mimetype for HEIC files
      file.mimetype = 'image/heic';
      cb(null, true);
      return;
    }
    
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  },
});

// Upload a file (rate limited)
router.post('/upload', uploadRateLimiter, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    const storedFile = await fileService.saveFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: true,
      data: storedFile,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file',
    });
  }
});

// Upload multiple files (rate limited)
router.post('/upload-multiple', uploadRateLimiter, upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided',
      });
    }

    const storedFiles = await Promise.all(
      files.map((file) =>
        fileService.saveFile(file.buffer, file.originalname, file.mimetype)
      )
    );

    res.json({
      success: true,
      data: storedFiles,
    });
  } catch (error: any) {
    console.error('Multi-file upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload files',
    });
  }
});

// Get all files
router.get('/', (req: Request, res: Response) => {
  try {
    const files = fileService.getAllFiles();
    res.json({
      success: true,
      data: files,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get files',
    });
  }
});

// Search files (by filename or OCR text)
router.get('/search', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const files = fileService.searchFiles(query);
    res.json({
      success: true,
      data: files,
      query,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Search failed',
    });
  }
});

// Get storage stats
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = fileService.getStorageStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stats',
    });
  }
});

// Get file metadata by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const file = fileService.getFile(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get file',
    });
  }
});

// Download/serve file (rate limited)
router.get('/:id/download', downloadRateLimiter, (req: Request, res: Response) => {
  try {
    const file = fileService.getFile(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    const filePath = fileService.getFilePath(file.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
      });
    }

    res.download(filePath, file.originalName);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download file',
    });
  }
});

// Serve file directly (for images, rate limited)
router.get('/:id/view', downloadRateLimiter, (req: Request, res: Response) => {
  try {
    const file = fileService.getFile(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    const filePath = fileService.getFilePath(file.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
      });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to serve file',
    });
  }
});

// Serve thumbnail for images (rate limited)
router.get('/:id/thumbnail', downloadRateLimiter, (req: Request, res: Response) => {
  try {
    const file = fileService.getFile(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    // Check if it's an image
    if (!file.mimeType.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'File is not an image',
      });
    }

    // Check for thumbnail first
    if (file.thumbnailPath) {
      const thumbnailFullPath = path.join(__dirname, '../../data', file.thumbnailPath);
      if (fs.existsSync(thumbnailFullPath)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return fs.createReadStream(thumbnailFullPath).pipe(res);
      }
    }

    // Fallback to full image
    const filePath = fileService.getFilePath(file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
      });
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to serve thumbnail',
    });
  }
});

// Re-run OCR for a file
router.post('/:id/ocr', async (req: Request, res: Response) => {
  try {
    const success = await fileService.reprocessOcr(req.params.id);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Cannot process OCR for this file',
      });
    }

    res.json({
      success: true,
      message: 'OCR processing started',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start OCR',
    });
  }
});

// Delete file
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const success = fileService.deleteFile(req.params.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete file',
    });
  }
});

export default router;







