import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import {
  HardDrive, Cloud, Download, Upload, Clock, CheckCircle, 
  RefreshCw, FolderOpen, FileSpreadsheet,
  Shield, Server, ExternalLink, Copy, Terminal
} from 'lucide-react';
import { cn } from '../lib/utils';

interface BackupStatus {
  lastBackup: string | null;
  dataSize: string;
  isOnline: boolean;
  excelAvailable: boolean;
}

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export default function Backup() {
  const toast = useToast();
  const [status, setStatus] = useState<BackupStatus>({
    lastBackup: null,
    dataSize: 'Calculating...',
    isOnline: false,
    excelAvailable: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Check backend status
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const healthUrl = API_URL.startsWith('/api') ? '/api/health' : `${API_URL}/health`;
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
      
      if (response.ok) {
        setStatus(prev => ({ ...prev, isOnline: true, excelAvailable: true }));
        
        // Get data info
        const dataUrl = API_URL.startsWith('/api') ? '/api/excel/data' : `${API_URL}/api/excel/data`;
        const dataResponse = await fetch(dataUrl);
        if (dataResponse.ok) {
          const result = await dataResponse.json();
          if (result.data?.lastUpdated) {
            setStatus(prev => ({ 
              ...prev, 
              lastBackup: result.data.lastUpdated,
              dataSize: estimateDataSize(result.data)
            }));
          }
        }
      }
    } catch {
      setStatus(prev => ({ ...prev, isOnline: false }));
    }
  };

  const estimateDataSize = (data: any): string => {
    const json = JSON.stringify(data);
    const bytes = new Blob([json]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleExportJSON = () => {
    try {
      // Gather all localStorage data
      const data: Record<string, any> = {
        exportDate: new Date().toISOString(),
        version: '1.0',
      };
      
      const keys = ['projects', 'items', 'vendors', 'warranties', 'maintenanceTasks', 'documents', 'homeVitals'];
      keys.forEach(key => {
        const stored = localStorage.getItem(`hometracker_${key}`);
        if (stored) {
          try {
            data[key] = JSON.parse(stored);
          } catch {
            // Skip invalid data
          }
        }
      });

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hometracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Export Complete', 'JSON backup downloaded');
    } catch (error) {
      toast.error('Export Failed', 'Could not create backup file');
    }
  };

  const handleDownloadExcel = () => {
    if (status.isOnline) {
      const url = API_URL.startsWith('/api') ? '/api/excel/download' : `${API_URL}/api/excel/download`;
      window.open(url, '_blank');
      toast.success('Download Started', 'Excel file is being downloaded');
    } else {
      toast.error('Offline', 'Backend is not available');
    }
  };

  const handleSyncToServer = async () => {
    setIsLoading(true);
    try {
      const syncUrl = API_URL.startsWith('/api') ? '/api/excel/sync' : `${API_URL}/api/excel/sync`;
      const response = await fetch(syncUrl, { method: 'POST' });
      if (response.ok) {
        toast.success('Sync Complete', 'Data synced to server and Excel updated');
        checkStatus();
      } else {
        throw new Error('Sync failed');
      }
    } catch {
      toast.error('Sync Failed', 'Could not sync to server');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied', `${label} copied to clipboard`);
  };

  const backupCommands = {
    local: './docker/backup.sh',
    cloud: './docker/cloud-backup.sh',
    cron: '0 2 * * * /path/to/hometracker/docker/backup.sh',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Backup & Storage</h1>
        <p className="text-muted-foreground">Manage your data backups and storage options</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Backend Status */}
        <Card className={cn(
          "bg-card/50 backdrop-blur-sm border-border/50",
          status.isOnline ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-amber-500"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                status.isOnline ? "bg-emerald-500/20" : "bg-amber-500/20"
              )}>
                <Server className={cn("w-5 h-5", status.isOnline ? "text-emerald-500" : "text-amber-500")} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Backend</p>
                <p className={cn("font-semibold", status.isOnline ? "text-emerald-500" : "text-amber-500")}>
                  {status.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Backup */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="font-semibold text-foreground">
                  {status.lastBackup 
                    ? new Date(status.lastBackup).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Size */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Size</p>
                <p className="font-semibold text-foreground">{status.dataSize}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Excel Status */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                status.excelAvailable ? "bg-emerald-500/20" : "bg-muted/20"
              )}>
                <FileSpreadsheet className={cn(
                  "w-5 h-5", 
                  status.excelAvailable ? "text-emerald-500" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Excel Export</p>
                <p className={cn(
                  "font-semibold",
                  status.excelAvailable ? "text-emerald-500" : "text-muted-foreground"
                )}>
                  {status.excelAvailable ? 'Available' : 'Unavailable'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Quick Actions
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button onClick={handleExportJSON} variant="outline" className="justify-start">
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button 
              onClick={handleDownloadExcel} 
              variant="outline" 
              className="justify-start"
              disabled={!status.isOnline}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Download Excel
            </Button>
            <Button 
              onClick={handleSyncToServer} 
              variant="outline" 
              className="justify-start"
              disabled={!status.isOnline || isLoading}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Sync to Server
            </Button>
            <Button onClick={checkStatus} variant="outline" className="justify-start">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Location */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Data Location
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Primary Storage (JSON)</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard('/app/backend/data/hometracker.json', 'JSON path')}
                >
                  {copied === 'JSON path' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <code className="text-sm text-muted-foreground">/app/backend/data/hometracker.json</code>
            </div>
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Excel Export</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard('/app/backend/data/hometracker.xlsx', 'Excel path')}
                >
                  {copied === 'Excel path' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <code className="text-sm text-muted-foreground">/app/backend/data/hometracker.xlsx</code>
            </div>
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Docker Volume Mount</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard('./data:/app/backend/data', 'Volume mount')}
                >
                  {copied === 'Volume mount' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <code className="text-sm text-muted-foreground">./data:/app/backend/data</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup Commands */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Backup Commands
          </h3>
          <div className="space-y-4">
            {/* Local Backup */}
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Local Backup (run manually or via cron)</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(backupCommands.local, 'Local backup command')}
                >
                  {copied === 'Local backup command' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <code className="text-sm text-emerald-400 font-mono">{backupCommands.local}</code>
            </div>

            {/* Cloud Backup */}
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Cloud Backup (requires rclone setup)</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(backupCommands.cloud, 'Cloud backup command')}
                >
                  {copied === 'Cloud backup command' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <code className="text-sm text-blue-400 font-mono">{backupCommands.cloud}</code>
            </div>

            {/* Cron Schedule */}
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Cron Schedule (daily at 2 AM)</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyToClipboard(backupCommands.cron, 'Cron command')}
                >
                  {copied === 'Cron command' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <code className="text-sm text-amber-400 font-mono">{backupCommands.cron}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Options Info */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Storage Options
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Local */}
            <div className="p-4 border border-border/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-5 h-5 text-slate-500" />
                <span className="font-medium text-foreground">Local Disk</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Store on server's local storage. Simple and fast.
              </p>
              <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-500 rounded">Default</span>
            </div>

            {/* NAS */}
            <div className="p-4 border border-border/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-foreground">NAS Share</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Mount SMB/NFS share for centralized storage.
              </p>
              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-500 rounded">Recommended</span>
            </div>

            {/* Cloud */}
            <div className="p-4 border border-border/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-5 h-5 text-purple-500" />
                <span className="font-medium text-foreground">Cloud Sync</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Use rclone to sync with OneDrive, Google Drive, S3.
              </p>
              <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-500 rounded">Offsite</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/50">
            <a 
              href="https://github.com/yourusername/hometracker/blob/main/docs/STORAGE_OPTIONS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View full storage documentation
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Backup Best Practices
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">3-2-1 Rule</p>
                <p className="text-sm text-muted-foreground">3 copies, 2 media types, 1 offsite</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Automate</p>
                <p className="text-sm text-muted-foreground">Set up cron jobs for daily backups</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Test Restores</p>
                <p className="text-sm text-muted-foreground">Periodically verify backups work</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Version History</p>
                <p className="text-sm text-muted-foreground">Keep 30 days of daily backups</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

