/**
 * Image Storage Service
 * 
 * Handles image uploads, thumbnail generation, and storage management.
 * Supports batch uploads for AI-powered inventory categorization.
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './database.service';

const DATA_DIR = path.join(__dirname, '../../data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const THUMBNAILS_DIR = path.join(DATA_DIR, 'thumbnails');

// Ensure directories exist
[IMAGES_DIR, THUMBNAILS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Thumbnail sizes
const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 },
};

export interface ImageUploadResult {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  storagePath: string;
  thumbnailPath: string;
  url: string;
  thumbnailUrl: string;
}

export interface BatchUploadResult {
  successful: ImageUploadResult[];
  failed: Array<{ filename: string; error: string }>;
  totalProcessed: number;
  aiJobId?: string;
}

class ImageStorageService {
  /**
   * Upload a single image with thumbnail generation
   */
  async uploadImage(
    buffer: Buffer,
    originalFilename: string,
    entityType: string,
    entityId: string,
    options: {
      isPrimary?: boolean;
      generateThumbnails?: boolean;
      processWithAI?: boolean;
    } = {}
  ): Promise<ImageUploadResult> {
    const id = uuidv4();
    const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
    const filename = `${id}${ext}`;
    const storagePath = path.join(IMAGES_DIR, filename);

    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const mimeType = this.getMimeType(ext);

    // Optimize and save original
    let processedBuffer = buffer;
    if (mimeType.startsWith('image/')) {
      processedBuffer = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    }

    fs.writeFileSync(storagePath, processedBuffer);

    // Generate thumbnail
    let thumbnailPath = '';
    if (options.generateThumbnails !== false) {
      thumbnailPath = await this.generateThumbnail(buffer, id);
    }

    // Store in database
    const imageRecord = {
      id,
      entity_type: entityType,
      entity_id: entityId,
      filename,
      original_filename: originalFilename,
      mime_type: mimeType,
      file_size: processedBuffer.length,
      width,
      height,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      storage_type: 'local',
      is_primary: options.isPrimary ? 1 : 0,
      ai_processed: 0,
    };

    databaseService.insert('images', imageRecord);

    return {
      id,
      filename,
      originalFilename,
      mimeType,
      fileSize: processedBuffer.length,
      width,
      height,
      storagePath,
      thumbnailPath,
      url: `/api/images/${id}`,
      thumbnailUrl: `/api/images/${id}/thumbnail`,
    };
  }

  /**
   * Batch upload multiple images
   * Returns immediately with job ID for AI processing
   */
  async batchUpload(
    files: Array<{ buffer: Buffer; filename: string }>,
    entityType: string,
    entityId: string,
    options: {
      createAIJob?: boolean;
      aiJobType?: string;
      provider?: string;
      model?: string;
    } = {}
  ): Promise<BatchUploadResult> {
    const successful: ImageUploadResult[] = [];
    const failed: Array<{ filename: string; error: string }> = [];

    // Process uploads in parallel (batch of 5)
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(file => this.uploadImage(file.buffer, file.filename, entityType, entityId))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push({
            filename: batch[index].filename,
            error: result.reason?.message || 'Upload failed',
          });
        }
      });
    }

    let aiJobId: string | undefined;

    // Create AI job if requested
    if (options.createAIJob && successful.length > 0) {
      aiJobId = uuidv4();
      
      databaseService.createAIJob({
        id: aiJobId,
        type: options.aiJobType || 'image_analysis',
        input_data: {
          images: successful.map(img => ({
            imageId: img.id,
            filename: img.originalFilename,
          })),
          entityType,
          entityId,
        },
        provider: options.provider || 'openai',
        model: options.model || 'gpt-4o',
      });

      // Create job items for each image
      successful.forEach((img, index) => {
        databaseService.insert('ai_job_items', {
          id: uuidv4(),
          job_id: aiJobId,
          image_id: img.id,
          status: 'pending',
          input_data: { imageId: img.id, filename: img.originalFilename },
        });
      });

      console.log(`📋 Created AI job ${aiJobId} with ${successful.length} images`);
    }

    return {
      successful,
      failed,
      totalProcessed: files.length,
      aiJobId,
    };
  }

  /**
   * Generate thumbnail for an image
   */
  private async generateThumbnail(buffer: Buffer, imageId: string): Promise<string> {
    const thumbnailFilename = `${imageId}_thumb.jpg`;
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename);

    await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .resize(THUMBNAIL_SIZES.medium.width, THUMBNAIL_SIZES.medium.height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return thumbnailPath;
  }

  /**
   * Get image by ID
   */
  getImage(id: string): { buffer: Buffer; mimeType: string; filename: string } | null {
    const image = databaseService.getById<any>('images', id);
    if (!image || !fs.existsSync(image.storage_path)) {
      return null;
    }

    return {
      buffer: fs.readFileSync(image.storage_path),
      mimeType: image.mime_type,
      filename: image.filename,
    };
  }

  /**
   * Get thumbnail by image ID
   */
  getThumbnail(id: string): { buffer: Buffer; mimeType: string } | null {
    const image = databaseService.getById<any>('images', id);
    if (!image || !image.thumbnail_path || !fs.existsSync(image.thumbnail_path)) {
      // Return original as fallback
      const original = this.getImage(id);
      if (original) {
        return { buffer: original.buffer, mimeType: 'image/jpeg' };
      }
      return null;
    }

    return {
      buffer: fs.readFileSync(image.thumbnail_path),
      mimeType: 'image/jpeg',
    };
  }

  /**
   * Get all images for an entity
   */
  getEntityImages(entityType: string, entityId: string): any[] {
    const stmt = databaseService.prepare(`
      SELECT * FROM images 
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY is_primary DESC, sort_order ASC, created_at ASC
    `);
    return stmt.all(entityType, entityId);
  }

  /**
   * Delete an image
   */
  deleteImage(id: string): boolean {
    const image = databaseService.getById<any>('images', id);
    if (!image) return false;

    // Delete files
    if (fs.existsSync(image.storage_path)) {
      fs.unlinkSync(image.storage_path);
    }
    if (image.thumbnail_path && fs.existsSync(image.thumbnail_path)) {
      fs.unlinkSync(image.thumbnail_path);
    }

    // Delete from database
    return databaseService.delete('images', id);
  }

  /**
   * Set primary image for an entity
   */
  setPrimaryImage(imageId: string, entityType: string, entityId: string): void {
    // Clear current primary
    databaseService.exec(`
      UPDATE images SET is_primary = 0 
      WHERE entity_type = '${entityType}' AND entity_id = '${entityId}'
    `);

    // Set new primary
    databaseService.update('images', imageId, { is_primary: 1 });
  }

  /**
   * Update image AI analysis results
   */
  updateImageAIAnalysis(imageId: string, analysis: any): void {
    databaseService.update('images', imageId, {
      ai_analysis: analysis,
      ai_processed: 1,
      ai_processed_at: new Date().toISOString(),
    });
  }

  /**
   * Get images pending AI processing
   */
  getUnprocessedImages(limit: number = 100): any[] {
    return databaseService.getUnprocessedImages(limit);
  }

  /**
   * Get base64 encoded image for AI APIs
   */
  async getImageBase64(id: string): Promise<string | null> {
    const image = this.getImage(id);
    if (!image) return null;

    // Resize for AI processing (max 2000px)
    const resized = await sharp(image.buffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    return resized.toString('base64');
  }

  /**
   * Get MIME type from extension
   */
  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml',
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Get storage stats
   */
  getStorageStats(): {
    totalImages: number;
    totalSize: number;
    unprocessedCount: number;
  } {
    const stats = databaseService.prepare(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(file_size), 0) as total_size,
        SUM(CASE WHEN ai_processed = 0 THEN 1 ELSE 0 END) as unprocessed
      FROM images
    `).get() as any;

    return {
      totalImages: stats.total,
      totalSize: stats.total_size,
      unprocessedCount: stats.unprocessed,
    };
  }

  /**
   * Cleanup orphaned images (no entity reference)
   */
  async cleanupOrphans(): Promise<number> {
    // Find images with no matching entity
    const orphans = databaseService.prepare(`
      SELECT i.* FROM images i
      LEFT JOIN items it ON i.entity_type = 'item' AND i.entity_id = it.id
      LEFT JOIN projects p ON i.entity_type = 'project' AND i.entity_id = p.id
      LEFT JOIN documents d ON i.entity_type = 'document' AND i.entity_id = d.id
      WHERE (i.entity_type = 'item' AND it.id IS NULL)
         OR (i.entity_type = 'project' AND p.id IS NULL)
         OR (i.entity_type = 'document' AND d.id IS NULL)
    `).all() as any[];

    let cleaned = 0;
    for (const orphan of orphans) {
      if (this.deleteImage(orphan.id)) {
        cleaned++;
      }
    }

    console.log(`🧹 Cleaned up ${cleaned} orphaned images`);
    return cleaned;
  }
}

export const imageStorageService = new ImageStorageService();
