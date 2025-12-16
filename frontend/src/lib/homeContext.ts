/**
 * HomeContext Builder
 * Aggregates all stores into a structured context for AI prompts
 * Used by AI features to understand the current state of the home
 */

import { useInventoryStore, InventoryItem, ConsumableInfo } from '../store/inventoryStore';
import { useMaintenanceStore, MaintenanceTask } from '../store/maintenanceStore';
import { useProjectStore, Project, Subtask } from '../store/projectStore';
import { useVendorStore, Vendor } from '../store/vendorStore';
import { useDocumentStore, Document } from '../store/documentStore';
import { useHomeVitalsStore, HomeVitals, PaintColor, HomeValue, ServiceRecord } from '../store/homeVitalsStore';

// ============================================================================
// Types
// ============================================================================

export interface InventoryContext {
  totalItems: number;
  activeItems: InventoryItem[];
  expiringWarranties: InventoryItem[];
  lowStockConsumables: InventoryItem[];
  consumablesNeedingReplacement: InventoryItem[];
  categories: string[];
  totalValue: number;
  itemsByCategory: Record<string, number>;
}

export interface MaintenanceContext {
  totalTasks: number;
  overdueTasks: MaintenanceTask[];
  upcomingTasks: MaintenanceTask[];
  pendingTasks: MaintenanceTask[];
  completedRecently: MaintenanceTask[];
  tasksByCategory: Record<string, number>;
  tasksByPriority: Record<string, number>;
}

export interface ProjectContext {
  totalProjects: number;
  activeProjects: Project[];
  stalledProjects: Project[];
  recentlyCompleted: Project[];
  totalBudget: number;
  totalActualCost: number;
  projectsByStatus: Record<string, number>;
}

export interface VendorContext {
  totalVendors: number;
  preferredVendors: Vendor[];
  vendorsByCategory: Record<string, Vendor[]>;
  recentlyUsed: Vendor[];
}

export interface DocumentContext {
  totalDocuments: number;
  recentDocuments: Document[];
  documentsByCategory: Record<string, number>;
}

export interface HomeInfoContext {
  vitals: HomeVitals;
  paintColors: PaintColor[];
  homeValues: HomeValue[];
  serviceHistory: ServiceRecord[];
  currentHomeValue: number | null;
}

export interface HomeContext {
  timestamp: string;
  inventory: InventoryContext;
  maintenance: MaintenanceContext;
  projects: ProjectContext;
  vendors: VendorContext;
  documents: DocumentContext;
  homeInfo: HomeInfoContext;
  summary: HomeSummary;
}

export interface HomeSummary {
  needsAttention: string[];
  upcomingDeadlines: string[];
  recentActivity: string[];
  quickStats: Record<string, number | string>;
}

// ============================================================================
// Context Builders
// ============================================================================

function buildInventoryContext(): InventoryContext {
  const store = useInventoryStore.getState();
  const activeItems = store.getActiveItems();
  const expiringWarranties = store.getExpiringWarranties(90);
  const consumables = store.getConsumables();
  const consumablesNeedingReplacement = store.getConsumablesNeedingReplacement(30);
  
  // Find low stock consumables
  const lowStockConsumables = consumables.filter((item) => {
    const info = item.consumableInfo;
    if (!info || info.stockQuantity === undefined || info.reorderThreshold === undefined) return false;
    return info.stockQuantity <= info.reorderThreshold;
  });

  // Group by category
  const itemsByCategory: Record<string, number> = {};
  activeItems.forEach((item) => {
    itemsByCategory[item.category] = (itemsByCategory[item.category] || 0) + 1;
  });

  return {
    totalItems: activeItems.length,
    activeItems,
    expiringWarranties,
    lowStockConsumables,
    consumablesNeedingReplacement,
    categories: store.categories,
    totalValue: store.getTotalValue(),
    itemsByCategory,
  };
}

