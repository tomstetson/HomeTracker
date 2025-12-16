import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

/**
 * Proxy endpoint for RentCast API to avoid CORS issues
 * GET /api/property/value?address=...&city=...&state=...&zipCode=...&apiKey=...
 */
router.get('/value', async (req: Request, res: Response) => {
  try {
    const { address, city, state, zipCode, apiKey } = req.query;
    
    if (!address || !city || !state || !zipCode || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: address, city, state, zipCode, apiKey',
      });
    }
    
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
    
    // First, get property details
    const propertyResponse = await axios.get(
      `https://api.rentcast.io/v1/properties`,
      {
        params: { address: fullAddress },
        headers: {
          'X-Api-Key': apiKey as string,
        },
      }
    );
    
    if (!propertyResponse.data || propertyResponse.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }
    
    const property = propertyResponse.data[0];
    
    // Get AVM (Automated Valuation Model) estimate
    try {
      const avmResponse = await axios.get(
        `https://api.rentcast.io/v1/avm/value`,
        {
          params: { propertyId: property.id },
          headers: {
            'X-Api-Key': apiKey as string,
          },
        }
      );
      
      res.json({
        success: true,
        data: {
          value: avmResponse.data.avm || avmResponse.data.value || property.price || 0,
          lowEstimate: avmResponse.data.lowEstimate,
          highEstimate: avmResponse.data.highEstimate,
          confidence: avmResponse.data.confidence || 0.8,
          propertyType: property.propertyType || property.propertyTypeName,
          squareFootage: property.squareFootage,
          yearBuilt: property.yearBuilt,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          lotSize: property.lotSize,
        },
      });
    } catch (avmError: any) {
      // Fallback to property data if AVM fails
      const estimatedValue = property.price || property.lastSalePrice || 0;
      res.json({
        success: true,
        data: {
          value: estimatedValue,
          confidence: 0.6,
          propertyType: property.propertyType,
          squareFootage: property.squareFootage,
          yearBuilt: property.yearBuilt,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          lotSize: property.lotSize,
        },
      });
    }
  } catch (error: any) {
    console.error('Property value fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch property value',
    });
  }
});

export default router;


