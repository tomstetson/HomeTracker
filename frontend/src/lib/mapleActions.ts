/**
 * Maple Action Service
 *
 * Enables Maple AI to execute actions within HomeTracker on behalf of the user.
 * Supports creating items, maintenance tasks, reminders, navigation, and more.
 */

import { useMaintenanceStore, MaintenanceTask } from '../store/maintenanceStore';
import { useInventoryStore, InventoryItem } from '../store/inventoryStore';
import { useProjectStore, Project } from '../store/projectStore';
import { useVendorStore, Vendor } from '../store/vendorStore';

// ============================================================================
// Action Types
// ============================================================================

export type MapleActionType =
  | 'add_maintenance_task'
  | 'add_inventory_item'
  | 'add_project'
  | 'add_vendor'
  | 'add_reminder'
  | 'navigate_to'
  | 'search_items'
  | 'get_overview'
  | 'update_item'
  | 'complete_task';

export interface MapleAction {
  type: MapleActionType;
  params: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  navigateTo?: string;
}

// ============================================================================
// Action Definitions for AI Prompt
// ============================================================================

export const MAPLE_ACTIONS_PROMPT = `
You are Maple 🍁, an AI assistant for HomeTracker - a home management application.
You can help users by answering questions AND taking actions on their behalf.

AVAILABLE ACTIONS:
When the user asks you to DO something (not just answer a question), respond with a JSON action block.

1. **Add Maintenance Task**
   Use when: User wants to create a maintenance task, reminder, or scheduled work
   \`\`\`json
   {"action": "add_maintenance_task", "params": {
     "title": "Task title (required)",
     "description": "Detailed description",
     "category": "HVAC|Plumbing|Electrical|Exterior|Interior|Safety|Other",
     "priority": "low|medium|high|urgent",
     "dueDate": "YYYY-MM-DD",
     "recurrence": "none|weekly|monthly|quarterly|yearly",
     "estimatedCost": 100
   }}
   \`\`\`

2. **Add Inventory Item**
   Use when: User wants to add something to their inventory
   \`\`\`json
   {"action": "add_inventory_item", "params": {
     "name": "Item name (required)",
     "category": "Kitchen Appliances|Electronics|Furniture|Tools|HVAC|Other",
     "location": "Where it's located",
     "brand": "Brand name",
     "modelNumber": "Model number",
     "purchasePrice": 500,
     "purchaseDate": "YYYY-MM-DD",
     "condition": "excellent|good|fair|poor",
     "notes": "Additional notes"
   }}
   \`\`\`

3. **Add Project**
   Use when: User wants to start a new home project
   \`\`\`json
   {"action": "add_project", "params": {
     "name": "Project name (required)",
     "description": "Project description",
     "status": "planning|in-progress|on-hold|completed",
     "priority": "low|medium|high|urgent",
     "budget": 5000,
     "dueDate": "YYYY-MM-DD"
   }}
   \`\`\`

4. **Add Vendor**
   Use when: User wants to save a contractor or service provider
   \`\`\`json
   {"action": "add_vendor", "params": {
     "name": "Business name (required)",
     "category": "Plumber|Electrician|HVAC|General Contractor|Landscaper|Other",
     "phone": "555-123-4567",
     "email": "vendor@example.com",
     "notes": "Additional notes"
   }}
   \`\`\`

5. **Navigate To**
   Use when: User wants to go to a specific page
   \`\`\`json
   {"action": "navigate_to", "params": {
     "page": "dashboard|inventory|maintenance|projects|vendors|warranties|documents|diagrams|home-info|budget|settings|backup"
   }}
   \`\`\`

6. **Complete Task**
   Use when: User says they finished a maintenance task
   \`\`\`json
   {"action": "complete_task", "params": {
     "taskTitle": "Name of the task to complete",
     "actualCost": 150,
     "notes": "Completion notes"
   }}
   \`\`\`

RESPONSE FORMAT:
- For QUESTIONS: Just respond naturally with helpful information
- For ACTIONS: Include the JSON block, then explain what you did
- You can combine actions with explanations

CONTEXT AWARENESS:
The user is currently viewing: {currentPage}
Recent context: {recentContext}

Be friendly, helpful, and proactive. Use the 🍁 emoji occasionally to stay on brand.
`;