function buildMaintenanceContext(): MaintenanceContext {
  const store = useMaintenanceStore.getState();
  const { tasks } = store;
  const overdueTasks = store.getOverdueTasks();
  const upcomingTasks = store.getUpcomingTasks();
  
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  
  // Completed in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const completedRecently = tasks.filter((t) => {
    if (t.status !== 'completed' || !t.completedDate) return false;
    return new Date(t.completedDate) >= thirtyDaysAgo;
  });

  // Group by category
  const tasksByCategory: Record<string, number> = {};
  tasks.forEach((task) => {
    tasksByCategory[task.category] = (tasksByCategory[task.category] || 0) + 1;
  });

  // Group by priority
  const tasksByPriority: Record<string, number> = {};
  pendingTasks.forEach((task) => {
    tasksByPriority[task.priority] = (tasksByPriority[task.priority] || 0) + 1;
  });

  return {
    totalTasks: tasks.length,
    overdueTasks,
    upcomingTasks,
    pendingTasks,
    completedRecently,
    tasksByCategory,
    tasksByPriority,
  };
}

function buildProjectContext(): ProjectContext {
  const store = useProjectStore.getState();
  const { projects } = store;
  
  const activeProjects = projects.filter((p) => 
    p.status === 'in-progress' || p.status === 'planning'
  );
  
  // Projects on hold for more than 30 days or in-progress with no recent activity
  const stalledProjects = projects.filter((p) => p.status === 'on-hold');
  
  // Completed in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentlyCompleted = projects.filter((p) => {
    if (p.status !== 'completed' || !p.endDate) return false;
    return new Date(p.endDate) >= thirtyDaysAgo;
  });

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalActualCost = projects.reduce((sum, p) => sum + (p.actualCost || 0), 0);

  // Group by status
  const projectsByStatus: Record<string, number> = {};
  projects.forEach((p) => {
    projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
  });

  return {
    totalProjects: projects.length,
    activeProjects,
    stalledProjects,
    recentlyCompleted,
    totalBudget,
    totalActualCost,
    projectsByStatus,
  };
}

function buildVendorContext(): VendorContext {
  const store = useVendorStore.getState();
  const { vendors } = store;
  
  const preferredVendors = store.getPreferredVendors();
  
  // Group by category
  const vendorsByCategory: Record<string, Vendor[]> = {};
  vendors.forEach((vendor) => {
    vendor.category.forEach((cat) => {
      if (!vendorsByCategory[cat]) vendorsByCategory[cat] = [];
      vendorsByCategory[cat].push(vendor);
    });
  });

  // Recently used (sorted by lastUsed)
  const recentlyUsed = [...vendors]
    .filter((v) => v.lastUsed)
    .sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())
    .slice(0, 5);

  return {
    totalVendors: vendors.length,
    preferredVendors,
    vendorsByCategory,
    recentlyUsed,
  };
}

function buildDocumentContext(): DocumentContext {
  const store = useDocumentStore.getState();
  const { documents } = store;
  
  // Recent documents (last 10)
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 10);

  // Group by category
  const documentsByCategory: Record<string, number> = {};
  documents.forEach((doc) => {
    documentsByCategory[doc.category] = (documentsByCategory[doc.category] || 0) + 1;
  });

  return {
    totalDocuments: documents.length,
    recentDocuments,
    documentsByCategory,
  };
}

function buildHomeInfoContext(): HomeInfoContext {
  const store = useHomeVitalsStore.getState();
  const { homeVitals, paintColors, homeValues, serviceHistory } = store;
  
  // Get most recent home value
  const sortedValues = [...homeValues].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const currentHomeValue = sortedValues[0]?.value || null;

  return {
    vitals: homeVitals,
    paintColors,
    homeValues,
    serviceHistory,
    currentHomeValue,
  };
}

