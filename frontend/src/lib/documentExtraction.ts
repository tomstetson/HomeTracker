/**
 * Document Extraction Service
 * Handles AI-powered data extraction from OCR text
 */

import { extractDocumentData, extractJSON, AIResponse } from './aiService';
import { useInventoryStore, InventoryItem } from '../store/inventoryStore';
import { useVendorStore, Vendor } from '../store/vendorStore';

// Extracted data types
export interface ExtractedVendor {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
}

export interface ExtractedItem {
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  price?: number;
  category?: string;
}

export interface ExtractedReceipt {
  date: string;
  total: number;
  subtotal?: number;
  tax?: number;
  paymentMethod?: string;
  transactionId?: string;
}

export interface ExtractedWarranty {
  provider: string;
  startDate?: string;
  endDate?: string;
  coverage?: string;
  policyNumber?: string;
}

export interface ExtractedMaintenance {
  type: string;
  date?: string;
  cost?: number;
  notes?: string;
  technician?: string;
}

export interface ExtractedData {
  vendor?: ExtractedVendor;
  items?: ExtractedItem[];
  receipt?: ExtractedReceipt;
  warranty?: ExtractedWarranty;
  maintenance?: ExtractedMaintenance;
  raw?: string;
  confidence?: 'high' | 'medium' | 'low';
  warnings?: string[];
}

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedData;
  error?: string;
}

export interface MatchSuggestion {
  type: 'inventory' | 'vendor';
  extractedValue: string;
  matchedRecord: InventoryItem | Vendor;
  matchField: string;
  confidence: number;
}

export interface DocumentLinkSuggestion {
  sourceDocId: string;
  targetDocId: string;
  linkType: 'receipt_to_warranty' | 'invoice_to_project' | 'warranty_to_receipt' | 'related';
  confidence: number;
  reason: string;
}

/**
 * Extract structured data from OCR text using AI
 */
export async function extractAndParse(ocrText: string): Promise<ExtractionResult> {
  if (!ocrText || ocrText.trim().length === 0) {
    return {
      success: false,
      error: 'No OCR text provided',
    };
  }

  try {
    const response: AIResponse = await extractDocumentData(ocrText);

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'AI extraction failed',
      };
    }

    if (!response.content) {
      return {
        success: false,
        error: 'Empty response from AI',
      };
    }

    // Try to parse JSON from response
    const parsed = extractJSON<Partial<ExtractedData>>(response.content);

    if (!parsed) {
      // If no JSON found, return raw response with warning
      return {
        success: true,
        data: {
          raw: response.content,
          confidence: 'low',
          warnings: ['Could not parse structured data from response'],
        },
      };
    }

    // Validate and clean the parsed data
    const cleanedData = cleanExtractedData(parsed);
    
    // Assess confidence based on what was extracted
    cleanedData.confidence = assessConfidence(cleanedData);
    cleanedData.raw = response.content;

    return {
      success: true,
      data: cleanedData,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Extraction failed',
    };
  }
}

/**
 * Clean and validate extracted data
 */
function cleanExtractedData(data: Partial<ExtractedData>): ExtractedData {
  const cleaned: ExtractedData = {};
  const warnings: string[] = [];

  // Clean vendor data
  if (data.vendor && typeof data.vendor === 'object') {
    const v = data.vendor as any;
    if (v.name) {
      cleaned.vendor = {
        name: String(v.name).trim(),
        phone: v.phone ? String(v.phone).trim() : undefined,
        email: v.email ? String(v.email).trim().toLowerCase() : undefined,
        address: v.address ? String(v.address).trim() : undefined,
        website: v.website ? String(v.website).trim() : undefined,
      };
    }
  }

  // Clean items array
  if (data.items && Array.isArray(data.items)) {
    cleaned.items = data.items
      .filter((item: any) => item && item.name)
      .map((item: any) => ({
        name: String(item.name).trim(),
        brand: item.brand ? String(item.brand).trim() : undefined,
        model: item.model || item.modelNumber ? String(item.model || item.modelNumber).trim() : undefined,
        serialNumber: item.serialNumber ? String(item.serialNumber).trim() : undefined,
        price: parsePrice(item.price),
        category: item.category ? String(item.category).trim() : undefined,
      }));

    if (cleaned.items.length === 0) {
      delete cleaned.items;
    }
  }

  // Clean receipt data
  if (data.receipt && typeof data.receipt === 'object') {
    const r = data.receipt as any;
    if (r.total || r.date) {
      cleaned.receipt = {
        date: r.date ? normalizeDate(String(r.date)) : new Date().toISOString().split('T')[0],
        total: parsePrice(r.total) || 0,
        subtotal: parsePrice(r.subtotal),
        tax: parsePrice(r.tax),
        paymentMethod: r.paymentMethod ? String(r.paymentMethod).trim() : undefined,
        transactionId: r.transactionId ? String(r.transactionId).trim() : undefined,
      };
    }
  }

  // Clean warranty data
  if (data.warranty && typeof data.warranty === 'object') {
    const w = data.warranty as any;
    if (w.provider || w.endDate) {
      cleaned.warranty = {
        provider: w.provider ? String(w.provider).trim() : 'Unknown',
        startDate: w.startDate ? normalizeDate(String(w.startDate)) : undefined,
        endDate: w.endDate ? normalizeDate(String(w.endDate)) : undefined,
        coverage: w.coverage ? String(w.coverage).trim() : undefined,
        policyNumber: w.policyNumber ? String(w.policyNumber).trim() : undefined,
      };
    }
  }

  // Clean maintenance data
  if (data.maintenance && typeof data.maintenance === 'object') {
    const m = data.maintenance as any;
    if (m.type) {
      cleaned.maintenance = {
        type: String(m.type).trim(),
        date: m.date ? normalizeDate(String(m.date)) : undefined,
        cost: parsePrice(m.cost),
        notes: m.notes ? String(m.notes).trim() : undefined,
        technician: m.technician ? String(m.technician).trim() : undefined,
      };
    }
  }

  if (warnings.length > 0) {
    cleaned.warnings = warnings;
  }

  return cleaned;
}

