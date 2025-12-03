import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import {
  Table,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Database,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SheetData {
  name: string;
  data: any[];
  columns: string[];
}

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export default function ExcelViewer() {
  const toast = useToast();
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isOnline, setIsOnline] = useState(false);

  const sheetConfig: Record<string, { color: string; icon: string }> = {
    Projects: { color: 'bg-blue-500', icon: '📋' },
    Inventory: { color: 'bg-emerald-500', icon: '📦' },
    Vendors: { color: 'bg-orange-500', icon: '👷' },
    Warranties: { color: 'bg-cyan-500', icon: '🛡️' },
    Maintenance: { color: 'bg-amber-500', icon: '🔧' },
    Documents: { color: 'bg-purple-500', icon: '📄' },
    Settings: { color: 'bg-slate-500', icon: '⚙️' },
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/excel/data`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      if (result.success) {
        const data = result.data;
        setIsOnline(true);
        setLastUpdated(data.lastUpdated);
        
        // Convert data to sheets format
        const sheetData: SheetData[] = [
          {
            name: 'Projects',
            data: data.projects || [],
            columns: ['id', 'name', 'status', 'priority', 'category', 'budget', 'actualCost', 'progress', 'startDate', 'endDate'],
          },
          {
            name: 'Inventory',
            data: data.items || [],
            columns: ['id', 'name', 'category', 'location', 'brand', 'model', 'purchaseDate', 'purchasePrice', 'condition'],
          },
          {
            name: 'Vendors',
            data: data.vendors || [],
            columns: ['id', 'businessName', 'contactPerson', 'phone', 'email', 'category', 'rating', 'totalJobs', 'isPreferred'],
          },
          {
            name: 'Warranties',
            data: data.warranties || [],
            columns: ['id', 'itemName', 'provider', 'type', 'startDate', 'endDate', 'policyNumber', 'cost'],
          },
          {
            name: 'Maintenance',
            data: data.maintenance || [],
            columns: ['id', 'title', 'category', 'priority', 'status', 'dueDate', 'recurrence', 'estimatedCost'],
          },
          {
            name: 'Documents',
            data: data.documents || [],
            columns: ['id', 'name', 'category', 'fileType', 'uploadDate', 'relatedType'],
          },
        ];
        
        setSheets(sheetData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsOnline(false);
      toast.error('Connection Error', 'Could not connect to backend API. Using local data.');
      
      // Fallback to localStorage data
      loadLocalData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocalData = () => {
    try {
      const sheetData: SheetData[] = [];
      
      const collections = [
        { key: 'projects', name: 'Projects', columns: ['id', 'name', 'status', 'priority', 'category', 'budget', 'progress'] },
        { key: 'items', name: 'Inventory', columns: ['id', 'name', 'category', 'location', 'brand', 'model'] },
        { key: 'vendors', name: 'Vendors', columns: ['id', 'businessName', 'contactPerson', 'phone', 'email'] },
        { key: 'warranties', name: 'Warranties', columns: ['id', 'itemName', 'provider', 'startDate', 'endDate'] },
        { key: 'maintenanceTasks', name: 'Maintenance', columns: ['id', 'title', 'category', 'priority', 'status', 'dueDate'] },
        { key: 'documents', name: 'Documents', columns: ['id', 'name', 'category', 'fileType', 'uploadDate'] },
      ];

      collections.forEach(({ key, name, columns }) => {
        const stored = localStorage.getItem(`hometracker_${key}`);
        if (stored) {
          sheetData.push({
            name,
            data: JSON.parse(stored),
            columns,
          });
        }
      });

      setSheets(sheetData);
    } catch (error) {
      console.error('Error loading local data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownload = async () => {
    try {
      if (isOnline) {
        // Download from API
        window.open(`${API_URL}/api/excel/download`, '_blank');
        toast.success('Download Started', 'Your Excel file is being downloaded');
      } else {
        // Export localStorage data as JSON
        const data: Record<string, any> = {
          version: '1.0',
          exportDate: new Date().toISOString(),
        };
        
        const collections = ['projects', 'items', 'vendors', 'warranties', 'maintenanceTasks', 'documents'];
        collections.forEach((key) => {
          const stored = localStorage.getItem(`hometracker_${key}`);
          if (stored) {
            data[key] = JSON.parse(stored);
          }
        });

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hometracker-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success('Export Complete', 'Data exported as JSON (Excel requires backend)');
      }
    } catch (error) {
      toast.error('Download Failed', 'Could not download the file');
    }
  };

  const handleSync = async () => {
    try {
      if (isOnline) {
        const response = await fetch(`${API_URL}/api/excel/sync`, { method: 'POST' });
        if (response.ok) {
          toast.success('Sync Complete', 'Data has been synced to Excel file');
          fetchData();
        }
      } else {
        toast.warning('Offline Mode', 'Cannot sync - backend not available');
      }
    } catch (error) {
      toast.error('Sync Failed', 'Could not sync data');
    }
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'number') {
      if (value > 1000) return value.toLocaleString();
      return value.toString();
    }
    return String(value);
  };

  const currentSheet = sheets[activeSheet];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-muted/20 rounded-lg animate-pulse" />
        <div className="h-96 bg-muted/20 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            <FileSpreadsheet className="w-8 h-8 mr-3 text-emerald-500" />
            Excel Data Viewer
          </h1>
          <p className="text-muted-foreground flex items-center">
            <Database className={cn("w-4 h-4 mr-2", isOnline ? "text-emerald-500" : "text-amber-500")} />
            {isOnline ? 'Connected to backend' : 'Using local data (offline mode)'}
            {lastUpdated && (
              <span className="ml-2 text-xs">
                • Last updated: {new Date(lastUpdated).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleSync} disabled={!isOnline}>
            <Upload className="w-4 h-4 mr-2" />
            Sync
          </Button>
          <Button onClick={handleDownload} className="flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Download {isOnline ? 'Excel' : 'JSON'}
          </Button>
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="flex space-x-1 overflow-x-auto pb-2">
        {sheets.map((sheet, index) => {
          const config = sheetConfig[sheet.name] || { color: 'bg-slate-500', icon: '📊' };
          return (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(index)}
              className={cn(
                "flex items-center px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap",
                activeSheet === index
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="mr-2">{config.icon}</span>
              {sheet.name}
              <span className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-xs",
                activeSheet === index ? "bg-white/20" : "bg-muted"
              )}>
                {sheet.data.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Data Table */}
      {currentSheet && (
        <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {currentSheet.columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {col.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentSheet.data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={currentSheet.columns.length}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      <Table className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No data in this sheet</p>
                    </td>
                  </tr>
                ) : (
                  currentSheet.data.map((row, rowIndex) => (
                    <tr
                      key={row.id || rowIndex}
                      className={cn(
                        "hover:bg-muted/20 transition-colors",
                        rowIndex % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                      )}
                    >
                      {currentSheet.columns.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-3 text-sm text-foreground whitespace-nowrap max-w-[200px] truncate"
                          title={formatCellValue(row[col])}
                        >
                          {formatCellValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-border bg-muted/10 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {currentSheet.data.length} rows
            </span>
            <span>
              {currentSheet.columns.length} columns
            </span>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-2 flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2 text-emerald-500" />
            About Excel Export
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            All your HomeTracker data is automatically synced to an Excel file on the server.
            This file is updated every time you make changes in the app.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Each data type (Projects, Inventory, etc.) has its own sheet</li>
            <li>• Data is formatted with proper headers and styling</li>
            <li>• Download anytime for backup or external use</li>
            <li>• Import Excel files to restore or migrate data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


