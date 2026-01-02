/**
 * Image API Routes
 * 
 * Handles image uploads, retrieval, and management.
 * Supports batch uploads for AI-powered inventory processing.
 */

import { Router, Request, Response } from 'express';

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Allowed image MIME types to prevent XSS via content-type manipulation
const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'image/heic',
  'image/heif',
];

/**
 * Validate that a string is a valid UUID v4 to prevent injection attacks
 */
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Validate MIME type is a safe image type to prevent XSS
 */
function isValidImageMimeType(mimeType: string): boolean {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType.toLowerCase());
}
import multer from 'multer';
import { imageStorageService } from '../services/image-storage.service';
import { aiBatchProcessorService } from '../services/ai-batch-processor.service';

const router = Router();

// Configure multer for memory storage (files processed in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max per file
    files: 100, // Max 100 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`));
    }
  },
});

/**
 * POST /api/images/upload
 * Upload a single image
 */
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const { entityType = 'item', entityId, isPrimary = 'false' } = req.body;

    if (!entityId) {
      return res.status(400).json({ success: false, error: 'entityId is required' });
    }

    const result = await imageStorageService.uploadImage(
      req.file.buffer,
      req.file.originalname,
      entityType,
      entityId,
      { isPrimary: isPrimary === 'true' }
    );

    res.json({
      success: true,
      image: result,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/images/batch-upload
 * Upload multiple images for batch AI processing
 */
router.post('/batch-upload', upload.array('images', 100), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images provided' });
    }

    const {
      entityType = 'item',
      entityId = 'pending', // Temporary entity ID for unassigned images
      createAIJob = 'true',
      aiJobType = 'inventory_detection',
      provider,
      model,
      propertyId = 'default',
    } = req.body;

    console.log(`📤 Batch upload: ${files.length} images`);

    const result = await imageStorageService.batchUpload(
      files.map(f => ({ buffer: f.buffer, filename: f.originalname })),
      entityType,
      entityId,
      {
        createAIJob: createAIJob === 'true',
        aiJobType,
        provider,
        model,
      }
    );

    res.json({
      success: true,
      uploaded: result.successful.length,
      failed: result.failed.length,
      images: result.successful,
      errors: result.failed,
      aiJobId: result.aiJobId,
      message: result.aiJobId 
        ? `Uploaded ${result.successful.length} images. AI processing job ${result.aiJobId} created.`
        : `Uploaded ${result.successful.length} images.`,
    });
  } catch (error: any) {
    console.error('Batch upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/images/:id
 * Get image by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    // Validate ID format to prevent injection
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid image ID format' });
    }
    
    const image = imageStorageService.getImage(req.params.id);
    
    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    // Validate MIME type to prevent XSS via content-type manipulation
    if (!isValidImageMimeType(image.mimeType)) {
      return res.status(400).json({ success: false, error: 'Invalid image type' });
    }

    // Set security headers
    res.set('Content-Type', image.mimeType);
    res.set('Content-Disposition', `inline; filename="${image.filename.replace(/[^\w.-]/g, '_')}"`);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
    res.send(image.buffer);
  } catch (error: any) {
    console.error('Get image error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/images/:id/thumbnail
 * Get image thumbnail
 */
router.get('/:id/thumbnail', (req: Request, res: Response) => {
  try {
    // Validate ID format to prevent injection
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid image ID format' });
    }
    
    const thumbnail = imageStorageService.getThumbnail(req.params.id);
    
    if (!thumbnail) {
      return res.status(404).json({ success: false, error: 'Thumbnail not found' });
    }

    // Validate MIME type to prevent XSS via content-type manipulation
    if (!isValidImageMimeType(thumbnail.mimeType)) {
      return res.status(400).json({ success: false, error: 'Invalid image type' });
    }

    // Set security headers
    res.set('Content-Type', thumbnail.mimeType);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
    res.send(thumbnail.buffer);
  } catch (error: any) {
    console.error('Get thumbnail error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/images/entity/:type/:id
 * Get all images for an entity
 */
router.get('/entity/:type/:id', (req: Request, res: Response) => {
  try {
    const images = imageStorageService.getEntityImages(req.params.type, req.params.id);
    
    res.json({
      success: true,
      images: images.map(img => ({
        ...img,
        url: `/api/images/${img.id}`,
        thumbnailUrl: `/api/images/${img.id}/thumbnail`,
        ai_analysis: typeof img.ai_analysis === 'string' ? JSON.parse(img.ai_analysis) : img.ai_analysis,
      })),
    });
  } catch (error: any) {
    console.error('Get entity images error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/images/:id
 * Delete an image
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = imageStorageService.deleteImage(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    res.json({ success: true, message: 'Image deleted' });
  } catch (error: any) {
    console.error('Delete image error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/images/:id/primary
 * Set image as primary for its entity
 */
router.put('/:id/primary', (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.body;
    
    if (!entityType || !entityId) {
      return res.status(400).json({ success: false, error: 'entityType and entityId required' });
    }

    imageStorageService.setPrimaryImage(req.params.id, entityType, entityId);
    
    res.json({ success: true, message: 'Primary image updated' });
  } catch (error: any) {
    console.error('Set primary image error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/images/stats
 * Get image storage statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = imageStorageService.getStorageStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        totalSizeMB: (stats.totalSize / (1024 * 1024)).toFixed(2),
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/images/cleanup
 * Clean up orphaned images
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const cleaned = await imageStorageService.cleanupOrphans();
    
    res.json({
      success: true,
      message: `Cleaned up ${cleaned} orphaned images`,
      cleaned,
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
