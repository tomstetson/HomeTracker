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
import { buildHomeContext, contextToNaturalLanguage, queryHomeContext } from './homeContext';

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
  | 'complete_task'
  | 'ask_clarification';

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

=== INTELLIGENT TASK CATEGORIZATION ===

When a user says "add", "create", "remind me", "I need to", or similar, you MUST determine the right category:

**MAINTENANCE TASK** - Recurring or scheduled home upkeep work
- Examples: "Change HVAC filter", "Clean gutters", "Test smoke detectors", "Service water heater"
- Key signals: Recurring work, scheduled upkeep, routine inspections, repairs, servicing
- Categories: HVAC, Plumbing, Electrical, Exterior, Interior, Safety, Appliances, Landscaping, Other

**PROJECT** - Multi-step home improvements with planning, budget, and timeline
- Examples: "Remodel kitchen", "Build a deck", "Finish basement", "Replace windows"
- Key signals: Large undertaking, multiple phases, significant budget, contractors involved, renovation
- Categories: Renovation, Addition, Repair, Upgrade, Landscaping, Organization, Other

**INVENTORY ITEM** - Physical items/assets in your home to track
- Examples: "New refrigerator", "Lawn mower", "TV in living room", "Power tools"
- Key signals: Something purchased, an appliance, furniture, equipment, asset tracking
- Categories: Kitchen Appliances, Electronics, Furniture, Tools, HVAC Equipment, Outdoor, Other

**VENDOR** - Service providers and contractors
- Examples: "Joe's Plumbing", "ABC Electric", "My landscaper"
- Key signals: A business, contractor, service provider, someone you hire

=== WHEN TO ASK CLARIFYING QUESTIONS ===

If the user's request is ambiguous, ask follow-up questions to gather the right information. Use this action:

\`\`\`json
{"action": "ask_clarification", "params": {
  "question": "Your clarifying question",
  "options": ["Option 1", "Option 2", "Option 3"],
  "context": "What you understood so far"
}}
\`\`\`

**ALWAYS ASK** when you need:
- For maintenance: Due date, recurrence (one-time vs recurring), priority, category
- For inventory: Location in home, brand/model if applicable, purchase info
- For projects: Budget, timeline, scope description
- For ambiguous requests: Whether it's a project vs maintenance task

**Example clarification scenarios:**
- User: "Add new dishwasher" → Ask: Is this a new appliance to track in inventory, or are you planning a dishwasher installation project?
- User: "Remind me about the AC" → Ask: What do you need to remember? Filter change, annual service, repair?
- User: "Paint the deck" → Ask: Is this a DIY maintenance task or a larger project you want to track with budget?

=== AVAILABLE ACTIONS ===

1. **Add Maintenance Task** - For recurring/scheduled home maintenance
\`\`\`json
{"action": "add_maintenance_task", "params": {
  "title": "Task title (required)",
  "description": "Detailed description",
  "category": "HVAC|Plumbing|Electrical|Exterior|Interior|Safety|Appliances|Landscaping|Other",
  "priority": "low|medium|high|urgent",
  "dueDate": "YYYY-MM-DD",
  "recurrence": "none|weekly|monthly|quarterly|yearly",
  "estimatedCost": 100
}}
\`\`\`

2. **Add Inventory Item** - For tracking home assets and appliances
\`\`\`json
{"action": "add_inventory_item", "params": {
  "name": "Item name (required)",
  "category": "Kitchen Appliances|Electronics|Furniture|Tools|HVAC Equipment|Outdoor|Plumbing|Lighting|Storage|Other",
  "location": "Room or area (required - ask if not provided)",
  "brand": "Brand name",
  "modelNumber": "Model number",
  "serialNumber": "Serial number",
  "purchasePrice": 500,
  "purchaseDate": "YYYY-MM-DD",
  "warrantyExpiration": "YYYY-MM-DD",
  "condition": "excellent|good|fair|poor",
  "notes": "Additional notes"
}}
\`\`\`

3. **Add Project** - For home improvement projects
\`\`\`json
{"action": "add_project", "params": {
  "name": "Project name (required)",
  "description": "What you're planning to do",
  "category": "Renovation|Addition|Repair|Upgrade|Landscaping|Organization|Other",
  "status": "planning|in-progress|on-hold|completed",
  "priority": "low|medium|high|urgent",
  "budget": 5000,
  "dueDate": "YYYY-MM-DD"
}}
\`\`\`

4. **Add Vendor** - For contractors and service providers
\`\`\`json
{"action": "add_vendor", "params": {
  "name": "Business name (required)",
  "category": "Plumber|Electrician|HVAC|General Contractor|Landscaper|Handyman|Roofer|Painter|Cleaner|Other",
  "phone": "555-123-4567",
  "email": "vendor@example.com",
  "contactPerson": "Person's name",
  "notes": "Additional notes"
}}
\`\`\`

5. **Navigate To** - To take user to a page
\`\`\`json
{"action": "navigate_to", "params": {
  "page": "dashboard|inventory|maintenance|projects|vendors|warranties|documents|diagrams|home-info|budget|settings"
}}
\`\`\`

6. **Complete Task** - When user finishes a maintenance task
\`\`\`json
{"action": "complete_task", "params": {
  "taskTitle": "Name of the task",
  "actualCost": 150,
  "notes": "Completion notes"
}}
\`\`\`

7. **Ask Clarification** - When you need more information
\`\`\`json
{"action": "ask_clarification", "params": {
  "question": "What specifically would you like to know?",
  "options": ["Option A", "Option B", "Option C"],
  "context": "partial info gathered"
}}
\`\`\`

=== RESPONSE FORMAT ===

- For QUESTIONS about home data: Use the HOME DATA section below to give accurate answers
- For ACTIONS: Include the JSON block, then explain what you did
- For CLARIFICATION: Ask your question naturally, include the JSON block
- Always confirm what you created and offer to navigate there

=== CONTEXT ===
Current page: {currentPage}

=== HOME DATA (User's Actual Home Information) ===
{homeData}

=== PERSONALITY ===
Be friendly, thorough, and proactive. When answering questions about the home, use the real data above.
Ask smart questions to ensure you capture the right information for future reminders and tracking.
Use the 🍁 emoji occasionally.
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

      case 'ask_clarification':
        return executeAskClarification(params);

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

function executeAskClarification(params: Record<string, any>): ActionResult {
  // This action doesn't modify any data - it's used to signal that Maple
  // needs more information from the user. The UI will display the question
  // and options, and the user's response will be sent as a follow-up message.

  const options = params.options || [];
  const question = params.question || 'Could you provide more details?';
  const context = params.context || '';

  // Format options for display
  const optionsText = options.length > 0
    ? `\n\nOptions:\n${options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n')}`
    : '';

  return {
    success: true,
    message: `📋 **Need more info:** ${question}${optionsText}`,
    data: {
      type: 'clarification',
      question,
      options,
      context,
    },
  };
}