function buildSummary(
  inventory: InventoryContext,
  maintenance: MaintenanceContext,
  projects: ProjectContext
): HomeSummary {
  const needsAttention: string[] = [];
  const upcomingDeadlines: string[] = [];
  const recentActivity: string[] = [];

  // Needs attention
  if (maintenance.overdueTasks.length > 0) {
    needsAttention.push(`${maintenance.overdueTasks.length} overdue maintenance task(s)`);
  }
  if (inventory.expiringWarranties.length > 0) {
    needsAttention.push(`${inventory.expiringWarranties.length} warranty/warranties expiring soon`);
  }
  if (inventory.lowStockConsumables.length > 0) {
    needsAttention.push(`${inventory.lowStockConsumables.length} consumable(s) low on stock`);
  }
  if (inventory.consumablesNeedingReplacement.length > 0) {
    needsAttention.push(`${inventory.consumablesNeedingReplacement.length} consumable(s) need replacement soon`);
  }
  if (projects.stalledProjects.length > 0) {
    needsAttention.push(`${projects.stalledProjects.length} project(s) on hold`);
  }

  // Upcoming deadlines
  maintenance.upcomingTasks.slice(0, 3).forEach((task) => {
    upcomingDeadlines.push(`${task.title} - due ${task.dueDate}`);
  });

  // Recent activity
  maintenance.completedRecently.slice(0, 3).forEach((task) => {
    recentActivity.push(`Completed: ${task.title}`);
  });
  projects.recentlyCompleted.slice(0, 2).forEach((project) => {
    recentActivity.push(`Finished project: ${project.name}`);
  });

  const quickStats: Record<string, number | string> = {
    'Total Inventory Items': inventory.totalItems,
    'Total Inventory Value': `$${inventory.totalValue.toLocaleString()}`,
    'Active Projects': projects.activeProjects.length,
    'Pending Maintenance': maintenance.pendingTasks.length,
    'Overdue Tasks': maintenance.overdueTasks.length,
    'Preferred Vendors': useVendorStore.getState().getPreferredVendors().length,
  };

  return {
    needsAttention,
    upcomingDeadlines,
    recentActivity,
    quickStats,
  };
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Build complete HomeContext from all stores
 */
export function buildHomeContext(): HomeContext {
  const inventory = buildInventoryContext();
  const maintenance = buildMaintenanceContext();
  const projects = buildProjectContext();
  const vendors = buildVendorContext();
  const documents = buildDocumentContext();
  const homeInfo = buildHomeInfoContext();
  const summary = buildSummary(inventory, maintenance, projects);

  return {
    timestamp: new Date().toISOString(),
    inventory,
    maintenance,
    projects,
    vendors,
    documents,
    homeInfo,
    summary,
  };
}

/**
 * Build a focused context for specific areas
 */
export function buildFocusedContext(focus: 'inventory' | 'maintenance' | 'projects' | 'vendors' | 'all'): Partial<HomeContext> {
  switch (focus) {
    case 'inventory':
      return { inventory: buildInventoryContext(), timestamp: new Date().toISOString() };
    case 'maintenance':
      return { maintenance: buildMaintenanceContext(), timestamp: new Date().toISOString() };
    case 'projects':
      return { projects: buildProjectContext(), timestamp: new Date().toISOString() };
    case 'vendors':
      return { vendors: buildVendorContext(), timestamp: new Date().toISOString() };
    default:
      return buildHomeContext();
  }
}

/**
 * Convert HomeContext to a natural language prompt for AI
 */
export function contextToPrompt(context: HomeContext, maxLength?: number): string {
  const lines: string[] = [];
  
  lines.push('# Current Home Status');
  lines.push(`As of: ${new Date(context.timestamp).toLocaleString()}`);
  lines.push('');

  // Quick Stats
  lines.push('## Quick Statistics');
  Object.entries(context.summary.quickStats).forEach(([key, value]) => {
    lines.push(`- ${key}: ${value}`);
  });
  lines.push('');

  // Needs Attention
  if (context.summary.needsAttention.length > 0) {
    lines.push('## Items Needing Attention');
    context.summary.needsAttention.forEach((item) => {
      lines.push(`- ⚠️ ${item}`);
    });
    lines.push('');
  }

  // Upcoming Deadlines
  if (context.summary.upcomingDeadlines.length > 0) {
    lines.push('## Upcoming Deadlines');
    context.summary.upcomingDeadlines.forEach((item) => {
      lines.push(`- 📅 ${item}`);
    });
    lines.push('');
  }

  // Inventory Summary
  lines.push('## Inventory');
  lines.push(`- Total items: ${context.inventory.totalItems}`);
  lines.push(`- Total value: $${context.inventory.totalValue.toLocaleString()}`);
  lines.push(`- Categories: ${Object.keys(context.inventory.itemsByCategory).join(', ')}`);
  if (context.inventory.expiringWarranties.length > 0) {
    lines.push(`- Expiring warranties: ${context.inventory.expiringWarranties.map(i => i.name).join(', ')}`);
  }
  lines.push('');

  // Maintenance Summary
  lines.push('## Maintenance');
  lines.push(`- Pending tasks: ${context.maintenance.pendingTasks.length}`);
  lines.push(`- Overdue: ${context.maintenance.overdueTasks.length}`);
  if (context.maintenance.overdueTasks.length > 0) {
    lines.push(`- Overdue tasks: ${context.maintenance.overdueTasks.map(t => t.title).join(', ')}`);
  }
  if (context.maintenance.upcomingTasks.length > 0) {
    lines.push(`- Upcoming: ${context.maintenance.upcomingTasks.map(t => `${t.title} (${t.dueDate})`).join(', ')}`);
  }
  lines.push('');

  // Projects Summary
  lines.push('## Projects');
  lines.push(`- Active projects: ${context.projects.activeProjects.length}`);
  lines.push(`- Total budget: $${context.projects.totalBudget.toLocaleString()}`);
  lines.push(`- Actual spend: $${context.projects.totalActualCost.toLocaleString()}`);
  if (context.projects.activeProjects.length > 0) {
    lines.push(`- In progress: ${context.projects.activeProjects.map(p => `${p.name} (${p.progress}%)`).join(', ')}`);
  }
  lines.push('');

  // Vendors Summary
  lines.push('## Vendors');
  lines.push(`- Total vendors: ${context.vendors.totalVendors}`);
  lines.push(`- Preferred: ${context.vendors.preferredVendors.map(v => v.businessName).join(', ') || 'None'}`);
  lines.push('');

  // Home Info
  if (context.homeInfo.currentHomeValue) {
    lines.push('## Home Value');
    lines.push(`- Current estimated value: $${context.homeInfo.currentHomeValue.toLocaleString()}`);
    lines.push('');
  }

  let result = lines.join('\n');
  
  // Truncate if needed
  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength - 100) + '\n\n[Context truncated for length]';
  }

  return result;
}

