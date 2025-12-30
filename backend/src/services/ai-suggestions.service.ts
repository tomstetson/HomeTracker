/**
 * AI Suggestions Service
 * Provides intelligent suggestions for categorization, maintenance, and item management
 * Uses pattern matching and existing data to make predictions without external AI APIs
 */

import { db } from './database.service';

// Common item categories with keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Kitchen Appliances': ['refrigerator', 'fridge', 'microwave', 'oven', 'stove', 'dishwasher', 'toaster', 'blender', 'mixer', 'coffee', 'espresso', 'kettle', 'air fryer', 'instant pot', 'food processor'],
  'Laundry': ['washer', 'dryer', 'washing machine', 'iron', 'steamer', 'laundry'],
  'HVAC': ['furnace', 'ac', 'air conditioner', 'hvac', 'heater', 'thermostat', 'humidifier', 'dehumidifier', 'fan', 'vent', 'duct'],
  'Plumbing': ['water heater', 'pump', 'sump', 'faucet', 'toilet', 'sink', 'shower', 'bathtub', 'pipe', 'drain', 'garbage disposal'],
  'Electrical': ['outlet', 'switch', 'breaker', 'panel', 'wire', 'lighting', 'light', 'lamp', 'chandelier', 'ceiling fan', 'generator', 'surge protector', 'ups', 'battery backup'],
  'Electronics': ['tv', 'television', 'monitor', 'computer', 'laptop', 'tablet', 'phone', 'speaker', 'soundbar', 'router', 'modem', 'gaming', 'console', 'playstation', 'xbox', 'nintendo', 'camera', 'projector'],
  'Furniture': ['sofa', 'couch', 'chair', 'table', 'desk', 'bed', 'mattress', 'dresser', 'cabinet', 'shelf', 'bookcase', 'ottoman', 'bench', 'nightstand'],
  'Outdoor': ['lawn mower', 'trimmer', 'blower', 'chainsaw', 'grill', 'bbq', 'patio', 'deck', 'fence', 'sprinkler', 'hose', 'garden', 'shed', 'pool', 'hot tub'],
  'Tools': ['drill', 'saw', 'hammer', 'screwdriver', 'wrench', 'pliers', 'level', 'tape measure', 'tool', 'socket', 'ratchet', 'workbench', 'vice', 'clamp'],
  'Safety': ['smoke detector', 'carbon monoxide', 'fire extinguisher', 'alarm', 'security', 'camera', 'doorbell', 'lock', 'safe'],
  'Cleaning': ['vacuum', 'mop', 'broom', 'steam cleaner', 'carpet cleaner', 'pressure washer'],
};

// Maintenance intervals by category (in days)
const MAINTENANCE_INTERVALS: Record<string, { interval: number; tasks: string[] }> = {
  'HVAC': { 
    interval: 90, 
    tasks: ['Replace air filter', 'Check thermostat', 'Clean vents', 'Inspect ductwork'] 
  },
  'Kitchen Appliances': { 
    interval: 180, 
    tasks: ['Clean coils (refrigerator)', 'Descale (coffee maker)', 'Deep clean', 'Check seals'] 
  },
  'Laundry': { 
    interval: 90, 
    tasks: ['Clean lint trap', 'Run cleaning cycle', 'Check hoses', 'Level machine'] 
  },
  'Plumbing': { 
    interval: 365, 
    tasks: ['Flush water heater', 'Check for leaks', 'Test sump pump', 'Clean aerators'] 
  },
  'Outdoor': { 
    interval: 365, 
    tasks: ['Winterize equipment', 'Sharpen blades', 'Change oil', 'Store properly'] 
  },
  'Safety': { 
    interval: 180, 
    tasks: ['Test batteries', 'Test alarm', 'Check expiration dates', 'Update codes'] 
  },
};

