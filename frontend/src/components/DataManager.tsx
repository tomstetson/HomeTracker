import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Dialog, DialogFooter } from './ui/Dialog';
import { useToast } from './ui/Toast';
import { exportData, importData, clearAllData } from '../lib/storage';
import { initializeDemoData } from '../lib/demoData';
import { dataSyncService, useDataSync } from '../lib/dataSync';
import { 
  Download, Upload, Trash2, AlertTriangle, 
  Cloud, CloudOff, RefreshCw, FileSpreadsheet,
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';

interface DataManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataManager({ isOpen, onClose }: DataManagerProps) {
  const toast = useToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { status, checkConnection } = useDataSync();

  // Check connection when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  const handleExport = () => {
    try {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hometracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Data Exported', 'Successfully downloaded backup file');
    } catch (error) {
      toast.error('Export Failed', 'Failed to export data');
      console.error('Export error:', error);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const success = importData(text);
        if (success) {
          toast.success('Data Imported', 'Successfully imported data. Refreshing...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toast.error('Import Failed', 'Invalid file format');
        }
      } catch (error) {
        toast.error('Import Failed', 'Failed to read file');
        console.error('Import error:', error);
      }
    };
    input.click();
  };

  const handleSyncToBackend = async () => {
    setIsSyncing(true);
    try {
      const result = await dataSyncService.syncToBackend();
      if (result.success) {
        toast.success('Sync Complete', 'Data synced to server and Excel file updated');
      } else {
        toast.error('Sync Failed', result.message);
      }
    } catch (error) {
      toast.error('Sync Failed', 'Could not sync data');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncFromBackend = async () => {
    setIsSyncing(true);
    try {
      const result = await dataSyncService.syncFromBackend();
      if (result.success) {
        toast.success('Import Complete', 'Data imported from server. Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error('Import Failed', result.message);
      }
    } catch (error) {
      toast.error('Import Failed', 'Could not import data from server');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClear = () => {
    try {
      clearAllData();
      toast.success('Data Cleared', 'All data has been cleared. Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('Clear Failed', 'Failed to clear data');
      console.error('Clear error:', error);
    }
  };

  const handleLoadDemoData = () => {
    try {
      initializeDemoData();
      toast.success('Demo Data Loaded', 'Sample data has been loaded. Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('Load Failed', 'Failed to load demo data');
      console.error('Demo data error:', error);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        title="Data Management"
        description="Sync, export, import, or clear your data"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Backend Status */}
          <div className={cn(
            "p-4 rounded-lg border flex items-center justify-between",
            status.isOnline 
              ? "border-emerald-500/30 bg-emerald-500/10" 
              : "border-amber-500/30 bg-amber-500/10"
          )}>
            <div className="flex items-center gap-3">
              {status.isOnline ? (
                <Cloud className="w-5 h-5 text-emerald-500" />
              ) : (
                <CloudOff className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <p className={cn(
                  "font-medium",
                  status.isOnline ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                )}>
                  {status.isOnline ? 'Backend Connected' : 'Backend Offline'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status.isOnline 
                    ? 'You can sync data to the Excel file' 
                    : 'Data is stored locally. Start the backend to sync.'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkConnection}
              className="flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Sync to Backend */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold text-foreground">Sync to Excel</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Push your local data to the backend server. This updates the hometracker.xlsx
                  file that you can download anytime.
                </p>
                {status.lastSync && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last synced: {new Date(status.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
              <Button 
                onClick={handleSyncToBackend} 
                size="sm" 
                className="ml-4"
                disabled={!status.isOnline || isSyncing}
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isSyncing ? 'Syncing...' : 'Sync to Server'}
              </Button>
            </div>
          </div>

          {/* Import from Backend */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Cloud className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-foreground">Import from Server</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pull data from the backend server to your local browser. This will replace
                  your current local data.
                </p>
              </div>
              <Button 
                onClick={handleSyncFromBackend} 
                variant="outline" 
                size="sm" 
                className="ml-4"
                disabled={!status.isOnline || isSyncing}
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Import
              </Button>
            </div>
          </div>

          <hr className="border-border" />

          {/* Local Export */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Download className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-foreground">Export JSON Backup</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Download a JSON backup of all your local data. Use this for manual backups
                  or transferring data between devices.
                </p>
              </div>
              <Button onClick={handleExport} variant="outline" size="sm" className="ml-4">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Local Import */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Upload className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-foreground">Import JSON Backup</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Restore data from a previously exported JSON file. This will replace all
                  current local data.
                </p>
              </div>
              <Button onClick={handleImport} variant="outline" size="sm" className="ml-4">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </div>
          </div>

          <hr className="border-border" />

          {/* Load Demo Data */}
          <div className="p-4 border border-purple-500/30 bg-purple-500/5 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Database className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-purple-700 dark:text-purple-300">Load Demo Data</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Replace all data with sample demo data for testing. Includes sample vendors,
                  projects, inventory items, maintenance tasks, and diagrams.
                </p>
              </div>
              <Button
                onClick={() => setShowDemoConfirm(true)}
                variant="outline"
                size="sm"
                className="ml-4 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
              >
                <Database className="w-4 h-4 mr-2" />
                Load Demo
              </Button>
            </div>
          </div>

          {/* Clear */}
          <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <h3 className="font-semibold text-destructive">Clear All Data</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all local data. This action cannot be undone. Make sure
                  to export or sync your data first!
                </p>
              </div>
              <Button
                onClick={() => setShowClearConfirm(true)}
                variant="outline"
                size="sm"
                className="ml-4 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <Dialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Confirm Clear All Data"
        description="Are you absolutely sure?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">This will permanently delete:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>All inventory items</li>
                <li>All vendors</li>
                <li>All projects</li>
                <li>All maintenance tasks</li>
                <li>All warranties</li>
                <li>All documents</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Make sure you've exported or synced your data before proceeding.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleClear();
              setShowClearConfirm(false);
              onClose();
            }}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Yes, Clear Everything
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Demo Data Confirmation Dialog */}
      <Dialog
        open={showDemoConfirm}
        onClose={() => setShowDemoConfirm(false)}
        title="Load Demo Data"
        description="Replace current data with sample data?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <Database className="w-6 h-6 text-purple-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">This will replace all data with:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>4 sample vendors</li>
                <li>2 projects with subtasks</li>
                <li>4 inventory items with warranties</li>
                <li>4 maintenance tasks</li>
                <li>2 sample diagrams</li>
                <li>Sample budgets & transactions</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Your current data will be replaced. Export first if you want to keep it.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDemoConfirm(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleLoadDemoData();
              setShowDemoConfirm(false);
              onClose();
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Database className="w-4 h-4 mr-2" />
            Load Demo Data
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
