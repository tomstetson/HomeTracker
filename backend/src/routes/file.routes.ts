import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileService } from '../services/file.service';

const router = Router();

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
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

// Upload a file
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
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

// Upload multiple files
router.post('/upload-multiple', upload.array('files', 10), async (req: Request, res: Response) => {
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

// Download/serve file
router.get('/:id/download', (req: Request, res: Response) => {
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

// Serve file directly (for images)
router.get('/:id/view', (req: Request, res: Response) => {
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

