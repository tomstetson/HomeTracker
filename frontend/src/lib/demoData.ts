/**
 * Centralized Demo Data for HomeTracker
 * 
 * This file contains all demo/seed data for testing and demonstration.
 * Used to initialize the app with consistent sample data across all modules.
 * 
 * To reset the app to demo data, call: initializeDemoData()
 */

import { StorageData } from './storage';

// ============================================================================
// VENDORS - 4 trusted service providers
// ============================================================================
export const DEMO_VENDORS = [
  {
    id: 'vendor-1',
    businessName: "Joe's Plumbing",
    contactPerson: 'Joe Smith',
    phone: '215-555-0101',
    email: 'joe@joesplumbing.com',
    website: 'www.joesplumbing.com',
    address: '123 Main St, Anytown, PA 19000',
    category: ['Plumbing', 'Emergency'],
    rating: 5,
    totalJobs: 3,
    notes: 'Excellent work, very responsive. Fixed water heater quickly.',
    isPreferred: true,
    lastUsed: '2024-10-15',
  },
  {
    id: 'vendor-2',
    businessName: 'Elite Electric',
    contactPerson: 'Sarah Johnson',
    phone: '215-555-0202',
    email: 'contact@eliteelectric.com',
    category: ['Electrical', 'Licensed'],
    rating: 4,
    totalJobs: 2,
    notes: 'Professional and thorough. Did great work on kitchen remodel.',
    isPreferred: true,
    lastUsed: '2024-11-01',
  },
  {
    id: 'vendor-3',
    businessName: 'ABC Contractors',
    contactPerson: 'Mike Davis',
    phone: '215-555-0303',
    email: 'mike@abccontractors.com',
    website: 'www.abccontractors.com',
    category: ['General Contractor', 'Renovation'],
    rating: 5,
    totalJobs: 1,
    notes: 'Handled our kitchen remodel from start to finish. Highly recommend!',
    isPreferred: true,
    lastUsed: '2024-09-20',
  },
  {
    id: 'vendor-4',
    businessName: 'Cool Air HVAC',
    phone: '215-555-0404',
    email: 'service@coolair.com',
    category: ['HVAC', 'Maintenance'],
    rating: 4,
    totalJobs: 4,
    notes: 'Regular maintenance provider. Always on time.',
    isPreferred: false,
    lastUsed: '2024-11-10',
  },
];

// ============================================================================
// PROJECTS - 2 complete projects with subtasks
// ============================================================================
export const DEMO_PROJECTS = [
  {
    id: 'project-1',
    name: 'Kitchen Remodel',
    description: 'Complete kitchen renovation including new cabinets, countertops, and appliances',
    status: 'in-progress' as const,
    priority: 'high' as const,
    budget: 25000,
    actualCost: 18500,
    progress: 65,
    category: 'Renovation',
    tags: ['kitchen', 'major'],
    startDate: '2024-10-01',
    endDate: '2025-01-15',
    subtasks: [
      { id: 'st-1-1', title: 'Demo existing cabinets', completed: true, order: 1, actualCost: 500 },
      { id: 'st-1-2', title: 'Install new cabinets', completed: true, assignedTo: 'ABC Contractors', estimatedCost: 8000, actualCost: 7800, order: 2 },
      { id: 'st-1-3', title: 'Install countertops', completed: true, assignedTo: 'ABC Contractors', estimatedCost: 5000, actualCost: 4900, order: 3 },
      { id: 'st-1-4', title: 'Plumbing rough-in', completed: true, assignedTo: "Joe's Plumbing", estimatedCost: 1500, actualCost: 1400, order: 4 },
      { id: 'st-1-5', title: 'Electrical work', completed: false, assignedTo: 'Elite Electric', estimatedCost: 2000, order: 5 },
      { id: 'st-1-6', title: 'Install appliances', completed: false, estimatedCost: 3000, order: 6 },
      { id: 'st-1-7', title: 'Final inspection', completed: false, order: 7 },
    ],
  },
  {
    id: 'project-2',
    name: 'Bathroom Refresh',
    description: 'Update master bathroom with new fixtures and paint',
    status: 'planning' as const,
    priority: 'medium' as const,
    budget: 5000,
    progress: 20,
    category: 'Renovation',
    tags: ['bathroom', 'minor'],
    startDate: '2025-02-01',
    subtasks: [
      { id: 'st-2-1', title: 'Select new fixtures', completed: true, order: 1 },
      { id: 'st-2-2', title: 'Choose paint colors', completed: true, order: 2 },
      { id: 'st-2-3', title: 'Order materials', completed: false, estimatedCost: 1500, order: 3 },
      { id: 'st-2-4', title: 'Remove old fixtures', completed: false, order: 4 },
      { id: 'st-2-5', title: 'Install new fixtures', completed: false, assignedTo: "Joe's Plumbing", estimatedCost: 800, order: 5 },
      { id: 'st-2-6', title: 'Paint walls', completed: false, estimatedCost: 300, order: 6 },
    ],
  },
];

