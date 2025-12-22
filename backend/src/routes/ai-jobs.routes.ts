/**
 * AI Jobs API Routes
 * 
 * Manages AI batch processing jobs for inventory analysis.
 * Supports BYOK (Bring Your Own Key) configuration.
 */

import { Router, Request, Response } from 'express';
import { aiBatchProcessorService } from '../services/ai-batch-processor.service';
import { databaseService } from '../services/database.service';

const router = Router();

/**
 * POST /api/ai-jobs
 * Create a new AI batch processing job
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      imageIds,
      jobType = 'inventory_detection',
      createItems = true,
      propertyId = 'default',
      provider,
      model,
    } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'imageIds array is required',
      });
    }

    const jobId = await aiBatchProcessorService.createBatchJob(
      imageIds,
      jobType,
      { createItems, propertyId, provider, model }
    );

    res.json({
      success: true,
      jobId,
      message: `AI job created with ${imageIds.length} images. Processing will begin shortly.`,
      statusUrl: `/api/ai-jobs/${jobId}`,
    });
  } catch (error: any) {
    console.error('Create AI job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai-jobs
 * List all AI jobs
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, limit = '50' } = req.query;
    
    const jobs = aiBatchProcessorService.getJobs(
      status as string | undefined,
      parseInt(limit as string, 10)
    );

    res.json({
      success: true,
      jobs: jobs.map(job => ({
        ...job,
        input_data: typeof job.input_data === 'string' ? JSON.parse(job.input_data) : job.input_data,
        output_data: typeof job.output_data === 'string' ? JSON.parse(job.output_data) : job.output_data,
      })),
    });
  } catch (error: any) {
    console.error('List AI jobs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai-jobs/stats
 * Get AI processing statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = aiBatchProcessorService.getStats();
    
    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Get AI stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai-jobs/:id
 * Get job status and details
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const job = aiBatchProcessorService.getJobStatus(req.params.id);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      job,
    });
  } catch (error: any) {
    console.error('Get AI job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai-jobs/:id/cancel
 * Cancel a pending or processing job
 */
router.post('/:id/cancel', (req: Request, res: Response) => {
  try {
    const cancelled = aiBatchProcessorService.cancelJob(req.params.id);
    
    if (!cancelled) {
      return res.status(400).json({
        success: false,
        error: 'Job cannot be cancelled (already completed or not found)',
      });
    }

    res.json({
      success: true,
      message: 'Job cancelled',
    });
  } catch (error: any) {
    console.error('Cancel AI job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai-jobs/:id/retry
 * Retry failed items in a job
 */
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const retriedCount = await aiBatchProcessorService.retryFailedItems(req.params.id);
    
    res.json({
      success: true,
      message: `Retrying ${retriedCount} failed items`,
      retriedCount,
    });
  } catch (error: any) {
    console.error('Retry AI job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai-jobs/configure
 * Configure AI provider settings
 */
router.post('/configure', (req: Request, res: Response) => {
  try {
    const { provider, apiKey, model, endpoint } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'provider is required',
      });
    }

    aiBatchProcessorService.configure({
      provider,
      apiKey,
      model,
      endpoint,
    });

    // Store in settings (without API key for security)
    databaseService.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES ('ai_provider', ?, datetime('now'))
    `).run(JSON.stringify({ provider, model, endpoint }));

    res.json({
      success: true,
      message: `AI provider configured: ${provider}`,
      config: { provider, model, endpoint },
    });
  } catch (error: any) {
    console.error('Configure AI error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai-jobs/configure
 * Get current AI provider configuration
 */
router.get('/configure', (req: Request, res: Response) => {
  try {
    const config = aiBatchProcessorService.getConfig();
    
    // Get saved settings
    const savedConfig = databaseService.prepare(
      'SELECT value FROM settings WHERE key = ?'
    ).get('ai_provider') as { value: string } | undefined;

    res.json({
      success: true,
      config: config ? {
        provider: config.provider,
        model: config.model,
        endpoint: config.endpoint,
        hasApiKey: !!config.apiKey,
      } : null,
      savedConfig: savedConfig ? JSON.parse(savedConfig.value) : null,
    });
  } catch (error: any) {
    console.error('Get AI config error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai-jobs/analyze-single
 * Analyze a single image without creating a job
 */
router.post('/analyze-single', async (req: Request, res: Response) => {
  try {
    const { imageId, analysisType = 'inventory_detection', provider, model } = req.body;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        error: 'imageId is required',
      });
    }

    // Get image base64
    const { imageStorageService } = await import('../services/image-storage.service');
    const imageBase64 = await imageStorageService.getImageBase64(imageId);
    
    if (!imageBase64) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
      });
    }

    // Analyze
    const analysis = await aiBatchProcessorService.analyzeImage(
      imageBase64,
      analysisType,
      provider,
      model
    );

    // Update image with analysis
    imageStorageService.updateImageAIAnalysis(imageId, analysis);

    res.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error('Analyze single image error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
