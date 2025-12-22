/**
 * Image Analysis Service
 * 
 * Provides AI-powered image analysis for inventory detection:
 * - Object detection (appliances, electronics, furniture)
 * - Brand/logo recognition
 * - Text extraction (model numbers, serial numbers)
 * - Duplicate/similarity detection
 */

import { useAISettingsStore } from '../store/aiSettingsStore';
import { DetectedObject, ReceiptMatch } from '../store/inventoryStagingStore';
import { useDocumentStore } from '../store/documentStore';
import { DEFAULT_CATEGORIES } from '../store/inventoryStore';

// OpenAI Vision API for image analysis
const VISION_PROMPTS = {
  objectDetection: `Analyze this image and identify any home inventory items visible.

For each distinct item, provide:
1. name: What is this item? Be specific (e.g., "LG French Door Refrigerator" not just "Refrigerator")
2. category: Best match from these categories: ${DEFAULT_CATEGORIES.join(', ')}
3. brand: If visible from logos, labels, or design (e.g., "LG", "Samsung", "Whirlpool")
4. modelNumber: If visible on labels or screens
5. confidence: How confident are you (0.0-1.0)
6. suggestedLocation: Based on the room context visible in the image, suggest where this item is located (e.g., "Kitchen", "Living Room", "Garage", "Bedroom", "Bathroom", "Basement", "Attic", "Office", "Outdoor")

Also extract any visible text that might help identify the item (labels, stickers, screens).

Return JSON array:
{
  "objects": [
    {
      "name": "LG French Door Refrigerator",
      "category": "Kitchen Appliances",
      "brand": "LG",
      "modelNumber": "LRMVS3006S",
      "confidence": 0.95,
      "suggestedLocation": "Kitchen"
    }
  ],
  "extractedText": ["LG", "Model: LRMVS3006S", "Energy Star"],
  "imageDescription": "Photo of a stainless steel refrigerator in a kitchen",
  "detectedRoom": "Kitchen"
}`,

  duplicateCheck: `Compare these two images. Are they:
1. The same object from the same angle (exact duplicate)
2. The same object from different angles (same item, different photos)
3. Similar but different objects (e.g., two different refrigerators)
4. Completely different objects

Return JSON:
{
  "relationship": "exact_duplicate" | "same_object" | "similar_objects" | "different_objects",
  "confidence": 0.0-1.0,
  "explanation": "Brief explanation"
}`,

  receiptMatching: `Given this inventory item and these receipt/document excerpts, find the best match.

Item: {itemName} by {brand}

Documents:
{documents}

Return JSON:
{
  "bestMatch": {
    "documentId": "id or null if no match",
    "confidence": 0.0-1.0,
    "reason": "Why this matches (brand, model, description)"
  },
  "possibleMatches": [
    { "documentId": "...", "confidence": 0.5, "reason": "..." }
  ]
}`,
};

/**
 * Get the configured AI provider settings
 */
function getAIConfig() {
  const settings = useAISettingsStore.getState().settings;
  const provider = settings.activeProvider;
  
  if (provider === 'none') {
    throw new Error('No AI provider configured');
  }
  
  const config = settings.providers[provider];
  if (!config.apiKey) {
    throw new Error(`No API key configured for ${provider}`);
  }
  
  return { ...config, provider };
}