// ============================================================================
// INVENTORY - Sample home items with warranties
// ============================================================================
export const DEMO_INVENTORY = [
  {
    id: 'item-1',
    name: 'Samsung Refrigerator',
    category: 'Kitchen Appliances',
    brand: 'Samsung',
    modelNumber: 'RF28R7351SR',
    serialNumber: 'SN12345678',
    location: 'Kitchen',
    purchaseDate: '2023-06-15',
    purchasePrice: 2499,
    currentValue: 2000,
    condition: 'excellent' as const,
    notes: 'French door, stainless steel, ice maker',
    photos: [],
    tags: ['appliance', 'kitchen'],
    status: 'active' as const,
    warranty: {
      provider: 'Samsung',
      startDate: '2023-06-15',
      endDate: '2026-06-15',
      coverageDetails: '3-year manufacturer warranty',
      contactPhone: '1-800-726-7864',
    },
  },
  {
    id: 'item-2',
    name: 'LG Washer',
    category: 'Laundry',
    brand: 'LG',
    modelNumber: 'WM4500HBA',
    location: 'Laundry Room',
    purchaseDate: '2024-01-10',
    purchasePrice: 1199,
    currentValue: 1000,
    condition: 'excellent' as const,
    photos: [],
    tags: ['appliance', 'laundry'],
    status: 'active' as const,
    warranty: {
      provider: 'LG',
      startDate: '2024-01-10',
      endDate: '2025-01-10',
      coverageDetails: '1-year manufacturer warranty',
    },
  },
  {
    id: 'item-3',
    name: 'Dyson V15 Vacuum',
    category: 'Tools',
    brand: 'Dyson',
    modelNumber: 'V15 Detect',
    location: 'Hall Closet',
    purchaseDate: '2024-03-20',
    purchasePrice: 749,
    currentValue: 650,
    condition: 'excellent' as const,
    photos: [],
    tags: ['cleaning', 'cordless'],
    status: 'active' as const,
    warranty: {
      provider: 'Dyson',
      startDate: '2024-03-20',
      endDate: '2026-03-20',
      coverageDetails: '2-year warranty',
      contactPhone: '1-866-693-9766',
    },
  },
  {
    id: 'item-4',
    name: 'Carrier HVAC System',
    category: 'HVAC',
    brand: 'Carrier',
    modelNumber: '24ACC636A003',
    location: 'Basement',
    purchaseDate: '2022-08-01',
    purchasePrice: 8500,
    currentValue: 7000,
    condition: 'good' as const,
    notes: '3-ton, 16 SEER, installed by Cool Air HVAC',
    photos: [],
    tags: ['hvac', 'cooling', 'heating'],
    status: 'active' as const,
    warranty: {
      provider: 'Carrier',
      startDate: '2022-08-01',
      endDate: '2032-08-01',
      coverageDetails: '10-year parts warranty',
    },
    consumableInfo: {
      isConsumable: false,
      replacementStorageLocation: 'Garage - filter shelf',
      stockQuantity: 3,
      reorderThreshold: 1,
      replacementIntervalMonths: 3,
      lastReplacedDate: '2024-09-15',
      nextReplacementDate: '2024-12-15',
    },
  },
];