// ============================================================================
// Route/Context Mapping
// ============================================================================

export const ROUTE_CONTEXT: Record<string, string> = {
  '/': 'Dashboard - Home overview with stats and quick actions',
  '/items': 'Inventory - Managing household items and assets',
  '/inventory-wizard': 'Inventory Wizard - AI-powered batch item creation',
  '/maintenance': 'Maintenance - Scheduled tasks and home upkeep',
  '/projects': 'Projects - Home improvement and renovation tracking',
  '/vendors': 'Vendors - Service providers and contractors',
  '/warranties': 'Warranties - Product warranty tracking',
  '/documents': 'Documents - Important home documents',
  '/diagrams': 'Diagrams - Home system diagrams and floor plans',
  '/home-info': 'Home Info - Property details and emergency contacts',
  '/budget': 'Budget - Home expenses and financial tracking',
  '/settings': 'Settings - App configuration',
  '/backup': 'Backup - Data backup and restore',
};

export function getPageContext(pathname: string): string {
  return ROUTE_CONTEXT[pathname] || 'General home management';
}

// ============================================================================
// Action Executor
// ============================================================================

export function parseActionFromResponse(response: string): MapleAction | null {
  // Look for JSON action blocks in the response
  const jsonMatch = response.match(/```json\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.action && parsed.params) {
        return {
          type: parsed.action as MapleActionType,
          params: parsed.params,
        };
      }
    } catch (e) {
      console.error('Failed to parse action JSON:', e);
    }
  }

  // Also try inline JSON (without code blocks)
  const inlineMatch = response.match(/\{"action":\s*"[^"]+",\s*"params":\s*\{[^}]+\}\}/);
  if (inlineMatch) {
    try {
      const parsed = JSON.parse(inlineMatch[0]);
      if (parsed.action && parsed.params) {
        return {
          type: parsed.action as MapleActionType,
          params: parsed.params,
        };
      }
    } catch (e) {
      // Ignore parse errors for inline
    }
  }

  return null;
}

export async function executeAction(action: MapleAction): Promise<ActionResult> {
  const { type, params } = action;

  try {
    switch (type) {
      case 'add_maintenance_task':
        return executeAddMaintenanceTask(params);

      case 'add_inventory_item':
        return executeAddInventoryItem(params);

      case 'add_project':
        return executeAddProject(params);

      case 'add_vendor':
        return executeAddVendor(params);

      case 'navigate_to':
        return executeNavigateTo(params);

      case 'complete_task':
        return executeCompleteTask(params);

      default:
        return {
          success: false,
          message: `Unknown action type: ${type}`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Action failed: ${error.message}`,
    };
  }
}

// ============================================================================
// Individual Action Executors
// ============================================================================

function executeAddMaintenanceTask(params: Record<string, any>): ActionResult {
  const store = useMaintenanceStore.getState();

  if (!params.title) {
    return { success: false, message: 'Task title is required' };
  }

  const task: MaintenanceTask = {
    id: `task_${Date.now()}`,
    title: params.title,
    description: params.description || '',
    category: params.category || 'Other',
    priority: params.priority || 'medium',
    status: 'pending',
    dueDate: params.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    recurrence: params.recurrence || 'none',
    estimatedCost: params.estimatedCost,
    notes: params.notes,
  };

  store.addTask(task);

  return {
    success: true,
    message: `Created maintenance task: "${task.title}" due ${task.dueDate}`,
    data: task,
    navigateTo: '/maintenance',
  };
}

function executeAddInventoryItem(params: Record<string, any>): ActionResult {
  const store = useInventoryStore.getState();

  if (!params.name) {
    return { success: false, message: 'Item name is required' };
  }

  const item: InventoryItem = {
    id: `item_${Date.now()}`,
    name: params.name,
    category: params.category || 'Other',
    location: params.location || 'Not specified',
    brand: params.brand,
    modelNumber: params.modelNumber,
    serialNumber: params.serialNumber,
    purchaseDate: params.purchaseDate,
    purchasePrice: params.purchasePrice,
    currentValue: params.purchasePrice,
    condition: params.condition || 'good',
    notes: params.notes,
    photos: [],
    tags: [],
    status: 'active',
  };

  store.addItem(item);

  return {
    success: true,
    message: `Added to inventory: "${item.name}" in ${item.location}`,
    data: item,
    navigateTo: '/items',
  };
}