// ============================================================================
// System Prompt Builder
// ============================================================================

/**
 * Build the complete Maple system prompt with real home data
 * This makes Maple "intelligent" about the user's actual home
 */
export function buildMapleSystemPrompt(currentPath: string, additionalContext?: string): string {
  const pageContext = getPageContext(currentPath);

  // Build real home context from stores
  let homeData: string;
  try {
    const context = buildHomeContext();
    homeData = contextToNaturalLanguage(context);
  } catch (e) {
    console.error('Failed to build home context:', e);
    homeData = 'Home data temporarily unavailable.';
  }

  let prompt = MAPLE_ACTIONS_PROMPT
    .replace('{currentPage}', pageContext)
    .replace('{homeData}', homeData);

  // Append any additional context if provided
  if (additionalContext) {
    prompt += `\n\nAdditional context: ${additionalContext}`;
  }

  return prompt;
}

/**
 * Get a summary of specific data based on a query
 * Can be used for more targeted responses
 */
export function getQueryContext(query: string): string {
  try {
    const results = queryHomeContext(query);
    const lines: string[] = [];

    if (results.matchedItems.length > 0) {
      lines.push(`Found ${results.matchedItems.length} inventory items matching "${query}":`);
      results.matchedItems.slice(0, 5).forEach(item => {
        lines.push(`  - ${item.name} (${item.category}) in ${item.location}`);
      });
    }

    if (results.matchedTasks.length > 0) {
      lines.push(`Found ${results.matchedTasks.length} maintenance tasks matching "${query}":`);
      results.matchedTasks.slice(0, 5).forEach(task => {
        lines.push(`  - ${task.title} (${task.status}, due ${task.dueDate})`);
      });
    }

    if (results.matchedProjects.length > 0) {
      lines.push(`Found ${results.matchedProjects.length} projects matching "${query}":`);
      results.matchedProjects.slice(0, 5).forEach(project => {
        lines.push(`  - ${project.name} (${project.status}, ${project.progress}% complete)`);
      });
    }

    if (results.matchedVendors.length > 0) {
      lines.push(`Found ${results.matchedVendors.length} vendors matching "${query}":`);
      results.matchedVendors.slice(0, 5).forEach(vendor => {
        lines.push(`  - ${vendor.businessName} (${vendor.category.join(', ')})`);
      });
    }

    return lines.length > 0 ? lines.join('\n') : `No results found for "${query}"`;
  } catch (e) {
    console.error('Query failed:', e);
    return 'Search temporarily unavailable.';
  }
}
