import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

// Data directory for persistence
const DATA_DIR = path.join(__dirname, '../../data');
const EXCEL_FILE = path.join(DATA_DIR, 'hometracker.xlsx');
const JSON_FILE = path.join(DATA_DIR, 'hometracker.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Data structure for all collections
export interface HomeTrackerData {
  projects: any[];
  items: any[];
  vendors: any[];
  warranties: any[];
  maintenance: any[];
  documents: any[];
  settings: any;
  customOptions: any;
  homeVitals: any;
  homeValues: any[];
  paintColors: any[];
  emergencyContacts: any[];
  lastUpdated: string;
}

// Default data structure
const DEFAULT_DATA: HomeTrackerData = {
  projects: [],
  items: [],
  vendors: [],
  warranties: [],
  maintenance: [],
  documents: [],
  settings: {},
  customOptions: {},
  homeVitals: {},
  homeValues: [],
  paintColors: [],
  emergencyContacts: [],
  lastUpdated: new Date().toISOString(),
};

// Excel column definitions for each sheet
const SHEET_CONFIGS: Record<string, { columns: Partial<ExcelJS.Column>[]; headerColor: string }> = {
  Projects: {
    headerColor: 'FF4472C4',
    columns: [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Budget', key: 'budget', width: 12 },
      { header: 'Actual Cost', key: 'actualCost', width: 12 },
      { header: 'Progress %', key: 'progress', width: 12 },
      { header: 'Start Date', key: 'startDate', width: 12 },
      { header: 'End Date', key: 'endDate', width: 12 },
      { header: 'Tags', key: 'tags', width: 25 },
    ],
  },
  Inventory: {
    headerColor: 'FF70AD47',
    columns: [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Brand', key: 'brand', width: 15 },
      { header: 'Model', key: 'model', width: 15 },
      { header: 'Serial #', key: 'serialNumber', width: 20 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 12 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 15 },
      { header: 'Condition', key: 'condition', width: 12 },
    ],
  },
  Vendors: {
    headerColor: 'FFED7D31',
    columns: [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Business Name', key: 'businessName', width: 30 },
      { header: 'Contact Person', key: 'contactPerson', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Website', key: 'website', width: 30 },
      { header: 'Address', key: 'address', width: 35 },
      { header: 'Categories', key: 'category', width: 25 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Total Jobs', key: 'totalJobs', width: 12 },
      { header: 'Preferred', key: 'isPreferred', width: 10 },
      { header: 'Notes', key: 'notes', width: 40 },
    ],
  },
  Warranties: {
    headerColor: 'FF5B9BD5',
    columns: [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Provider', key: 'provider', width: 25 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Start Date', key: 'startDate', width: 12 },
      { header: 'End Date', key: 'endDate', width: 12 },
      { header: 'Policy #', key: 'policyNumber', width: 20 },
      { header: 'Cost', key: 'cost', width: 12 },
      { header: 'Coverage', key: 'coverageDetails', width: 40 },
      { header: 'Claim Phone', key: 'claimPhone', width: 15 },
      { header: 'Claim Email', key: 'claimEmail', width: 25 },
      { header: 'Notes', key: 'notes', width: 40 },
    ],
  },
  Maintenance: {
    headerColor: 'FFFFC000',
    columns: [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Due Date', key: 'dueDate', width: 12 },
      { header: 'Recurrence', key: 'recurrence', width: 12 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Est. Cost', key: 'estimatedCost', width: 12 },
      { header: 'Actual Cost', key: 'actualCost', width: 12 },
      { header: 'Completed', key: 'completedDate', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
    ],
  },
  Documents: {
    headerColor: 'FF7030A0',
    columns: [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'File Type', key: 'fileType', width: 10 },
      { header: 'File Size', key: 'fileSize', width: 12 },
      { header: 'Upload Date', key: 'uploadDate', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Related To', key: 'relatedType', width: 15 },
      { header: 'Related ID', key: 'relatedTo', width: 15 },
      { header: 'URL', key: 'url', width: 40 },
      { header: 'Tags', key: 'tags', width: 25 },
      { header: 'Notes', key: 'notes', width: 40 },
    ],
  },
  Settings: {
    headerColor: 'FF808080',
    columns: [
      { header: 'Property', key: 'property', width: 25 },
      { header: 'Value', key: 'value', width: 40 },
    ],
  },
  HomeValues: {
    headerColor: 'FF228B22',
    columns: [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Source', key: 'source', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 },
    ],
  },
  PaintColors: {
    headerColor: 'FFDA70D6',
    columns: [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Room', key: 'room', width: 20 },
      { header: 'Color Name', key: 'colorName', width: 25 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Color Code', key: 'colorCode', width: 15 },
      { header: 'Hex', key: 'hexColor', width: 10 },
      { header: 'Finish', key: 'finish', width: 15 },
    ],
  },
  EmergencyContacts: {
    headerColor: 'FFDC143C',
    columns: [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Notes', key: 'notes', width: 40 },
    ],
  },
  SalesHistory: {
    headerColor: 'FF9370DB',
    columns: [
      { header: 'Item ID', key: 'itemId', width: 15 },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Sale Date', key: 'saleDate', width: 12 },
      { header: 'Sale Price', key: 'salePrice', width: 12 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 15 },
      { header: 'Profit/Loss', key: 'profitLoss', width: 12 },
      { header: 'Buyer', key: 'buyer', width: 20 },
      { header: 'Platform', key: 'platform', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 },
    ],
  },
};

class ExcelService {
  private data: HomeTrackerData;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;

  constructor() {
    this.data = this.loadData();
  }

  // Load data from JSON file (faster than Excel for reads)
  private loadData(): HomeTrackerData {
    try {
      if (fs.existsSync(JSON_FILE)) {
        const raw = fs.readFileSync(JSON_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    return { ...DEFAULT_DATA };
  }

  // Save data to both JSON and Excel (debounced)
  private saveData(): void {
    // Mark as dirty and debounce saves
    this.isDirty = true;
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce: wait 500ms after last change before saving
    this.saveTimeout = setTimeout(async () => {
      if (!this.isDirty) return;
      
      try {
        this.data.lastUpdated = new Date().toISOString();
        
        // Save to JSON (fast, primary storage)
        fs.writeFileSync(JSON_FILE, JSON.stringify(this.data, null, 2));
        
        // Save to Excel (for export/viewing)
        await this.syncToExcel();
        
        this.isDirty = false;
        console.log('💾 Data saved to JSON and Excel');
      } catch (error) {
        console.error('Error saving data:', error);
      }
    }, 500);
  }

  // Sync all data to Excel file
  async syncToExcel(): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'HomeTracker';
    workbook.lastModifiedBy = 'HomeTracker';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Create each sheet
    this.createSheet(workbook, 'Projects', this.data.projects);
    this.createSheet(workbook, 'Inventory', this.data.items);
    this.createSheet(workbook, 'Vendors', this.data.vendors);
    this.createSheet(workbook, 'Warranties', this.data.warranties);
    this.createSheet(workbook, 'Maintenance', this.data.maintenance);
    this.createSheet(workbook, 'Documents', this.data.documents);
    this.createSheet(workbook, 'HomeValues', this.data.homeValues || []);
    this.createSheet(workbook, 'PaintColors', this.data.paintColors || []);
    this.createSheet(workbook, 'EmergencyContacts', this.data.emergencyContacts || []);
    
    // Create sales history from sold items
    const salesHistory = (this.data.items || [])
      .filter((item: any) => item.status === 'sold' && item.sale)
      .map((item: any) => ({
        itemId: item.id,
        itemName: item.name,
        saleDate: item.sale?.saleDate,
        salePrice: item.sale?.salePrice,
        purchasePrice: item.purchasePrice,
        profitLoss: (item.sale?.salePrice || 0) - (item.purchasePrice || 0),
        buyer: item.sale?.buyer,
        platform: item.sale?.platform,
        notes: item.sale?.notes,
      }));
    this.createSheet(workbook, 'SalesHistory', salesHistory);
    
    this.createSettingsSheet(workbook);

    await workbook.xlsx.writeFile(EXCEL_FILE);
  }

  // Create a data sheet with proper formatting
  private createSheet(workbook: ExcelJS.Workbook, name: string, data: any[]): void {
    const config = SHEET_CONFIGS[name];
    if (!config) return;

    const sheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    // Set columns
    sheet.columns = config.columns;

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: config.headerColor },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add data rows
    data.forEach((item) => {
      const rowData: Record<string, any> = { ...item };
      
      // Convert arrays to comma-separated strings
      if (Array.isArray(rowData.tags)) {
        rowData.tags = rowData.tags.join(', ');
      }
      if (Array.isArray(rowData.category)) {
        rowData.category = rowData.category.join(', ');
      }
      
      sheet.addRow(rowData);
    });

    // Auto-filter
    if (data.length > 0) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: data.length + 1, column: config.columns.length },
      };
    }

    // Add alternating row colors
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }
    });
  }

  // Create settings sheet
  private createSettingsSheet(workbook: ExcelJS.Workbook): void {
    const config = SHEET_CONFIGS['Settings'];
    const sheet = workbook.addWorksheet('Settings');
    
    sheet.columns = config.columns;

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: config.headerColor },
    };

    // Add settings as key-value pairs
    const settings = this.data.settings;
    const settingsData = [
      { property: 'Address', value: settings.address },
      { property: 'City', value: settings.city },
      { property: 'State', value: settings.state },
      { property: 'ZIP Code', value: settings.zipCode },
      { property: 'Property Type', value: settings.propertyType },
      { property: 'Year Built', value: settings.yearBuilt },
      { property: 'Square Footage', value: settings.squareFootage },
      { property: 'Lot Size', value: settings.lotSize },
      { property: 'Bedrooms', value: settings.bedrooms },
      { property: 'Bathrooms', value: settings.bathrooms },
      { property: 'Purchase Date', value: settings.purchaseDate },
      { property: 'Purchase Price', value: settings.purchasePrice },
      { property: 'Current Value', value: settings.currentValue },
      { property: 'Owner Name', value: settings.ownerName },
      { property: 'Owner Email', value: settings.ownerEmail },
      { property: 'Owner Phone', value: settings.ownerPhone },
      { property: 'Last Updated', value: this.data.lastUpdated },
    ];

    settingsData.forEach((item) => sheet.addRow(item));
  }

  // Get Excel file path
  getExcelPath(): string {
    return EXCEL_FILE;
  }

  // Get Excel file as buffer for download
  async getExcelBuffer(): Promise<Buffer> {
    await this.syncToExcel();
    return fs.readFileSync(EXCEL_FILE);
  }

  // Import data from Excel file
  async importFromExcel(buffer: Buffer): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    // Import each sheet
    const projectsSheet = workbook.getWorksheet('Projects');
    if (projectsSheet) {
      this.data.projects = this.sheetToArray(projectsSheet);
    }

    const itemsSheet = workbook.getWorksheet('Inventory');
    if (itemsSheet) {
      this.data.items = this.sheetToArray(itemsSheet);
    }

    const vendorsSheet = workbook.getWorksheet('Vendors');
    if (vendorsSheet) {
      this.data.vendors = this.sheetToArray(vendorsSheet);
    }

    const warrantiesSheet = workbook.getWorksheet('Warranties');
    if (warrantiesSheet) {
      this.data.warranties = this.sheetToArray(warrantiesSheet);
    }

    const maintenanceSheet = workbook.getWorksheet('Maintenance');
    if (maintenanceSheet) {
      this.data.maintenance = this.sheetToArray(maintenanceSheet);
    }

    const documentsSheet = workbook.getWorksheet('Documents');
    if (documentsSheet) {
      this.data.documents = this.sheetToArray(documentsSheet);
    }

    this.saveData();
  }

  // Convert Excel sheet to array of objects
  private sheetToArray(sheet: ExcelJS.Worksheet): any[] {
    const data: any[] = [];
    const headers: string[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Get headers
        row.eachCell((cell) => {
          headers.push(String(cell.value || '').toLowerCase().replace(/\s+/g, ''));
        });
      } else {
        // Get data
        const obj: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          const key = headers[colNumber - 1];
          if (key) {
            let value: any = cell.value;
            // Handle comma-separated values for tags/categories
            if (key === 'tags' || key === 'categories') {
              value = String(value || '').split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            obj[key] = value;
          }
        });
        if (Object.keys(obj).length > 0) {
          data.push(obj);
        }
      }
    });

    return data;
  }

  // CRUD Operations for all collections

  // Projects
  getProjects(): any[] {
    return this.data.projects;
  }

  getProject(id: string): any | undefined {
    return this.data.projects.find((p) => p.id === id);
  }

  createProject(project: any): any {
    this.data.projects.push(project);
    this.saveData();
    return project;
  }

  updateProject(id: string, updates: any): any | undefined {
    const index = this.data.projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.data.projects[index] = { ...this.data.projects[index], ...updates };
      this.saveData();
      return this.data.projects[index];
    }
    return undefined;
  }

  deleteProject(id: string): boolean {
    const index = this.data.projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.data.projects.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Items
  getItems(): any[] {
    return this.data.items;
  }

  getItem(id: string): any | undefined {
    return this.data.items.find((i) => i.id === id);
  }

  createItem(item: any): any {
    this.data.items.push(item);
    this.saveData();
    return item;
  }

  updateItem(id: string, updates: any): any | undefined {
    const index = this.data.items.findIndex((i) => i.id === id);
    if (index !== -1) {
      this.data.items[index] = { ...this.data.items[index], ...updates };
      this.saveData();
      return this.data.items[index];
    }
    return undefined;
  }

  deleteItem(id: string): boolean {
    const index = this.data.items.findIndex((i) => i.id === id);
    if (index !== -1) {
      this.data.items.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Vendors
  getVendors(): any[] {
    return this.data.vendors;
  }

  getVendor(id: string): any | undefined {
    return this.data.vendors.find((v) => v.id === id);
  }

  createVendor(vendor: any): any {
    this.data.vendors.push(vendor);
    this.saveData();
    return vendor;
  }

  updateVendor(id: string, updates: any): any | undefined {
    const index = this.data.vendors.findIndex((v) => v.id === id);
    if (index !== -1) {
      this.data.vendors[index] = { ...this.data.vendors[index], ...updates };
      this.saveData();
      return this.data.vendors[index];
    }
    return undefined;
  }

  deleteVendor(id: string): boolean {
    const index = this.data.vendors.findIndex((v) => v.id === id);
    if (index !== -1) {
      this.data.vendors.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Warranties
  getWarranties(): any[] {
    return this.data.warranties;
  }

  getWarranty(id: string): any | undefined {
    return this.data.warranties.find((w) => w.id === id);
  }

  createWarranty(warranty: any): any {
    this.data.warranties.push(warranty);
    this.saveData();
    return warranty;
  }

  updateWarranty(id: string, updates: any): any | undefined {
    const index = this.data.warranties.findIndex((w) => w.id === id);
    if (index !== -1) {
      this.data.warranties[index] = { ...this.data.warranties[index], ...updates };
      this.saveData();
      return this.data.warranties[index];
    }
    return undefined;
  }

  deleteWarranty(id: string): boolean {
    const index = this.data.warranties.findIndex((w) => w.id === id);
    if (index !== -1) {
      this.data.warranties.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Maintenance
  getMaintenanceTasks(): any[] {
    return this.data.maintenance;
  }

  getMaintenanceTask(id: string): any | undefined {
    return this.data.maintenance.find((m) => m.id === id);
  }

  createMaintenanceTask(task: any): any {
    this.data.maintenance.push(task);
    this.saveData();
    return task;
  }

  updateMaintenanceTask(id: string, updates: any): any | undefined {
    const index = this.data.maintenance.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.data.maintenance[index] = { ...this.data.maintenance[index], ...updates };
      this.saveData();
      return this.data.maintenance[index];
    }
    return undefined;
  }

  deleteMaintenanceTask(id: string): boolean {
    const index = this.data.maintenance.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.data.maintenance.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Documents
  getDocuments(): any[] {
    return this.data.documents;
  }

  getDocument(id: string): any | undefined {
    return this.data.documents.find((d) => d.id === id);
  }

  createDocument(doc: any): any {
    this.data.documents.push(doc);
    this.saveData();
    return doc;
  }

  updateDocument(id: string, updates: any): any | undefined {
    const index = this.data.documents.findIndex((d) => d.id === id);
    if (index !== -1) {
      this.data.documents[index] = { ...this.data.documents[index], ...updates };
      this.saveData();
      return this.data.documents[index];
    }
    return undefined;
  }

  deleteDocument(id: string): boolean {
    const index = this.data.documents.findIndex((d) => d.id === id);
    if (index !== -1) {
      this.data.documents.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // Settings
  getSettings(): any {
    return this.data.settings;
  }

  updateSettings(updates: any): any {
    this.data.settings = { ...this.data.settings, ...updates };
    this.saveData();
    return this.data.settings;
  }

  // Bulk operations
  getAllData(): HomeTrackerData {
    return this.data;
  }

  setAllData(data: HomeTrackerData): void {
    this.data = data;
    this.saveData();
  }

  // Force save (for shutdown)
  async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(JSON_FILE, JSON.stringify(this.data, null, 2));
    await this.syncToExcel();
    console.log('💾 Force saved data');
  }
}

// Singleton instance
export const excelService = new ExcelService();