function executeAddProject(params: Record<string, any>): ActionResult {
  const store = useProjectStore.getState();

  if (!params.name) {
    return { success: false, message: 'Project name is required' };
  }

  const project: Project = {
    id: `proj_${Date.now()}`,
    name: params.name,
    description: params.description || '',
    status: params.status || 'planning',
    priority: params.priority || 'medium',
    budget: params.budget,
    actualCost: 0,
    progress: 0,
    endDate: params.dueDate,
    startDate: new Date().toISOString().split('T')[0],
    category: params.category || 'General',
    tags: params.tags || [],
    subtasks: [],
  };

  store.addProject(project);

  return {
    success: true,
    message: `Created project: "${project.name}"`,
    data: project,
    navigateTo: '/projects',
  };
}

function executeAddVendor(params: Record<string, any>): ActionResult {
  const store = useVendorStore.getState();

  if (!params.name) {
    return { success: false, message: 'Vendor name is required' };
  }

  const categoryArray = params.category
    ? (Array.isArray(params.category) ? params.category : [params.category])
    : ['Other'];

  const vendor: Vendor = {
    id: `vendor_${Date.now()}`,
    businessName: params.name,
    contactPerson: params.contactPerson,
    phone: params.phone || '',
    email: params.email || '',
    address: params.address || '',
    website: params.website || '',
    category: categoryArray,
    notes: params.notes || '',
    rating: 0,
    totalJobs: 0,
    isPreferred: false,
    lastUsed: undefined,
  };

  store.addVendor(vendor);

  return {
    success: true,
    message: `Added vendor: "${vendor.businessName}" (${vendor.category.join(', ')})`,
    data: vendor,
    navigateTo: '/vendors',
  };
}

function executeNavigateTo(params: Record<string, any>): ActionResult {
  const pageRoutes: Record<string, string> = {
    dashboard: '/',
    inventory: '/items',
    items: '/items',
    maintenance: '/maintenance',
    projects: '/projects',
    vendors: '/vendors',
    warranties: '/warranties',
    documents: '/documents',
    diagrams: '/diagrams',
    'home-info': '/home-info',
    homeinfo: '/home-info',
    budget: '/budget',
    settings: '/settings',
    backup: '/backup',
  };

  const page = params.page?.toLowerCase();
  const route = pageRoutes[page];

  if (!route) {
    return {
      success: false,
      message: `Unknown page: ${params.page}. Available pages: ${Object.keys(pageRoutes).join(', ')}`,
    };
  }

  return {
    success: true,
    message: `Navigating to ${page}`,
    navigateTo: route,
  };
}

function executeCompleteTask(params: Record<string, any>): ActionResult {
  const store = useMaintenanceStore.getState();
  const tasks = store.tasks;

  // Find task by title (case-insensitive partial match)
  const searchTitle = params.taskTitle?.toLowerCase() || '';
  const task = tasks.find(
    (t) => t.status === 'pending' && t.title.toLowerCase().includes(searchTitle)
  );

  if (!task) {
    return {
      success: false,
      message: `Could not find pending task matching "${params.taskTitle}"`,
    };
  }

  store.completeTask(task.id, params.actualCost, params.notes);

  return {
    success: true,
    message: `Completed task: "${task.title}"`,
    data: task,
  };
}

// ============================================================================
// System Prompt Builder
// ============================================================================

export function buildMapleSystemPrompt(currentPath: string, additionalContext?: string): string {
  const pageContext = getPageContext(currentPath);

  let prompt = MAPLE_ACTIONS_PROMPT
    .replace('{currentPage}', pageContext)
    .replace('{recentContext}', additionalContext || 'No additional context');

  return prompt;
}
