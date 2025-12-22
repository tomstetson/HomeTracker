/**
 * AI Batch Processor Service
 * 
 * Handles batch AI processing for inventory photos:
 * - Object detection and categorization
 * - Brand/model recognition
 * - Condition assessment
 * - Auto-tagging and description generation
 * 
 * Supports BYOK (Bring Your Own Key) for OpenAI, Anthropic, Google, etc.
 */

import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './database.service';
import { imageStorageService } from './image-storage.service';

// AI Provider configurations
interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'local';
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

// Analysis result for a single image
export interface ImageAnalysisResult {
  objectType: string;
  category: string;
  brand?: string;
  model?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  estimatedValue?: { low: number; high: number };
  description: string;
  tags: string[];
  color?: string;
  material?: string;
  dimensions?: string;
  age?: string;
  serialNumber?: string;
  confidence: number;
  rawResponse?: any;
}

// Batch job result
export interface BatchProcessResult {
  jobId: string;
  status: 'completed' | 'partial' | 'failed';
  processed: number;
  failed: number;
  results: Array<{
    imageId: string;
    itemId?: string;
    analysis: ImageAnalysisResult | null;
    error?: string;
  }>;
  duration: number;
  tokensUsed?: number;
  estimatedCost?: number;
}

// Prompt templates for different analysis types
const ANALYSIS_PROMPTS = {
  inventory_detection: `Analyze this image of a home inventory item. Provide a detailed analysis in JSON format:

{
  "objectType": "specific type of object (e.g., 'Refrigerator', 'Sofa', 'Lawn Mower')",
  "category": "general category (e.g., 'Kitchen Appliances', 'Furniture', 'Tools')",
  "brand": "brand name if visible, null if not",
  "model": "model number/name if visible, null if not",
  "condition": "one of: excellent, good, fair, poor, unknown",
  "description": "brief 1-2 sentence description",
  "tags": ["relevant", "tags", "for", "searching"],
  "color": "primary color",
  "material": "primary material if identifiable",
  "estimatedValue": { "low": 0, "high": 0 },
  "confidence": 0.0 to 1.0
}

Focus on accuracy. If you can't determine something, use null or 'unknown'. Be specific about the object type.`,

  receipt_scan: `Extract information from this receipt image. Provide JSON:

{
  "vendor": "store/vendor name",
  "date": "YYYY-MM-DD format",
  "items": [{ "name": "item name", "price": 0.00, "quantity": 1 }],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "paymentMethod": "cash/credit/debit",
  "confidence": 0.0 to 1.0
}`,

  document_ocr: `Extract all text from this document image. Provide JSON:

{
  "documentType": "type of document",
  "title": "document title if present",
  "date": "any date found",
  "text": "full extracted text",
  "summary": "brief summary of content",
  "entities": { "names": [], "dates": [], "amounts": [], "addresses": [] },
  "confidence": 0.0 to 1.0
}`,

  condition_assessment: `Assess the condition of this item. Provide JSON:

{
  "overallCondition": "excellent/good/fair/poor",
  "damageNotes": ["any visible damage or wear"],
  "cleanlinessLevel": "clean/dusty/dirty",
  "functionalAssessment": "appears functional/needs repair/unknown",
  "ageEstimate": "new/1-3 years/3-5 years/5-10 years/10+ years/vintage",
  "maintenanceNeeded": ["any maintenance suggestions"],
  "confidence": 0.0 to 1.0
}`,
};

class AIBatchProcessorService {
  private isProcessing: boolean = false;
  private processingQueue: string[] = [];
  private config: AIProviderConfig | null = null;

  /**
   * Configure AI provider
   */
  configure(config: AIProviderConfig): void {
    this.config = config;
    console.log(`🤖 AI Batch Processor configured with ${config.provider}`);
  }

  /**
   * Get current configuration
   */
  getConfig(): AIProviderConfig | null {
    return this.config;
  }

