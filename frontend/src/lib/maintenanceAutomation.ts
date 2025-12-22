/**
 * Maintenance Automation Service
 * AI-powered maintenance task generation and scheduling
 */

import { sendPrompt, isAIReady } from './aiService';
import { buildHomeContext } from './homeContext';
import { useInventoryStore } from '../store/inventoryStore';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { useAISettingsStore } from '../store/aiSettingsStore';

export interface MaintenanceRecommendation {
  title: string;
  description: string;
  category: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  suggestedFrequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'none';
  estimatedCost?: number;
  reasoning: string;
  relatedItemId?: string; // Link to inventory item
}

export interface PredictiveMaintenance {
  itemId: string;
  itemName: string;
  predictedIssue: string;
  predictedDate: string; // ISO date
  confidence: number; // 0-1
  recommendedAction: string;
  reasoning: string;
}

/**
 * Generate maintenance recommendations based on inventory
 */
export async function generateMaintenanceRecommendations(): Promise<{
  success: boolean;
  recommendations: MaintenanceRecommendation[];
  error?: string;
}> {
  const aiReady = isAIReady();
  if (!aiReady.ready) {
    return {
      success: false,
      recommendations: [],
      error: aiReady.error || 'AI not configured',
    };
  }

  const { isFeatureEnabled } = useAISettingsStore.getState();
  if (!isFeatureEnabled('enableMaintenanceAutomation')) {
    return {
      success: false,
      recommendations: [],
      error: 'Maintenance automation feature is disabled',
    };
  }

  try {
    const { items } = useInventoryStore.getState();
    const { tasks } = useMaintenanceStore.getState();
    
    // Build context with inventory and existing maintenance
    const context = buildHomeContext();
    
    const prompt = `Analyze the home inventory and generate maintenance recommendations.

Current Inventory:
${items.map(item => 
  `- ${item.name}${item.brand ? ` (${item.brand})` : ''}${item.modelNumber ? ` - Model: ${item.modelNumber}` : ''}${item.purchaseDate ? ` - Purchased: ${item.purchaseDate}` : ''}${item.location ? ` - Location: ${item.location}` : ''}`
).join('\n')}

Existing Maintenance Tasks:
${tasks.map(task => 
  `- ${task.title} (${task.category}) - ${task.status} - Due: ${task.dueDate}${task.recurrence ? ` - Recurrence: ${task.recurrence}` : ''}`
).join('\n')}

For each inventory item, suggest appropriate maintenance tasks based on:
1. Item type (appliance, HVAC, plumbing, etc.)
2. Age (if purchase date available)
3. Manufacturer recommendations
4. Common maintenance schedules

Return JSON array of recommendations:
[
  {
    "title": "Task name",
    "description": "Detailed description",
    "category": "HVAC" | "Plumbing" | "Electrical" | "Appliance" | "General",
    "priority": "urgent" | "high" | "medium" | "low",
    "suggestedFrequency": "weekly" | "monthly" | "quarterly" | "yearly" | "none",
    "estimatedCost": number (optional),
    "reasoning": "Why this maintenance is needed",
    "relatedItemId": "inventory item ID if applicable"
  }
]

Focus on:
- HVAC filters (quarterly)
- Water heater maintenance (annual)
- Appliance cleaning (monthly/quarterly)
- Safety inspections (annual)
- Seasonal maintenance (based on current date)`;

    const response = await sendPrompt({
      systemPrompt: 'You are a home maintenance expert. Provide practical, actionable maintenance recommendations.',
      userPrompt: prompt,
      homeContext: context,
      homeContextFormat: 'natural',
      preferFast: false,
      maxTokens: 2000,
    });

    if (!response.success || !response.content) {
      return {
        success: false,
        recommendations: [],
        error: response.error || 'Failed to generate recommendations',
      };
    }

    // Parse JSON from response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        success: false,
        recommendations: [],
        error: 'Could not parse AI response',
      };
    }

    const recommendations: MaintenanceRecommendation[] = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      recommendations,
    };
  } catch (error: any) {
    console.error('Error generating maintenance recommendations:', error);
    return {
      success: false,
      recommendations: [],
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Predict when maintenance issues might occur
 */
export async function predictMaintenanceIssues(): Promise<{
  success: boolean;
  predictions: PredictiveMaintenance[];
  error?: string;
}> {
  const aiReady = isAIReady();
  if (!aiReady.ready) {
    return {
      success: false,
      predictions: [],
      error: aiReady.error || 'AI not configured',
    };
  }

  try {
    const { items } = useInventoryStore.getState();
    const { tasks } = useMaintenanceStore.getState();
    
    // Filter items that are old or have maintenance history
    const itemsWithHistory = items.filter(item => {
      if (item.purchaseDate) {
        const purchaseDate = new Date(item.purchaseDate);
        const ageYears = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return ageYears >= 3; // Items older than 3 years
      }
      return false;
    });

    if (itemsWithHistory.length === 0) {
      return {
        success: true,
        predictions: [],
      };
    }

    const context = buildHomeContext();
    
    const prompt = `Analyze these older inventory items and predict when they might need service or replacement:

${itemsWithHistory.map(item => 
  `- ${item.name}${item.brand ? ` (${item.brand})` : ''}${item.modelNumber ? ` - Model: ${item.modelNumber}` : ''} - Purchased: ${item.purchaseDate}${item.condition ? ` - Condition: ${item.condition}` : ''}`
).join('\n')}

Maintenance History:
${tasks.filter(t => t.status === 'completed').map(t => 
  `- ${t.title} - Completed: ${t.completedDate}${t.actualCost ? ` - Cost: $${t.actualCost}` : ''}`
).join('\n')}

For each item, predict:
1. When it might need service/replacement (based on age, type, condition)
2. What issue might occur
3. Recommended preventive action

Return JSON array:
[
  {
    "itemId": "inventory item ID",
    "itemName": "Item name",
    "predictedIssue": "What might go wrong",
    "predictedDate": "YYYY-MM-DD",
    "confidence": 0.0-1.0,
    "recommendedAction": "What to do",
    "reasoning": "Why this prediction"
  }
]`;

    const response = await sendPrompt({
      systemPrompt: 'You are a predictive maintenance expert. Analyze equipment age, usage patterns, and maintenance history to predict future issues.',
      userPrompt: prompt,
      homeContext: context,
      homeContextFormat: 'natural',
      preferFast: false,
      maxTokens: 2000,
    });

    if (!response.success || !response.content) {
      return {
        success: false,
        predictions: [],
        error: response.error || 'Failed to generate predictions',
      };
    }

    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        success: false,
        predictions: [],
        error: 'Could not parse AI response',
      };
    }

    const predictions: PredictiveMaintenance[] = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      predictions,
    };
  } catch (error: any) {
    console.error('Error predicting maintenance issues:', error);
    return {
      success: false,
      predictions: [],
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Optimize maintenance scheduling
 * Groups related tasks and suggests optimal timing
 */
export async function optimizeMaintenanceSchedule(): Promise<{
  success: boolean;
  suggestions: Array<{
    taskIds: string[];
    suggestedDate: string;
    reasoning: string;
    estimatedSavings?: number;
  }>;
  error?: string;
}> {
  const aiReady = isAIReady();
  if (!aiReady.ready) {
    return {
      success: false,
      suggestions: [],
      error: aiReady.error || 'AI not configured',
    };
  }

  try {
    const { tasks } = useMaintenanceStore.getState();
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    if (pendingTasks.length === 0) {
      return {
        success: true,
        suggestions: [],
      };
    }

    const context = buildHomeContext();
    
    const prompt = `Analyze these pending maintenance tasks and suggest optimal scheduling:

${pendingTasks.map(task => 
  `- ${task.title} (${task.category}) - Priority: ${task.priority} - Due: ${task.dueDate}${task.estimatedCost ? ` - Est. Cost: $${task.estimatedCost}` : ''}${task.assignedTo ? ` - Assigned: ${task.assignedTo}` : ''}`
).join('\n')}

Suggest:
1. Group related tasks together (e.g., all HVAC work on same day)
2. Optimal timing (e.g., seasonal tasks)
3. Cost savings from grouping

Return JSON array:
[
  {
    "taskIds": ["task-id-1", "task-id-2"],
    "suggestedDate": "YYYY-MM-DD",
    "reasoning": "Why group these together",
    "estimatedSavings": number (optional, in dollars)
  }
]`;

    const response = await sendPrompt({
      systemPrompt: 'You are a maintenance scheduling optimizer. Group related tasks and suggest optimal timing to save time and money.',
      userPrompt: prompt,
      homeContext: context,
      homeContextFormat: 'natural',
      preferFast: true,
      maxTokens: 1500,
    });

    if (!response.success || !response.content) {
      return {
        success: false,
        suggestions: [],
        error: response.error || 'Failed to optimize schedule',
      };
    }

    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        success: false,
        suggestions: [],
        error: 'Could not parse AI response',
      };
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      suggestions,
    };
  } catch (error: any) {
    console.error('Error optimizing maintenance schedule:', error);
    return {
      success: false,
      suggestions: [],
      error: error.message || 'Unknown error',
    };
  }
}