// ============================================================================
// MAINTENANCE TASKS - Upcoming and completed tasks
// ============================================================================
export const DEMO_MAINTENANCE = [
  {
    id: 'maint-1',
    title: 'Replace HVAC Filter',
    description: 'Change air filter in main HVAC system',
    category: 'HVAC',
    priority: 'high' as const,
    status: 'pending' as const,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    recurrence: 'quarterly' as const,
    estimatedCost: 25,
    assignedTo: 'Homeowner',
    linkedInventoryId: 'item-4',
    partStorageHint: 'Spares in: Garage - filter shelf',
  },
  {
    id: 'maint-2',
    title: 'Clean Gutters',
    description: 'Remove leaves and debris from all gutters',
    category: 'Exterior',
    priority: 'medium' as const,
    status: 'pending' as const,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
    recurrence: 'quarterly' as const,
    estimatedCost: 150,
  },
  {
    id: 'maint-3',
    title: 'Test Smoke Detectors',
    description: 'Test all smoke and CO detectors, replace batteries if needed',
    category: 'Safety',
    priority: 'high' as const,
    status: 'completed' as const,
    dueDate: '2024-11-15',
    completedDate: '2024-11-14',
    recurrence: 'monthly' as const,
    estimatedCost: 0,
    actualCost: 15,
    notes: 'Replaced batteries in 2 detectors',
  },
  {
    id: 'maint-4',
    title: 'Service Water Heater',
    description: 'Annual water heater flush and inspection',
    category: 'Plumbing',
    priority: 'medium' as const,
    status: 'completed' as const,
    dueDate: '2024-10-01',
    completedDate: '2024-09-28',
    recurrence: 'yearly' as const,
    actualCost: 120,
    notes: 'Flushed tank, checked anode rod - all good',
    assignedTo: "Joe's Plumbing",
  },
];

// ============================================================================
// DIAGRAMS - Sample network and floor plan diagrams (Mermaid format)
// ============================================================================
export const DEMO_DIAGRAMS = [
  {
    id: 'diagram-1',
    name: 'Home Network Layout',
    description: 'Network infrastructure diagram',
    category: 'network',
    createdAt: '2024-10-01T12:00:00.000Z',
    updatedAt: '2024-11-15T10:30:00.000Z',
    data: {
      type: 'mermaid',
      code: `graph TD
    ISP[🌐 Internet] --> Router[📡 Main Router]
    Router --> Switch[🔌 Network Switch]
    Switch --> Office[💻 Office PC]
    Switch --> LivingRoom[📺 Smart TV]
    Switch --> NAS[💾 NAS Storage]
    Router --> WiFi[📶 WiFi Access Point]
    WiFi --> Phone[📱 Phones]
    WiFi --> Laptop[💻 Laptops]
    WiFi --> SmartHome[🏠 Smart Home Devices]`,
    },
  },
  {
    id: 'diagram-2',
    name: 'Electrical Panel Layout',
    description: 'Main breaker panel circuit map',
    category: 'electrical',
    createdAt: '2024-09-15T09:00:00.000Z',
    updatedAt: '2024-09-15T09:00:00.000Z',
    data: {
      type: 'mermaid',
      code: `graph TD
    Main[⚡ 200A Main Breaker] --> Panel[📦 Panel Box]
    Panel --> Kitchen[🍳 Kitchen 20A]
    Panel --> LivingRoom[🛋️ Living Room 15A]
    Panel --> MasterBed[🛏️ Master Bedroom 15A]
    Panel --> Bathroom[🚿 Bathroom 20A GFCI]
    Panel --> Garage[🚗 Garage 20A]
    Panel --> HVAC[❄️ HVAC 30A]
    Panel --> WaterHeater[🔥 Water Heater 30A]
    Panel --> Dryer[👔 Dryer 30A]`,
    },
  },
];

// ============================================================================
// DOCUMENTS - Sample uploaded documents
// ============================================================================
export const DEMO_DOCUMENTS = [
  {
    id: 'doc-1',
    name: 'Home Insurance Policy',
    type: 'pdf',
    category: 'Insurance',
    uploadDate: '2024-01-15',
    fileSize: 245000,
    description: 'Homeowner insurance policy - State Farm',
    tags: ['insurance', 'important'],
  },
  {
    id: 'doc-2',
    name: 'HVAC Manual',
    type: 'pdf',
    category: 'Manuals',
    uploadDate: '2022-08-05',
    fileSize: 1250000,
    description: 'Carrier AC unit installation and operation manual',
    tags: ['manual', 'hvac'],
    linkedInventoryId: 'item-4',
  },
];