/**
 * Create a compact JSON summary for embedding in prompts
 * Note: Use contextToNaturalLanguage for conversational AI responses
 */
export function contextToCompactJSON(context: HomeContext): string {
  const compact = {
    timestamp: context.timestamp,
    stats: context.summary.quickStats,
    attention: context.summary.needsAttention,
    inventory: {
      count: context.inventory.totalItems,
      value: context.inventory.totalValue,
      expiringWarranties: context.inventory.expiringWarranties.map(i => ({ name: i.name, expires: i.warranty?.endDate })),
      lowStock: context.inventory.lowStockConsumables.map(i => ({ name: i.name, qty: i.consumableInfo?.stockQuantity })),
    },
    maintenance: {
      pending: context.maintenance.pendingTasks.length,
      overdue: context.maintenance.overdueTasks.map(t => ({ title: t.title, due: t.dueDate, priority: t.priority })),
      upcoming: context.maintenance.upcomingTasks.map(t => ({ title: t.title, due: t.dueDate })),
    },
    projects: {
      active: context.projects.activeProjects.map(p => ({ name: p.name, progress: p.progress, status: p.status })),
      budget: context.projects.totalBudget,
      spent: context.projects.totalActualCost,
    },
    vendors: {
      total: context.vendors.totalVendors,
      preferred: context.vendors.preferredVendors.map(v => ({ name: v.businessName, categories: v.category })),
    },
  };

  return JSON.stringify(compact, null, 2);
}

/**
 * Create a natural language summary optimized for conversational AI
 * More token-efficient than full context, better for chat responses
 */
