import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../lib/theme';
import {
  Sun,
  Moon,
  Database,
  Download,
  Upload,
  Trash2,
  Settings as SettingsIcon,
  HardDrive,
  Cloud,
  FileSpreadsheet,
  Key,
  ExternalLink,
  Info,
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Settings() {
  const toast = useToast();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [apiEnabled, setApiEnabled] = useState(false);

  const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

  // Load API setting from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('hometracker_api_enabled');
    if (stored) {
      setApiEnabled(JSON.parse(stored));
    }
  }, []);

  // Export all data
  const exportAllData = () => {
    try {
      const data: Record<string, any> = {
        version: '1.0',
        exportDate: new Date().toISOString(),
      };

      // Get all collections from localStorage
      const collections = ['items', 'vendors', 'projects', 'maintenanceTasks', 'warranties', 'documents', 'settings', 'homeVitals'];
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
      a.download = `hometracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Export Complete', 'Your data has been downloaded');
    } catch (error) {
      toast.error('Export Failed', 'Failed to export data');
    }
  };

  // Import data
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Restore collections
        const collections = ['items', 'vendors', 'projects', 'maintenanceTasks', 'warranties', 'documents', 'settings', 'homeVitals'];
        collections.forEach((key) => {
          if (data[key]) {
            localStorage.setItem(`hometracker_${key}`, JSON.stringify(data[key]));
          }
        });

        toast.success('Import Complete', 'Data has been restored. Please refresh the page.');
      } catch (error) {
        toast.error('Import Failed', 'Invalid backup file');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  // Clear all data
  const clearAllData = () => {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
      const keys = ['items', 'vendors', 'projects', 'maintenanceTasks', 'warranties', 'documents', 'settings', 'homeVitals'];
      keys.forEach((key) => localStorage.removeItem(`hometracker_${key}`));
      toast.success('Data Cleared', 'All data has been deleted. Please refresh the page.');
    }
  };

  // Toggle API setting
  const handleApiToggle = (enabled: boolean) => {
    setApiEnabled(enabled);
    localStorage.setItem('hometracker_api_enabled', JSON.stringify(enabled));
    toast.info(
      enabled ? 'API Enabled' : 'API Disabled',
      enabled ? 'External API calls are now allowed' : 'No external API calls will be made'
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">App configuration and data management</p>
      </div>

      {/* Appearance */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2" />
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Theme</p>
              <p className="text-sm text-muted-foreground">Choose between light and dark mode</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors",
                  resolvedTheme === 'light'
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/20 text-muted-foreground border-border hover:bg-muted/40"
                )}
              >
                <Sun className="w-4 h-4" />
                <span>Light</span>
              </button>
              <button
                onClick={toggleTheme}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors",
                  resolvedTheme === 'dark'
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/20 text-muted-foreground border-border hover:bg-muted/40"
                )}
              >
                <Moon className="w-4 h-4" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API & Privacy */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Key className="w-5 h-5 mr-2" />
            API & Privacy
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Control external API connections for home value tracking and other features.
          </p>
          
          <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Allow External API Calls</p>
                <p className="text-sm text-muted-foreground">
                  {apiEnabled 
                    ? '⚠️ Data may leave your homelab when fetching home values'
                    : '✅ All data stays local - no external calls made'
                  }
                </p>
              </div>
              <button
                onClick={() => handleApiToggle(!apiEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  apiEnabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    apiEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>

          {apiEnabled && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Note:</strong> API keys are stored locally. Configure them in Home Info → Value tab.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data & Backup */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Data & Backup
          </h2>
          
          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button onClick={exportAllData} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".json" onChange={importData} className="hidden" />
                <span className="inline-flex items-center px-3 py-1.5 border border-input bg-background hover:bg-accent rounded-md text-sm font-medium transition-colors">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </span>
              </label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`${API_URL}/api/excel/download`, '_blank')}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download Excel
              </Button>
              <Button onClick={clearAllData} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Storage Location (for Docker deployments) */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border/50 mb-4">
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Storage Location
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              For Docker deployments, data is stored in the mounted volume:
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                <span className="text-muted-foreground">JSON Data:</span>
                <span className="text-foreground">/app/backend/data/hometracker.json</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                <span className="text-muted-foreground">Excel Export:</span>
                <span className="text-foreground">/app/backend/data/hometracker.xlsx</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                <span className="text-muted-foreground">Volume Mount:</span>
                <span className="text-foreground">./data:/app/backend/data</span>
              </div>
            </div>
          </div>

          {/* Backup Best Practices */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-500" />
              Backup Best Practices
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Export JSON weekly as a minimum</li>
              <li>Use the backup scripts in <code className="text-foreground">/docker/backup.sh</code></li>
              <li>Set up rclone for automatic cloud sync (OneDrive, Google Drive, etc.)</li>
              <li>Keep backups in multiple locations (3-2-1 rule)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            About HomeTracker
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            HomeTracker is your complete home management solution. Track inventory, manage projects, 
            schedule maintenance, store documents, and never miss a warranty claim.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="px-2 py-1 bg-muted/30 rounded">Version 1.3.0</span>
            <a 
              href="https://github.com/tomstetson/HomeTracker" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              GitHub
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
