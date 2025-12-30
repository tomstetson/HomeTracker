import { Router, Request, Response } from 'express';
import { aiSuggestionsService } from '../services/ai-suggestions.service';

const router = Router();

/**
 * GET /api/suggestions/category
 * Suggest categories based on item name
 */
router.get('/category', (req: Request, res: Response) => {
  try {
    const { name } = req.query;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Item name is required' 
      });
    }

    const suggestions = aiSuggestionsService.suggestCategory(name);

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Error getting category suggestions:', error);
    res.status(500).json({ success: false, error: 'Failed to get suggestions' });
  }
});

/**
 * GET /api/suggestions/maintenance
 * Suggest maintenance tasks for an item
 */
router.get('/maintenance', (req: Request, res: Response) => {
  try {
    const { name, category, purchaseDate } = req.query;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Item name is required' 
      });
    }

    const suggestions = aiSuggestionsService.suggestMaintenanceTasks({
      name,
      category: category as string | undefined,
      purchaseDate: purchaseDate as string | undefined,
    });

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Error getting maintenance suggestions:', error);
    res.status(500).json({ success: false, error: 'Failed to get suggestions' });
  }
});

/**
 * GET /api/suggestions/predictive
 * Get predictive maintenance recommendations
 */
router.get('/predictive', (_req: Request, res: Response) => {
  try {
    const recommendations = aiSuggestionsService.getPredictiveMaintenanceRecommendations();

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error('Error getting predictive maintenance:', error);
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
});

/**
 * GET /api/suggestions/similar
 * Find similar items
 */
router.get('/similar', (req: Request, res: Response) => {
  try {
    const { name, limit } = req.query;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Item name is required' 
      });
    }

    const similarItems = aiSuggestionsService.findSimilarItems(
      name, 
      limit ? parseInt(limit as string, 10) : 5
    );

    res.json({
      success: true,
      data: similarItems,
    });
  } catch (error) {
    console.error('Error finding similar items:', error);
    res.status(500).json({ success: false, error: 'Failed to find similar items' });
  }
});

export default router;