export function contextToNaturalLanguage(context: HomeContext): string {
  const lines: string[] = [];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  
  lines.push(`Today is ${today}.`);
  
  // Quick stats in natural language
  const stats = context.summary.quickStats;
  lines.push(`The home has ${stats['Total Inventory Items'] || 0} inventory items worth ${stats['Total Inventory Value'] || '$0'}.`);
  
  // Needs attention (most important for AI to know)
  if (context.summary.needsAttention.length > 0) {
    lines.push('\nThings needing attention:');
    context.summary.needsAttention.forEach(item => lines.push(`• ${item}`));
  }
  
  // Overdue maintenance
  if (context.maintenance.overdueTasks.length > 0) {
    lines.push('\nOverdue maintenance:');
    context.maintenance.overdueTasks.slice(0, 5).forEach(task => {
      lines.push(`• ${task.title} (was due ${task.dueDate}, ${task.priority} priority)`);
    });
  }
  
  // Upcoming maintenance (next 30 days)
  if (context.maintenance.upcomingTasks.length > 0) {
    lines.push('\nUpcoming maintenance:');
    context.maintenance.upcomingTasks.slice(0, 5).forEach(task => {
      lines.push(`• ${task.title} - due ${task.dueDate}`);
    });
  }
  
  // Active projects
  if (context.projects.activeProjects.length > 0) {
    lines.push('\nActive projects:');
    context.projects.activeProjects.forEach(project => {
      lines.push(`• ${project.name} (${project.progress}% complete, ${project.status})`);
    });
  }
  
  // Expiring warranties
  if (context.inventory.expiringWarranties.length > 0) {
    lines.push('\nWarranties expiring soon:');
    context.inventory.expiringWarranties.slice(0, 5).forEach(item => {
      lines.push(`• ${item.name} - expires ${item.warranty?.endDate || 'soon'}`);
    });
  }
  
  // Low stock consumables
  if (context.inventory.lowStockConsumables.length > 0) {
    lines.push('\nLow stock items:');
    context.inventory.lowStockConsumables.forEach(item => {
      lines.push(`• ${item.name} (${item.consumableInfo?.stockQuantity || 0} remaining)`);
    });
  }
  
  // Preferred vendors
  if (context.vendors.preferredVendors.length > 0) {
    lines.push('\nPreferred vendors:');
    context.vendors.preferredVendors.slice(0, 5).forEach(vendor => {
      lines.push(`• ${vendor.businessName} (${vendor.category.join(', ')})`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Get specific items by query (for natural language processing)
 */
export function queryHomeContext(query: string, context?: HomeContext): {
  matchedItems: InventoryItem[];
  matchedTasks: MaintenanceTask[];
  matchedProjects: Project[];
  matchedVendors: Vendor[];
} {
  const ctx = context || buildHomeContext();
  const lowerQuery = query.toLowerCase();

  const matchedItems = ctx.inventory.activeItems.filter((item) =>
    item.name.toLowerCase().includes(lowerQuery) ||
    item.category.toLowerCase().includes(lowerQuery) ||
    item.location.toLowerCase().includes(lowerQuery) ||
    item.brand?.toLowerCase().includes(lowerQuery) ||
    item.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );

  const matchedTasks = [...ctx.maintenance.pendingTasks, ...ctx.maintenance.overdueTasks].filter((task) =>
    task.title.toLowerCase().includes(lowerQuery) ||
    task.category.toLowerCase().includes(lowerQuery) ||
    task.description?.toLowerCase().includes(lowerQuery)
  );

  const matchedProjects = ctx.projects.activeProjects.filter((project) =>
    project.name.toLowerCase().includes(lowerQuery) ||
    project.category.toLowerCase().includes(lowerQuery) ||
    project.description?.toLowerCase().includes(lowerQuery) ||
    project.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );

  const matchedVendors = ctx.vendors.preferredVendors.filter((vendor) =>
    vendor.businessName.toLowerCase().includes(lowerQuery) ||
    vendor.category.some(c => c.toLowerCase().includes(lowerQuery))
  );

  return {
    matchedItems,
    matchedTasks,
    matchedProjects,
    matchedVendors,
  };
}