/**
 * Convert image URL to base64 for OpenAI Vision API
 * OpenAI requires publicly accessible URLs OR base64 encoded images
 */
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data:image/...;base64, prefix if present
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error}`);
  }
}

/**
 * Analyze an image to detect inventory items
 */
export async function analyzeImage(imageUrl: string): Promise<{
  success: boolean;
  objects: DetectedObject[];
  extractedText: string[];
  imageDescription: string;
  detectedRoom?: string;
  error?: string;
}> {
  try {
    const config = getAIConfig();
    
    if (config.provider !== 'openai') {
      // For now, only OpenAI supports vision
      // Anthropic Claude also supports vision but with different API
      throw new Error('Vision analysis requires OpenAI provider');
    }
    
    // Convert image to base64 (required for localhost URLs)
    let imageContent: string;
    if (imageUrl.startsWith('http://localhost') || imageUrl.startsWith('http://127.0.0.1')) {
      // Local URLs need to be converted to base64
      const base64Image = await imageUrlToBase64(imageUrl);
      imageContent = `data:image/jpeg;base64,${base64Image}`;
    } else {
      // Public URLs can be used directly
      imageContent = imageUrl;
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective vision model
        messages: [
          {
            role: 'system',
            content: VISION_PROMPTS.objectDetection,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageContent,
                  detail: 'high', // High detail for better object detection
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Vision API call failed');
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse vision response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Add suggestedLocation to objects if not present
    const objects = (result.objects || []).map((obj: any) => ({
      ...obj,
      suggestedLocation: obj.suggestedLocation || result.detectedRoom || undefined,
    }));
    
    return {
      success: true,
      objects,
      extractedText: result.extractedText || [],
      imageDescription: result.imageDescription || '',
      detectedRoom: result.detectedRoom,
    };
  } catch (error: any) {
    console.error('Image analysis failed:', error);
    return {
      success: false,
      objects: [],
      extractedText: [],
      imageDescription: '',
      error: error.message,
    };
  }
}

/**
 * Generate a simple perceptual hash for image similarity
 * This is a simplified version - in production you'd use proper pHash
 */
export function generateImageHash(imageData: string): string {
  // Simple hash based on image data characteristics
  let hash = 0;
  for (let i = 0; i < Math.min(imageData.length, 1000); i++) {
    const char = imageData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Compare two images for similarity using AI
 */
export async function compareImages(imageUrl1: string, imageUrl2: string): Promise<{
  relationship: 'exact_duplicate' | 'same_object' | 'similar_objects' | 'different_objects';
  confidence: number;
  explanation: string;
}> {
  try {
    const config = getAIConfig();
    
    if (config.provider !== 'openai') {
      throw new Error('Image comparison requires OpenAI provider');
    }
    
    // Convert images to base64 if needed
    const convertIfLocal = async (url: string) => {
      if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
        const base64 = await imageUrlToBase64(url);
        return `data:image/jpeg;base64,${base64}`;
      }
      return url;
    };
    
    const img1 = await convertIfLocal(imageUrl1);
    const img2 = await convertIfLocal(imageUrl2);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: VISION_PROMPTS.duplicateCheck,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Compare these two images:' },
              { type: 'image_url', image_url: { url: img1, detail: 'low' } },
              { type: 'image_url', image_url: { url: img2, detail: 'low' } },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.2,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Comparison API call failed');
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      relationship: 'different_objects',
      confidence: 0.5,
      explanation: 'Could not determine relationship',
    };
  } catch (error) {
    console.error('Image comparison failed:', error);
    return {
      relationship: 'different_objects',
      confidence: 0,
      explanation: 'Comparison failed',
    };
  }
}

/**
 * Fuzzy string matching using Levenshtein distance
 * Exported for testing
 */
export function fuzzyMatch(str1: string, str2: string, threshold: number = 0.8): boolean {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;
  
  // Simple Levenshtein-like similarity
  const longer = s1.length > s2.length ? s1 : s2;
  
  if (longer.length === 0) return true;
  
  const distance = levenshteinDistance(s1, s2);
  const similarity = 1 - (distance / longer.length);
  
  return similarity >= threshold;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Check if two dates are within proximity (default 30 days)
 * Exported for testing
 */
export function datesWithinProximity(date1: string | undefined, date2: string | undefined, days: number = 30): boolean {
  if (!date1 || !date2) return false;
  
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d1.getTime() - d2.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays <= days;
}

/**
 * Find matching receipts/documents for a detected inventory item
 * Enhanced with fuzzy matching and date proximity
 */
export async function findReceiptMatches(
  itemName: string,
  brand: string | undefined,
  modelNumber: string | undefined,
  _imageDate?: string // Date when photo was taken (reserved for future use)
): Promise<ReceiptMatch[]> {
  // Get all documents with OCR text or AI extraction
  const documents = useDocumentStore.getState().documents;
  
  const matchableDocuments = documents.filter(
    (doc) => doc.aiExtracted || doc.category === 'receipt' || doc.category === 'invoice'
  );
  
  if (matchableDocuments.length === 0) {
    return [];
  }
  
  const matches: ReceiptMatch[] = [];
  
  for (const doc of matchableDocuments) {
    let matchScore = 0;
    const reasons: string[] = [];
    
    // Enhanced brand matching with fuzzy logic
    if (brand) {
      // Check detected vendor
      if (doc.detectedVendor) {
        if (fuzzyMatch(brand, doc.detectedVendor, 0.7)) {
          matchScore += 0.4;
          reasons.push(`Brand "${brand}" matches vendor "${doc.detectedVendor}"`);
        }
      }
      
      // Check AI extracted vendor
      if (doc.aiExtracted?.vendor?.name) {
        if (fuzzyMatch(brand, doc.aiExtracted.vendor.name, 0.7)) {
          matchScore += 0.3;
          reasons.push(`Brand matches extracted vendor`);
        }
      }
    }
    
    // Check AI extracted data
    if (doc.aiExtracted) {
      // Check items in extraction
      const extractedItems = doc.aiExtracted.items || [];
      for (const item of extractedItems) {
        if (item.brand?.toLowerCase() === brand?.toLowerCase()) {
          matchScore += 0.3;
          reasons.push(`Extracted brand matches`);
        }
        if (item.model && modelNumber && item.model.includes(modelNumber)) {
          matchScore += 0.5;
          reasons.push(`Model number matches`);
        }
        // Check if item name is similar
        const itemNameLower = itemName.toLowerCase();
        const extractedNameLower = (item.name || '').toLowerCase();
        if (itemNameLower.includes(extractedNameLower) || extractedNameLower.includes(itemNameLower)) {
          matchScore += 0.2;
          reasons.push(`Item description matches`);
        }
      }
      
      // Check receipt data
      if (doc.aiExtracted.receipt) {
        matches.push({
          documentId: doc.id,
          documentName: doc.name,
          matchScore: Math.min(matchScore, 1),
          matchReason: reasons.join('; ') || 'Potential match based on document type',
          extractedData: {
            purchaseDate: doc.aiExtracted.receipt.date,
            purchasePrice: doc.aiExtracted.receipt.total,
            vendor: doc.aiExtracted.vendor?.name,
          },
        });
      }
    } else if (matchScore > 0) {
      matches.push({
        documentId: doc.id,
        documentName: doc.name,
        matchScore: Math.min(matchScore, 1),
        matchReason: reasons.join('; '),
      });
    }
  }
  
  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Process a batch of images for inventory detection
 */
export async function processBatchImages(
  imageUrls: { id: string; url: string; name: string }[],
  onProgress?: (processed: number, total: number, currentItem: string) => void
): Promise<{
  analyzed: Array<{
    id: string;
    objects: DetectedObject[];
    extractedText: string[];
  }>;
  duplicates: Array<{ id: string; duplicateOf: string }>;
  errors: Array<{ id: string; error: string }>;
}> {
  const analyzed: Array<{
    id: string;
    objects: DetectedObject[];
    extractedText: string[];
  }> = [];
  const duplicates: Array<{ id: string; duplicateOf: string }> = [];
  const errors: Array<{ id: string; error: string }> = [];
  
  // First pass: Analyze all images
  for (let i = 0; i < imageUrls.length; i++) {
    const { id, url, name } = imageUrls[i];
    onProgress?.(i + 1, imageUrls.length, name);
    
    const result = await analyzeImage(url);
    
    if (result.success) {
      analyzed.push({
        id,
        objects: result.objects,
        extractedText: result.extractedText,
      });
    } else {
      errors.push({ id, error: result.error || 'Analysis failed' });
    }
    
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  
  // Second pass: Check for duplicates (simplified - compare first object name/brand)
  for (let i = 0; i < analyzed.length; i++) {
    for (let j = i + 1; j < analyzed.length; j++) {
      const img1 = analyzed[i];
      const img2 = analyzed[j];
      
      // Check if same primary object detected
      if (img1.objects[0] && img2.objects[0]) {
        const obj1 = img1.objects[0];
        const obj2 = img2.objects[0];
        
        const sameName = obj1.name.toLowerCase() === obj2.name.toLowerCase();
        const sameBrand = obj1.brand && obj2.brand && 
          obj1.brand.toLowerCase() === obj2.brand.toLowerCase();
        
        if (sameName && sameBrand) {
          duplicates.push({ id: img2.id, duplicateOf: img1.id });
        }
      }
    }
  }
  
  return { analyzed, duplicates, errors };
}