class AISuggestionsService {
  /**
   * Suggest categories based on item name
   */
  suggestCategory(itemName: string): { category: string; confidence: number }[] {
    const lowerName = itemName.toLowerCase();
    const suggestions: { category: string; confidence: number }[] = [];

    // Check keyword matches
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let matchCount = 0;
      let totalMatches = 0;

      for (const keyword of keywords) {
        if (lowerName.includes(keyword)) {
          matchCount++;
          // Higher weight for exact word matches
          if (lowerName.split(/\s+/).includes(keyword)) {
            matchCount += 0.5;
          }
        }
        totalMatches++;
      }

      if (matchCount > 0) {
        const confidence = Math.min(matchCount / 2, 1); // Cap at 1.0
        suggestions.push({ category, confidence });
      }
    }

    // Also check existing items for similar names
    const existingSuggestions = this.suggestFromExistingItems(itemName);
    for (const suggestion of existingSuggestions) {
      const existing = suggestions.find(s => s.category === suggestion.category);
      if (existing) {
        existing.confidence = Math.min(existing.confidence + suggestion.confidence * 0.5, 1);
      } else {
        suggestions.push(suggestion);
      }
    }

    // Sort by confidence and return top 3
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Suggest categories based on similar existing items
   */
  private suggestFromExistingItems(itemName: string): { category: string; confidence: number }[] {
    const words = itemName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return [];

    // Search for similar items using FTS
    const searchTerms = words.join(' OR ');
    
    try {
      const stmt = db.prepare(`
        SELECT category, COUNT(*) as count
        FROM items
        WHERE id IN (
          SELECT rowid FROM items_fts WHERE items_fts MATCH ?
        )
        AND category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
        LIMIT 5
      `);

      const results = stmt.all(searchTerms) as Array<{ category: string; count: number }>;
      const totalCount = results.reduce((sum, r) => sum + r.count, 0);

      return results.map(r => ({
        category: r.category,
        confidence: totalCount > 0 ? r.count / totalCount * 0.6 : 0,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Suggest maintenance tasks for an item
   */
  suggestMaintenanceTasks(item: { name: string; category?: string; purchaseDate?: string }): {
    suggestedTasks: string[];
    recommendedInterval: number;
    nextDueDate: string;
  } {
    const category = item.category || this.suggestCategory(item.name)[0]?.category;
    
    if (!category || !MAINTENANCE_INTERVALS[category]) {
      return {
        suggestedTasks: ['General inspection', 'Clean and dust', 'Check for wear'],
        recommendedInterval: 365,
        nextDueDate: this.calculateNextDueDate(item.purchaseDate, 365),
      };
    }

    const maintenance = MAINTENANCE_INTERVALS[category];
    return {
      suggestedTasks: maintenance.tasks,
      recommendedInterval: maintenance.interval,
      nextDueDate: this.calculateNextDueDate(item.purchaseDate, maintenance.interval),
    };
  }

  /**
   * Calculate next due date based on purchase date or now
   */
  private calculateNextDueDate(purchaseDate: string | undefined, intervalDays: number): string {
    const baseDate = purchaseDate ? new Date(purchaseDate) : new Date();
    const now = new Date();
    
    // Find the next due date after today
    let nextDue = new Date(baseDate);
    while (nextDue <= now) {
      nextDue.setDate(nextDue.getDate() + intervalDays);
    }
    
    return nextDue.toISOString().split('T')[0];
  }

  /**
   * Get predictive maintenance recommendations
   */
  getPredictiveMaintenanceRecommendations(): {
    neglectedItems: Array<{ id: string; name: string; category: string; daysSinceLastMaintenance: number }>;
    frequentRepairItems: Array<{ id: string; name: string; repairCount: number; suggestion: string }>;
    upcomingMaintenance: Array<{ id: string; name: string; task: string; dueDate: string }>;
  } {
    const neglectedItems: Array<{ id: string; name: string; category: string; daysSinceLastMaintenance: number }> = [];
    const frequentRepairItems: Array<{ id: string; name: string; repairCount: number; suggestion: string }> = [];
    const upcomingMaintenance: Array<{ id: string; name: string; task: string; dueDate: string }> = [];

    try {
      // Find items without maintenance in over a year
      const neglectedStmt = db.prepare(`
        SELECT i.id, i.name, c.name as category,
               JULIANDAY('now') - JULIANDAY(COALESCE(
                 (SELECT MAX(last_completed) FROM maintenance_tasks WHERE related_item_id = i.id AND status = 'completed'),
                 i.purchase_date,
                 i.created_at
               )) as days_since
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.status = 'active'
        HAVING days_since > 365
        ORDER BY days_since DESC
        LIMIT 10
      `);
      
      const neglected = neglectedStmt.all() as Array<{ id: string; name: string; category: string; days_since: number }>;
      for (const item of neglected) {
        neglectedItems.push({
          id: item.id,
          name: item.name,
          category: item.category || 'Uncategorized',
          daysSinceLastMaintenance: Math.round(item.days_since),
        });
      }

      // Find items with frequent repairs (3+ in last year)
      const frequentStmt = db.prepare(`
        SELECT i.id, i.name, COUNT(mt.id) as repair_count
        FROM items i
        JOIN maintenance_tasks mt ON mt.related_item_id = i.id
        WHERE mt.status = 'completed'
          AND mt.last_completed >= date('now', '-1 year')
        GROUP BY i.id
        HAVING repair_count >= 3
        ORDER BY repair_count DESC
        LIMIT 10
      `);

      const frequent = frequentStmt.all() as Array<{ id: string; name: string; repair_count: number }>;
      for (const item of frequent) {
        frequentRepairItems.push({
          id: item.id,
          name: item.name,
          repairCount: item.repair_count,
          suggestion: item.repair_count >= 5 
            ? 'Consider replacement - frequent repairs indicate end of life'
            : 'Schedule preventive maintenance to reduce repair frequency',
        });
      }

      // Get upcoming maintenance tasks
      const upcomingStmt = db.prepare(`
        SELECT mt.id, i.name, mt.title as task, mt.due_date
        FROM maintenance_tasks mt
        JOIN items i ON mt.related_item_id = i.id
        WHERE mt.status = 'pending'
          AND mt.due_date BETWEEN date('now') AND date('now', '+30 days')
        ORDER BY mt.due_date
        LIMIT 10
      `);

      const upcoming = upcomingStmt.all() as Array<{ id: string; name: string; task: string; due_date: string }>;
      for (const task of upcoming) {
        upcomingMaintenance.push({
          id: task.id,
          name: task.name,
          task: task.task,
          dueDate: task.due_date,
        });
      }
    } catch (error) {
      console.error('Error getting predictive maintenance:', error);
    }

    return { neglectedItems, frequentRepairItems, upcomingMaintenance };
  }

  /**
   * Suggest similar items (for warranty lookup, etc.)
   */
  findSimilarItems(itemName: string, limit = 5): Array<{ id: string; name: string; category: string; similarity: number }> {
    const words = itemName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return [];

    try {
      const searchTerms = words.join(' OR ');
      const stmt = db.prepare(`
        SELECT i.id, i.name, c.name as category, bm25(items_fts) as rank
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        JOIN items_fts ON items_fts.rowid = i.rowid
        WHERE items_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);

      const results = stmt.all(searchTerms, limit) as Array<{ id: string; name: string; category: string; rank: number }>;
      
      // Normalize rank to similarity score (0-1)
      const maxRank = Math.abs(results[results.length - 1]?.rank || 1);
      return results.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category || 'Uncategorized',
        similarity: Math.max(0, 1 - Math.abs(r.rank) / maxRank),
      }));
    } catch {
      return [];
    }
  }
}

export const aiSuggestionsService = new AISuggestionsService();