/**
 * Parse price from various formats
 */
function parsePrice(value: any): number | undefined {
  if (value === undefined || value === null) return undefined;
  
  if (typeof value === 'number') {
    return Math.round(value * 100) / 100;
  }
  
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[$€£,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      return Math.round(parsed * 100) / 100;
    }
  }
  
  return undefined;
}

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(dateStr: string): string {
  try {
    // Try to parse various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Fall through
  }
  
  // Return as-is if can't parse
  return dateStr;
}

/**
 * Assess confidence level based on extracted data quality
 */
function assessConfidence(data: ExtractedData): 'high' | 'medium' | 'low' {
  let score = 0;
  let total = 0;

  // Check vendor completeness
  if (data.vendor) {
    total += 4;
    if (data.vendor.name) score += 1;
    if (data.vendor.phone) score += 1;
    if (data.vendor.email) score += 1;
    if (data.vendor.address) score += 1;
  }

  // Check items completeness
  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      total += 3;
      if (item.name) score += 1;
      if (item.brand || item.model) score += 1;
      if (item.price) score += 1;
    }
  }

  // Check receipt completeness
  if (data.receipt) {
    total += 3;
    if (data.receipt.date) score += 1;
    if (data.receipt.total) score += 1;
    if (data.receipt.paymentMethod) score += 1;
  }

  // Check warranty completeness
  if (data.warranty) {
    total += 3;
    if (data.warranty.provider) score += 1;
    if (data.warranty.startDate) score += 1;
    if (data.warranty.endDate) score += 1;
  }

  if (total === 0) return 'low';
  
  const ratio = score / total;
  if (ratio >= 0.7) return 'high';
  if (ratio >= 0.4) return 'medium';
  return 'low';
}

/**
 * Find matching records in existing data
 */