// ============================================================================
// BUDGETS & TRANSACTIONS - Sample financial data
// ============================================================================
export const DEMO_BUDGETS = [
  {
    id: 'budget-1',
    name: 'Home Maintenance',
    amount: 500,
    period: 'monthly' as const,
    category: 'Maintenance',
    startDate: '2024-01-01',
  },
  {
    id: 'budget-2',
    name: 'Renovation Fund',
    amount: 2000,
    period: 'monthly' as const,
    category: 'Renovation',
    startDate: '2024-01-01',
  },
];

export const DEMO_TRANSACTIONS = [
  {
    id: 'txn-1',
    description: 'HVAC Filter (3-pack)',
    amount: 45,
    type: 'expense' as const,
    category: 'Maintenance',
    date: '2024-11-10',
    vendor: 'Home Depot',
  },
  {
    id: 'txn-2',
    description: 'Plumbing repair',
    amount: 250,
    type: 'expense' as const,
    category: 'Maintenance',
    date: '2024-10-15',
    vendor: "Joe's Plumbing",
  },
  {
    id: 'txn-3',
    description: 'Kitchen countertops',
    amount: 4900,
    type: 'expense' as const,
    category: 'Renovation',
    date: '2024-10-20',
    vendor: 'ABC Contractors',
  },
];

// ============================================================================
// HOME VITALS - Property information
// ============================================================================
export const DEMO_HOME_VITALS = {
  emergencyContacts: [
    { id: 'ec-1', name: 'Gas Company', phone: '1-800-555-0100', type: 'utility' as const },
    { id: 'ec-2', name: 'Electric Company', phone: '1-800-555-0200', type: 'utility' as const },
    { id: 'ec-3', name: 'Water Company', phone: '1-800-555-0300', type: 'utility' as const },
  ],
  paintColors: [
    { id: 'pc-1', room: 'Living Room', colorName: 'Agreeable Gray', brand: 'Sherwin-Williams', colorCode: 'SW 7029', hexColor: '#D1CBC1', finish: 'Eggshell' },
    { id: 'pc-2', room: 'Master Bedroom', colorName: 'Alabaster', brand: 'Sherwin-Williams', colorCode: 'SW 7008', hexColor: '#F3EFE0', finish: 'Flat' },
    { id: 'pc-3', room: 'Kitchen', colorName: 'Simply White', brand: 'Benjamin Moore', colorCode: 'OC-117', hexColor: '#F4F2ED', finish: 'Semi-Gloss' },
  ],
};

// ============================================================================
// COMPLETE DEMO DATA OBJECT
// ============================================================================
export const DEMO_DATA: StorageData = {
  version: '1.0',
  lastUpdated: new Date().toISOString(),
  items: DEMO_INVENTORY,
  vendors: DEMO_VENDORS,
  projects: DEMO_PROJECTS,
  maintenanceTasks: DEMO_MAINTENANCE,
  warranties: [],
  documents: DEMO_DOCUMENTS,
  categories: [
    'Kitchen Appliances',
    'Laundry',
    'HVAC',
    'Electronics',
    'Furniture',
    'Tools',
    'Outdoor/Garden',
    'Lighting',
    'Plumbing',
    'Security',
  ],
  customOptions: {},
  homeVitals: DEMO_HOME_VITALS,
  diagrams: DEMO_DIAGRAMS,
  aiSettings: {},
  inventoryStaging: {},
  transactions: DEMO_TRANSACTIONS,
  budgets: DEMO_BUDGETS,
};

// ============================================================================
// INITIALIZATION FUNCTION
// ============================================================================

/**
 * Initialize the app with demo data
 * This clears all existing data and replaces it with consistent demo data
 */
export const initializeDemoData = (): void => {
  const STORAGE_KEY = 'hometracker_data';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_DATA));
  
  // Also clear any separate localStorage keys that stores might use
  localStorage.removeItem('hometracker_settings');
  localStorage.removeItem('hometracker_diagrams');
  
  console.log('✅ Demo data initialized successfully');
};

/**
 * Check if app has any data
 */
export const hasExistingData = (): boolean => {
  const STORAGE_KEY = 'hometracker_data';
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return false;
  
  try {
    const parsed = JSON.parse(data);
    return (
      parsed.items?.length > 0 ||
      parsed.vendors?.length > 0 ||
      parsed.projects?.length > 0 ||
      parsed.diagrams?.length > 0
    );
  } catch {
    return false;
  }
};