  /**
   * Create a new batch processing job
   */
  async createBatchJob(
    imageIds: string[],
    jobType: string = 'inventory_detection',
    options: {
      createItems?: boolean;
      propertyId?: string;
      provider?: string;
      model?: string;
    } = {}
  ): Promise<string> {
    const jobId = uuidv4();

    // Get images info
    const images = imageIds.map(id => {
      const img = databaseService.getById<any>('images', id);
      return img ? { imageId: id, filename: img.original_filename } : null;
    }).filter(Boolean);

    // Create job
    databaseService.createAIJob({
      id: jobId,
      type: jobType,
      input_data: {
        images,
        createItems: options.createItems ?? true,
        propertyId: options.propertyId ?? 'default',
      },
      provider: options.provider || this.config?.provider || 'openai',
      model: options.model || this.config?.model || 'gpt-4o',
    });

    // Create job items
    for (const img of images) {
      if (img) {
        databaseService.insert('ai_job_items', {
          id: uuidv4(),
          job_id: jobId,
          image_id: img.imageId,
          status: 'pending',
          input_data: img,
        });
      }
    }

    console.log(`📋 Created AI batch job ${jobId} with ${images.length} images`);

    // Add to queue
    this.processingQueue.push(jobId);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const jobId = this.processingQueue.shift();
      if (jobId) {
        await this.processJob(jobId);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single job
   */
  async processJob(jobId: string): Promise<BatchProcessResult> {
    const startTime = Date.now();
    const job = databaseService.getById<any>('ai_jobs', jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    console.log(`🚀 Processing AI job ${jobId} (${job.type})`);

    // Update job status
    databaseService.updateAIJobProgress(jobId, 0, 'processing');

    const inputData = typeof job.input_data === 'string' 
      ? JSON.parse(job.input_data) 
      : job.input_data;

    const results: BatchProcessResult['results'] = [];
    let processed = 0;
    let failed = 0;
    let totalTokens = 0;

    // Get job items
    const jobItems = databaseService.prepare(
      'SELECT * FROM ai_job_items WHERE job_id = ? AND status = ?'
    ).all(jobId, 'pending') as any[];

    // Process each image
    for (const jobItem of jobItems) {
      try {
        // Update item status
        databaseService.update('ai_job_items', jobItem.id, { status: 'processing' });

        // Get image base64
        const imageBase64 = await imageStorageService.getImageBase64(jobItem.image_id);
        if (!imageBase64) {
          throw new Error('Could not load image');
        }

        // Call AI API
        const analysis = await this.analyzeImage(
          imageBase64,
          job.type,
          job.provider,
          job.model
        );

        // Update image with analysis
        imageStorageService.updateImageAIAnalysis(jobItem.image_id, analysis);

        // Create inventory item if requested
        let itemId: string | undefined;
        if (inputData.createItems && analysis) {
          itemId = await this.createItemFromAnalysis(
            analysis,
            jobItem.image_id,
            inputData.propertyId || 'default'
          );
        }

        // Update job item
        databaseService.update('ai_job_items', jobItem.id, {
          status: 'completed',
          output_data: analysis,
          item_id: itemId,
          processed_at: new Date().toISOString(),
        });

        results.push({
          imageId: jobItem.image_id,
          itemId,
          analysis,
        });

        processed++;
        totalTokens += analysis?.tokensUsed || 0;

      } catch (error: any) {
        console.error(`Failed to process image ${jobItem.image_id}:`, error);

        databaseService.update('ai_job_items', jobItem.id, {
          status: 'failed',
          error_message: error.message,
          processed_at: new Date().toISOString(),
        });

        results.push({
          imageId: jobItem.image_id,
          analysis: null,
          error: error.message,
        });

        failed++;
      }

      // Update job progress
      databaseService.updateAIJobProgress(jobId, processed + failed);
    }

    // Finalize job
    const duration = Date.now() - startTime;
    const status = failed === 0 ? 'completed' : (processed > 0 ? 'completed' : 'failed');

    databaseService.update('ai_jobs', jobId, {
      status,
      output_data: { results: results.length, processed, failed },
      tokens_used: totalTokens,
      cost_estimate: this.estimateCost(totalTokens, job.provider, job.model),
    });

    databaseService.updateAIJobProgress(jobId, processed + failed, status);

    console.log(`✅ AI job ${jobId} ${status}: ${processed} processed, ${failed} failed in ${duration}ms`);

    return {
      jobId,
      status: status as BatchProcessResult['status'],
      processed,
      failed,
      results,
      duration,
      tokensUsed: totalTokens,
      estimatedCost: this.estimateCost(totalTokens, job.provider, job.model),
    };
  }

  /**
   * Analyze a single image with AI
   */
  async analyzeImage(
    imageBase64: string,
    analysisType: string,
    provider: string = 'openai',
    model: string = 'gpt-4o'
  ): Promise<ImageAnalysisResult & { tokensUsed?: number }> {
    const prompt = ANALYSIS_PROMPTS[analysisType as keyof typeof ANALYSIS_PROMPTS] 
      || ANALYSIS_PROMPTS.inventory_detection;

    // Call appropriate provider
    switch (provider) {
      case 'openai':
        return await this.callOpenAI(imageBase64, prompt, model);
      case 'anthropic':
        return await this.callAnthropic(imageBase64, prompt, model);
      case 'google':
        return await this.callGoogle(imageBase64, prompt, model);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    imageBase64: string,
    prompt: string,
    model: string = 'gpt-4o'
  ): Promise<ImageAnalysisResult & { tokensUsed?: number }> {
    const apiKey = this.config?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens;

    try {
      const parsed = JSON.parse(content);
      return {
        objectType: parsed.objectType || 'Unknown',
        category: parsed.category || 'Uncategorized',
        brand: parsed.brand,
        model: parsed.model,
        condition: parsed.condition || 'unknown',
        estimatedValue: parsed.estimatedValue,
        description: parsed.description || '',
        tags: parsed.tags || [],
        color: parsed.color,
        material: parsed.material,
        dimensions: parsed.dimensions,
        age: parsed.age,
        serialNumber: parsed.serialNumber,
        confidence: parsed.confidence || 0.5,
        tokensUsed,
        rawResponse: data,
      };
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(
    imageBase64: string,
    prompt: string,
    model: string = 'claude-3-5-sonnet-20241022'
  ): Promise<ImageAnalysisResult & { tokensUsed?: number }> {
    const apiKey = this.config?.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt + '\n\nRespond with valid JSON only.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    const content = data.content?.[0]?.text;
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        objectType: parsed.objectType || 'Unknown',
        category: parsed.category || 'Uncategorized',
        brand: parsed.brand,
        model: parsed.model,
        condition: parsed.condition || 'unknown',
        estimatedValue: parsed.estimatedValue,
        description: parsed.description || '',
        tags: parsed.tags || [],
        color: parsed.color,
        material: parsed.material,
        dimensions: parsed.dimensions,
        age: parsed.age,
        serialNumber: parsed.serialNumber,
        confidence: parsed.confidence || 0.5,
        tokensUsed,
        rawResponse: data,
      };
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Call Google AI API
   */
  private async callGoogle(
    imageBase64: string,
    prompt: string,
    model: string = 'gemini-1.5-flash'
  ): Promise<ImageAnalysisResult & { tokensUsed?: number }> {
    const apiKey = this.config?.apiKey || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('Google AI API key not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt + '\n\nRespond with valid JSON only.' },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const tokensUsed = data.usageMetadata?.totalTokenCount;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        objectType: parsed.objectType || 'Unknown',
        category: parsed.category || 'Uncategorized',
        brand: parsed.brand,
        model: parsed.model,
        condition: parsed.condition || 'unknown',
        estimatedValue: parsed.estimatedValue,
        description: parsed.description || '',
        tags: parsed.tags || [],
        color: parsed.color,
        material: parsed.material,
        dimensions: parsed.dimensions,
        age: parsed.age,
        serialNumber: parsed.serialNumber,
        confidence: parsed.confidence || 0.5,
        tokensUsed,
        rawResponse: data,
      };
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Create inventory item from AI analysis
   */
  private async createItemFromAnalysis(
    analysis: ImageAnalysisResult,
    imageId: string,
    propertyId: string
  ): Promise<string> {
    const itemId = uuidv4();

    // Find or create category
    let categoryId: string | null = null;
    if (analysis.category) {
      const existingCategory = databaseService.prepare(
        'SELECT id FROM categories WHERE name = ? AND property_id = ? AND type = ?'
      ).get(analysis.category, propertyId, 'item') as { id: string } | undefined;

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        categoryId = uuidv4();
        databaseService.insert('categories', {
          id: categoryId,
          property_id: propertyId,
          name: analysis.category,
          type: 'item',
        });
      }
    }

    // Create item
    databaseService.insert('items', {
      id: itemId,
      property_id: propertyId,
      name: analysis.objectType,
      description: analysis.description,
      category_id: categoryId,
      brand: analysis.brand,
      model: analysis.model,
      condition: analysis.condition,
      tags: analysis.tags,
      ai_metadata: {
        confidence: analysis.confidence,
        color: analysis.color,
        material: analysis.material,
        dimensions: analysis.dimensions,
        age: analysis.age,
        estimatedValue: analysis.estimatedValue,
        analyzedAt: new Date().toISOString(),
      },
    });

    // Link image to item
    databaseService.update('images', imageId, {
      entity_type: 'item',
      entity_id: itemId,
      is_primary: 1,
    });

    console.log(`📦 Created item "${analysis.objectType}" from image ${imageId}`);

    return itemId;
  }

  /**
   * Estimate cost based on tokens
   */
  private estimateCost(tokens: number, provider: string, model: string): number {
    // Approximate costs per 1K tokens (input + output combined estimate)
    const costs: Record<string, Record<string, number>> = {
      openai: {
        'gpt-4o': 0.015,
        'gpt-4o-mini': 0.0003,
        'gpt-4-turbo': 0.03,
      },
      anthropic: {
        'claude-3-5-sonnet-20241022': 0.015,
        'claude-3-opus-20240229': 0.075,
        'claude-3-haiku-20240307': 0.001,
      },
      google: {
        'gemini-1.5-pro': 0.007,
        'gemini-1.5-flash': 0.0004,
      },
    };

    const providerCosts = costs[provider] || {};
    const costPer1k = providerCosts[model] || 0.01;
    
    return (tokens / 1000) * costPer1k;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): any {
    const job = databaseService.getById<any>('ai_jobs', jobId);
    if (!job) return null;

    const items = databaseService.prepare(
      'SELECT * FROM ai_job_items WHERE job_id = ?'
    ).all(jobId);

    return {
      ...job,
      input_data: typeof job.input_data === 'string' ? JSON.parse(job.input_data) : job.input_data,
      output_data: typeof job.output_data === 'string' ? JSON.parse(job.output_data) : job.output_data,
      items,
    };
  }

  /**
   * Get all jobs
   */
  getJobs(status?: string, limit: number = 50): any[] {
    let query = 'SELECT * FROM ai_jobs';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return databaseService.prepare(query).all(...params);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = databaseService.getById<any>('ai_jobs', jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    databaseService.update('ai_jobs', jobId, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    });

    // Remove from queue
    this.processingQueue = this.processingQueue.filter(id => id !== jobId);

    return true;
  }

  /**
   * Retry failed job items
   */
  async retryFailedItems(jobId: string): Promise<number> {
    const failedItems = databaseService.prepare(
      'SELECT id FROM ai_job_items WHERE job_id = ? AND status = ?'
    ).all(jobId, 'failed') as { id: string }[];

    for (const item of failedItems) {
      databaseService.update('ai_job_items', item.id, {
        status: 'pending',
        error_message: null,
      });
    }

    // Add job back to queue
    if (failedItems.length > 0 && !this.processingQueue.includes(jobId)) {
      databaseService.update('ai_jobs', jobId, { status: 'pending' });
      this.processingQueue.push(jobId);
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    }

    return failedItems.length;
  }

  /**
   * Get processing stats
   */
  getStats(): {
    pendingJobs: number;
    processingJobs: number;
    completedToday: number;
    failedToday: number;
    totalTokensToday: number;
    estimatedCostToday: number;
  } {
    const today = new Date().toISOString().split('T')[0];

    const stats = databaseService.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' AND date(completed_at) = ? THEN 1 ELSE 0 END) as completed_today,
        SUM(CASE WHEN status = 'failed' AND date(completed_at) = ? THEN 1 ELSE 0 END) as failed_today,
        SUM(CASE WHEN date(completed_at) = ? THEN COALESCE(tokens_used, 0) ELSE 0 END) as tokens_today,
        SUM(CASE WHEN date(completed_at) = ? THEN COALESCE(cost_estimate, 0) ELSE 0 END) as cost_today
      FROM ai_jobs
    `).get(today, today, today, today) as any;

    return {
      pendingJobs: stats.pending || 0,
      processingJobs: stats.processing || 0,
      completedToday: stats.completed_today || 0,
      failedToday: stats.failed_today || 0,
      totalTokensToday: stats.tokens_today || 0,
      estimatedCostToday: stats.cost_today || 0,
    };
  }
}

export const aiBatchProcessorService = new AIBatchProcessorService();
