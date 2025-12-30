/**
 * Property Value Service
 * 
 * Fetches current home value estimates from external APIs
 * Supports multiple providers with fallback options
 */

export interface PropertyValueEstimate {
  value: number;
  lowEstimate?: number;
  highEstimate?: number;
  confidence: number; // 0-1
  source: 'rentcast' | 'manual' | 'zillow' | 'redfin';
  lastUpdated: string;
  address: string;
  propertyType?: string;
  squareFootage?: number;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  lotSize?: number;
  error?: string;
}

export interface PropertyValueConfig {
  provider: 'rentcast' | 'manual' | 'none';
  apiKey?: string;
  autoUpdate: boolean;
  updateFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
}

/**
 * RentCast API integration via backend proxy
 * Free tier: 100 requests/month
 * Documentation: https://docs.rentcast.io/
 */
async function fetchRentCastValue(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  apiKey: string
): Promise<PropertyValueEstimate> {
  try {
    // Dynamically determine API URL based on current browser location
    const API_URL = (() => {
      const envUrl = (import.meta as any).env?.VITE_API_URL;
      if (envUrl) return envUrl;
      if (typeof window !== 'undefined') {
        const { hostname } = window.location;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          return `http://${hostname}:3001`;
        }
      }
      return 'http://localhost:3001';
    })();
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
    
    // Use backend proxy to avoid CORS issues
    const response = await fetch(
      `${API_URL}/api/property/value?${new URLSearchParams({
        address,
        city,
        state,
        zipCode,
        apiKey,
      })}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch property value');
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch property value');
    }
    
    const data = result.data;
    
    return {
      value: data.value || 0,
      lowEstimate: data.lowEstimate,
      highEstimate: data.highEstimate,
      confidence: data.confidence || 0.8,
      source: 'rentcast',
      lastUpdated: new Date().toISOString(),
      address: fullAddress,
      propertyType: data.propertyType,
      squareFootage: data.squareFootage,
      yearBuilt: data.yearBuilt,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      lotSize: data.lotSize,
    };
  } catch (error: any) {
    return {
      value: 0,
      confidence: 0,
      source: 'rentcast',
      lastUpdated: new Date().toISOString(),
      address: `${address}, ${city}, ${state} ${zipCode}`,
      error: error.message || 'Failed to fetch property value',
    };
  }
}

/**
 * Zillow Zestimate (via unofficial API - use with caution)
 * Note: Zillow's official API is deprecated, but we can scrape public data
 * This is a placeholder for future implementation
 */
// @ts-ignore - Placeholder for future Zillow API integration
async function _fetchZillowValue(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<PropertyValueEstimate> {
  // Zillow's official API is deprecated
  // This would require web scraping which is against ToS
  // Keeping as placeholder for future official API if available
  return {
    value: 0,
    confidence: 0,
    source: 'zillow',
    lastUpdated: new Date().toISOString(),
    address: `${address}, ${city}, ${state} ${zipCode}`,
    error: 'Zillow API not available',
  };
}

/**
 * Main function to fetch property value
 */
export async function fetchPropertyValue(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  config: PropertyValueConfig
): Promise<PropertyValueEstimate> {
  if (!address || !city || !state || !zipCode) {
    return {
      value: 0,
      confidence: 0,
      source: 'manual',
      lastUpdated: new Date().toISOString(),
      address: '',
      error: 'Incomplete address information',
    };
  }
  
  if (config.provider === 'none' || config.provider === 'manual') {
    return {
      value: 0,
      confidence: 0,
      source: 'manual',
      lastUpdated: new Date().toISOString(),
      address: `${address}, ${city}, ${state} ${zipCode}`,
      error: 'Property value tracking disabled',
    };
  }
  
  if (config.provider === 'rentcast') {
    if (!config.apiKey) {
      return {
        value: 0,
        confidence: 0,
        source: 'rentcast',
        lastUpdated: new Date().toISOString(),
        address: `${address}, ${city}, ${state} ${zipCode}`,
        error: 'RentCast API key not configured',
      };
    }
    
    return await fetchRentCastValue(address, city, state, zipCode, config.apiKey);
  }
  
  return {
    value: 0,
    confidence: 0,
    source: 'manual',
    lastUpdated: new Date().toISOString(),
    address: `${address}, ${city}, ${state} ${zipCode}`,
    error: 'Unknown provider',
  };
}

/**
 * Check if we should auto-update based on frequency
 */
export function shouldAutoUpdate(
  lastUpdate: string | null,
  frequency: PropertyValueConfig['updateFrequency']
): boolean {
  if (!lastUpdate) return true;
  
  const lastUpdateDate = new Date(lastUpdate);
  const now = new Date();
  const daysSinceUpdate = Math.floor(
    (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  switch (frequency) {
    case 'daily':
      return daysSinceUpdate >= 1;
    case 'weekly':
      return daysSinceUpdate >= 7;
    case 'monthly':
      return daysSinceUpdate >= 30;
    case 'manual':
      return false;
    default:
      return false;
  }
}

/**
 * Format property value for display
 */
export function formatPropertyValue(value: number): string {
  if (value === 0) return 'N/A';
  
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  
  return `$${(value / 1000).toFixed(0)}K`;
}

/**
 * Calculate value appreciation percentage
 */
export function calculateAppreciationPercent(
  purchasePrice: number,
  currentValue: number
): number {
  if (purchasePrice === 0) return 0;
  return ((currentValue - purchasePrice) / purchasePrice) * 100;
}

/**
 * Calculate annualized appreciation rate
 */
export function calculateAnnualizedAppreciation(
  purchasePrice: number,
  currentValue: number,
  purchaseDate: string
): number {
  if (purchasePrice === 0) return 0;
  
  const purchase = new Date(purchaseDate);
  const now = new Date();
  const years = (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  
  if (years <= 0) return 0;
  
  // Compound annual growth rate formula
  const cagr = (Math.pow(currentValue / purchasePrice, 1 / years) - 1) * 100;
  return cagr;
}

/**
 * Get value trend direction
 */
export function getValueTrend(values: Array<{ date: string; value: number }>): {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  period: string;
} {
  if (values.length < 2) {
    return { direction: 'stable', changePercent: 0, period: 'N/A' };
  }
  
  const sorted = [...values].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  
  const change = newest.value - oldest.value;
  const changePercent = oldest.value > 0 ? (change / oldest.value) * 100 : 0;
  
  const oldestDate = new Date(oldest.date);
  const newestDate = new Date(newest.date);
  const months = (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  let period = '';
  if (months < 1) {
    period = `${Math.round(months * 30)} days`;
  } else if (months < 12) {
    period = `${Math.round(months)} months`;
  } else {
    period = `${(months / 12).toFixed(1)} years`;
  }
  
  return {
    direction: changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'stable',
    changePercent: Math.abs(changePercent),
    period,
  };
}