export function findMatchingSuggestions(data: ExtractedData): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  const inventoryItems = useInventoryStore.getState().items;
  const vendors = useVendorStore.getState().vendors;

  // Match vendor by name or phone
  if (data.vendor) {
    const vendorNameLower = data.vendor.name.toLowerCase();
    
    for (const vendor of vendors) {
      let confidence = 0;
      let matchField = '';

      // Check name match
      if (vendor.businessName.toLowerCase().includes(vendorNameLower) ||
          vendorNameLower.includes(vendor.businessName.toLowerCase())) {
        confidence = 0.8;
        matchField = 'name';
      }
      
      // Check phone match
      if (data.vendor.phone && vendor.phone) {
        const cleanPhone1 = data.vendor.phone.replace(/\D/g, '');
        const cleanPhone2 = vendor.phone.replace(/\D/g, '');
        if (cleanPhone1 === cleanPhone2 || cleanPhone1.includes(cleanPhone2) || cleanPhone2.includes(cleanPhone1)) {
          confidence = Math.max(confidence, 0.9);
          matchField = matchField ? `${matchField}, phone` : 'phone';
        }
      }

      if (confidence > 0.5) {
        suggestions.push({
          type: 'vendor',
          extractedValue: data.vendor.name,
          matchedRecord: vendor,
          matchField,
          confidence,
        });
      }
    }
  }

  // Match items by brand/model
  if (data.items) {
    for (const item of data.items) {
      for (const invItem of inventoryItems) {
        let confidence = 0;
        let matchField = '';

        // Check brand match
        if (item.brand && invItem.brand) {
          if (item.brand.toLowerCase() === invItem.brand.toLowerCase()) {
            confidence = 0.5;
            matchField = 'brand';
          }
        }

        // Check model match
        if (item.model && invItem.modelNumber) {
          const model1 = item.model.toLowerCase().replace(/\s/g, '');
          const model2 = invItem.modelNumber.toLowerCase().replace(/\s/g, '');
          if (model1 === model2 || model1.includes(model2) || model2.includes(model1)) {
            confidence = Math.max(confidence, 0.85);
            matchField = matchField ? `${matchField}, model` : 'model';
          }
        }

        // Check serial number match
        if (item.serialNumber && invItem.serialNumber) {
          if (item.serialNumber.toLowerCase() === invItem.serialNumber.toLowerCase()) {
            confidence = 0.95;
            matchField = matchField ? `${matchField}, serial` : 'serial';
          }
        }

        if (confidence > 0.5) {
          suggestions.push({
            type: 'inventory',
            extractedValue: `${item.brand || ''} ${item.model || item.name}`.trim(),
            matchedRecord: invItem,
            matchField,
            confidence,
          });
        }
      }
    }
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Check if extraction data has any meaningful content
 */
export function hasExtractedContent(data: ExtractedData | undefined): boolean {
  if (!data) return false;
  return !!(data.vendor || data.items?.length || data.receipt || data.warranty || data.maintenance);
}

export interface DocumentLinkSuggestion {
  sourceDocId: string;
  targetDocId: string;
  linkType: 'receipt_to_warranty' | 'invoice_to_project' | 'warranty_to_receipt' | 'related';
  confidence: number;
  reason: string;
}

/**
 * Suggest document links based on extracted data
 * e.g., Receipt → Warranty, Invoice → Project
 */
export function suggestDocumentLinks(
  sourceDoc: { id: string; aiExtracted?: ExtractedData; category: string },
  allDocuments: Array<{ id: string; aiExtracted?: ExtractedData; category: string; name: string }>
): DocumentLinkSuggestion[] {
  const suggestions: DocumentLinkSuggestion[] = [];
  
  if (!sourceDoc.aiExtracted) return suggestions;
  
  const source = sourceDoc.aiExtracted;
  
  for (const targetDoc of allDocuments) {
    if (targetDoc.id === sourceDoc.id || !targetDoc.aiExtracted) continue;
    
    const target = targetDoc.aiExtracted;
    let confidence = 0;
    let reason = '';
    let linkType: DocumentLinkSuggestion['linkType'] = 'related';
    
    // Receipt → Warranty matching
    if (sourceDoc.category === 'receipt' && targetDoc.category === 'warranty') {
      // Match by vendor
      if (source.vendor?.name && target.warranty?.provider) {
        const vendorMatch = source.vendor.name.toLowerCase().includes(target.warranty.provider.toLowerCase()) ||
                            target.warranty.provider.toLowerCase().includes(source.vendor.name.toLowerCase());
        if (vendorMatch) {
          confidence += 0.4;
          reason += 'Same vendor/provider; ';
        }
      }
      
      // Match by item (receipt item matches warranty item)
      if (source.items && source.items.length > 0 && target.warranty) {
        const itemMatch = source.items.some(item => 
          item.name && target.warranty?.provider && 
          (item.name.toLowerCase().includes(target.warranty.provider.toLowerCase()) ||
           target.warranty.provider.toLowerCase().includes(item.name.toLowerCase()))
        );
        if (itemMatch) {
          confidence += 0.3;
          reason += 'Item matches warranty provider; ';
        }
      }
      
      // Date proximity (warranty starts around receipt date)
      if (source.receipt?.date && target.warranty?.startDate) {
        const receiptDate = new Date(source.receipt.date);
        const warrantyStart = new Date(target.warranty.startDate);
        const daysDiff = Math.abs((receiptDate.getTime() - warrantyStart.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) {
          confidence += 0.3;
          reason += `Dates within ${Math.round(daysDiff)} days; `;
        }
      }
      
      if (confidence > 0.5) {
        linkType = 'receipt_to_warranty';
        suggestions.push({
          sourceDocId: sourceDoc.id,
          targetDocId: targetDoc.id,
          linkType,
          confidence: Math.min(confidence, 1),
          reason: reason.trim() || 'Potential receipt-warranty match',
        });
      }
    }
    
    // Invoice → Project matching (by vendor or amount)
    if (sourceDoc.category === 'invoice' && targetDoc.category === 'other') {
      // Could match to projects if we had project data
      // For now, just check vendor similarity
      if (source.vendor?.name) {
        const vendorMatch = targetDoc.name.toLowerCase().includes(source.vendor.name.toLowerCase());
        if (vendorMatch) {
          confidence = 0.6;
          reason = 'Vendor name matches document name';
          linkType = 'invoice_to_project';
          suggestions.push({
            sourceDocId: sourceDoc.id,
            targetDocId: targetDoc.id,
            linkType,
            confidence,
            reason,
          });
        }
      }
    }
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

