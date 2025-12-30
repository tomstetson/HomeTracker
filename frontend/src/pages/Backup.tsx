import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import {
  api,
  StorageProvider,
  BackupInfo,
  BackupSchedule,
  StorageStats,
} from '../lib/api';
import {
  HardDrive, Cloud, Download, Clock, CheckCircle, 
  RefreshCw, FileSpreadsheet, Plus, Trash2, Play, Pause,
  Shield, Server, Calendar, Archive, RotateCcw,
  Loader2, Wifi, WifiOff, Eye, EyeOff,
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

type TabType = 'overview' | 'providers' | 'schedules' | 'backups';

const CRON_PRESETS = [
  { label: 'Daily at 2 AM', value: '0 2 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Twice daily (6 AM, 6 PM)', value: '0 6,18 * * *' },
  { label: 'Weekly (Sunday 3 AM)', value: '0 3 * * 0' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
];

export default function Backup() {
  const toast = useToast();
  const confirm = useConfirm();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Data state
  const [providers, setProviders] = useState<StorageProvider[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state - WebDAV provider
  const [webdavForm, setWebdavForm] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    basePath: '/hometracker-backups',
  });

  // Form state - Backup schedule
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    provider: 'local',
    schedule: '0 2 * * *',
    retentionDays: 30,
    includeImages: false,
    compress: true,
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const online = await api.checkConnection();
      setIsOnline(online);

      if (online) {
        const [providersRes, schedulesRes, backupsRes, statsRes] = await Promise.all([
          api.getStorageProviders(),
          api.getBackupSchedules(),
          api.getBackups(),
          api.getStorageStats(),
        ]);

        if (providersRes.success) setProviders(providersRes.providers || []);
        if (schedulesRes.success) setSchedules(schedulesRes.schedules || []);
        if (backupsRes.success) setBackups(backupsRes.backups || []);
        if (statsRes.success) setStats(statsRes.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch backup data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add WebDAV provider
  const handleAddWebDAV = async () => {
    if (!webdavForm.name || !webdavForm.url || !webdavForm.username || !webdavForm.password) {
      toast.error('Missing Fields', 'Please fill in all required fields');
      return;
    }

    const result = await api.addWebDAVProvider(webdavForm.name, {
      url: webdavForm.url,
      username: webdavForm.username,
      password: webdavForm.password,
      basePath: webdavForm.basePath,
    });

    if (result.success) {
      toast.success('Provider Added', `WebDAV provider "${webdavForm.name}" configured`);
      setShowAddProvider(false);
      setWebdavForm({ name: '', url: '', username: '', password: '', basePath: '/hometracker-backups' });
      fetchData();
    } else {
      toast.error('Failed', result.error || 'Could not add provider');
    }
  };

  // Test provider connection
  const handleTestProvider = async (name: string) => {
    toast.info('Testing...', `Testing connection to ${name}`);
    const result = await api.testStorageProvider(name);
    if (result.success) {
      toast.success('Connected', `Successfully connected to ${name} (${result.latency}ms)`);
    } else {
      toast.error('Connection Failed', result.error || 'Could not connect');
    }
  };

  // Create backup schedule
  const handleCreateSchedule = async () => {
    if (!scheduleForm.name || !scheduleForm.provider) {
      toast.error('Missing Fields', 'Please fill in all required fields');
      return;
    }

    const result = await api.createBackupSchedule({
      name: scheduleForm.name,
      provider: scheduleForm.provider,
      schedule: scheduleForm.schedule,
      retentionDays: scheduleForm.retentionDays,
      includeImages: scheduleForm.includeImages,
      compress: scheduleForm.compress,
      enabled: true,
    });

    if (result.success) {
      toast.success('Schedule Created', `Backup schedule "${scheduleForm.name}" created`);
      setShowAddSchedule(false);
      setScheduleForm({ name: '', provider: 'local', schedule: '0 2 * * *', retentionDays: 30, includeImages: false, compress: true });
      fetchData();
    } else {
      toast.error('Failed', result.error || 'Could not create schedule');
    }
  };

  // Toggle schedule
  const handleToggleSchedule = async (id: string, enabled: boolean) => {
    const result = await api.toggleBackupSchedule(id, enabled);
    if (result.success) {
      toast.success(enabled ? 'Enabled' : 'Disabled', `Schedule ${enabled ? 'enabled' : 'disabled'}`);
      fetchData();
    } else {
      toast.error('Failed', result.error || 'Could not update schedule');
    }
  };

  // Run backup now
  const handleRunBackup = async (scheduleId: string) => {
    toast.info('Starting Backup', 'Backup is running...');
    const result = await api.runBackup(scheduleId);
    if (result.success) {
      toast.success('Backup Complete', 'Backup finished successfully');
      fetchData();
    } else {
      toast.error('Backup Failed', result.error || 'Could not complete backup');
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Schedule',
      message: `Are you sure you want to delete the schedule "${name}"?`,
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (!confirmed) return;

    const result = await api.deleteBackupSchedule(id);
    if (result.success) {
      toast.success('Deleted', 'Schedule removed');
      fetchData();
    } else {
      toast.error('Failed', result.error || 'Could not delete schedule');
    }
  };

  // Restore backup
  const handleRestore = async (backup: BackupInfo) => {
    const confirmed = await confirm({
      title: 'Restore Backup',
      message: `This will restore data from "${backup.filename}". Current data will be replaced. Are you sure?`,
      confirmText: 'Restore',
      variant: 'danger',
    });

    if (!confirmed) return;

    toast.info('Restoring...', 'Restore in progress');
    const result = await api.restoreBackup(backup.provider, backup.filename);
    if (result.success) {
      toast.success('Restored', 'Backup restored successfully. Please refresh the page.');
    } else {
      toast.error('Restore Failed', result.error || 'Could not restore backup');
    }
  };

  // Export local JSON
  const handleExportJSON = () => {
    try {
      const data: Record<string, any> = {
        exportDate: new Date().toISOString(),
        version: '2.0',
      };
      
      const keys = ['projects', 'items', 'vendors', 'warranties', 'maintenanceTasks', 'documents', 'homeVitals'];
      keys.forEach(key => {
        const stored = localStorage.getItem(`hometracker_${key}`);
        if (stored) {
          try { data[key] = JSON.parse(stored); } catch { /* skip */ }
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
    } catch {
      toast.error('Export Failed', 'Could not create backup file');
    }
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render tabs
  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <HardDrive className="w-4 h-4" /> },
    { key: 'providers', label: 'Providers', icon: <Server className="w-4 h-4" /> },
    { key: 'schedules', label: 'Schedules', icon: <Calendar className="w-4 h-4" /> },
    { key: 'backups', label: 'Backups', icon: <Archive className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Backup & Storage</h1>
          <p className="text-muted-foreground">Manage storage providers, schedules, and backups</p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-sm text-emerald-500">
              <Wifi className="w-4 h-4" /> Backend Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-amber-500">
              <WifiOff className="w-4 h-4" /> Backend Offline
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Server className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Providers</p>
                        <p className="text-2xl font-bold">{providers.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Schedules</p>
                        <p className="text-2xl font-bold">{schedules.filter(s => s.enabled).length} active</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Archive className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Backups</p>
                        <p className="text-2xl font-bold">{backups.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Backup</p>
                        <p className="text-sm font-medium">
                          {stats?.lastBackup ? formatDate(stats.lastBackup) : 'Never'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    Quick Actions
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Button onClick={handleExportJSON} variant="outline" className="justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      Export JSON
                    </Button>
                    <Button 
                      onClick={() => api.downloadExcel()} 
                      variant="outline" 
                      className="justify-start"
                      disabled={!isOnline}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Download Excel
                    </Button>
                    <Button 
                      onClick={() => setShowAddProvider(true)} 
                      variant="outline" 
                      className="justify-start"
                      disabled={!isOnline}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Provider
                    </Button>
                    <Button 
                      onClick={() => setShowAddSchedule(true)} 
                      variant="outline" 
                      className="justify-start"
                      disabled={!isOnline || providers.length === 0}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      New Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Best Practices */}
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Backup Best Practices
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">3-2-1 Rule</p>
                        <p className="text-sm text-muted-foreground">3 copies, 2 media types, 1 offsite</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Automate</p>
                        <p className="text-sm text-muted-foreground">Use scheduled backups for consistency</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Test Restores</p>
                        <p className="text-sm text-muted-foreground">Periodically verify backups work</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Retention Policy</p>
                        <p className="text-sm text-muted-foreground">Keep 30+ days of backup history</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Providers Tab */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Storage Providers</h3>
                <Button onClick={() => setShowAddProvider(true)} disabled={!isOnline}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add WebDAV
                </Button>
              </div>

              {providers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Server className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No storage providers configured</p>
                    <p className="text-sm text-muted-foreground mt-1">Local storage is always available by default</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {providers.map(provider => (
                    <Card key={provider.name}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              provider.type === 'local' ? "bg-slate-500/20" : "bg-blue-500/20"
                            )}>
                              {provider.type === 'local' ? (
                                <HardDrive className="w-5 h-5 text-slate-500" />
                              ) : (
                                <Cloud className="w-5 h-5 text-blue-500" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium">{provider.name}</h4>
                              <p className="text-sm text-muted-foreground capitalize">{provider.type}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded",
                            provider.connected 
                              ? "bg-emerald-500/20 text-emerald-500" 
                              : "bg-red-500/20 text-red-500"
                          )}>
                            {provider.connected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Files:</span>
                            <span className="ml-2 font-medium">{provider.stats.totalFiles}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Size:</span>
                            <span className="ml-2 font-medium">{formatSize(provider.stats.totalSize)}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTestProvider(provider.name)}
                          >
                            <Wifi className="w-4 h-4 mr-1" />
                            Test
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Schedules Tab */}
          {activeTab === 'schedules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Backup Schedules</h3>
                <Button onClick={() => setShowAddSchedule(true)} disabled={!isOnline || providers.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Schedule
                </Button>
              </div>

              {schedules.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No backup schedules configured</p>
                    <p className="text-sm text-muted-foreground mt-1">Create a schedule for automated backups</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {schedules.map(schedule => (
                    <Card key={schedule.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              schedule.enabled ? "bg-emerald-500/20" : "bg-muted"
                            )}>
                              <Calendar className={cn(
                                "w-5 h-5",
                                schedule.enabled ? "text-emerald-500" : "text-muted-foreground"
                              )} />
                            </div>
                            <div>
                              <h4 className="font-medium">{schedule.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Provider: {schedule.provider} • Cron: {schedule.schedule}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleSchedule(schedule.id, !schedule.enabled)}
                            >
                              {schedule.enabled ? (
                                <Pause className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Play className="w-4 h-4 text-emerald-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRunBackup(schedule.id)}
                              disabled={!schedule.enabled}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule.id, schedule.name)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-muted rounded">
                            Retention: {schedule.retentionDays} days
                          </span>
                          {schedule.includeImages && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-500 rounded">
                              Includes Images
                            </span>
                          )}
                          {schedule.compress && (
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-500 rounded">
                              Compressed
                            </span>
                          )}
                          {schedule.lastRun && (
                            <span className="px-2 py-1 bg-muted rounded">
                              Last: {formatDate(schedule.lastRun)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Backups Tab */}
          {activeTab === 'backups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Backup History</h3>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {backups.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No backups found</p>
                    <p className="text-sm text-muted-foreground mt-1">Create a schedule or run a manual backup</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Archive className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{backup.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {backup.provider} • {backup.sizeMB} MB • {formatDate(backup.createdAt)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(backup)}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Restore
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add WebDAV Provider Dialog */}
      <Dialog
        open={showAddProvider}
        onClose={() => setShowAddProvider(false)}
        title="Add WebDAV Provider"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect to your NAS or WebDAV server for remote backup storage.
          </p>
          
          <Input
            label="Provider Name"
            placeholder="My NAS"
            value={webdavForm.name}
            onChange={(e) => setWebdavForm(f => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="WebDAV URL"
            placeholder="https://nas.local:5006/webdav"
            value={webdavForm.url}
            onChange={(e) => setWebdavForm(f => ({ ...f, url: e.target.value }))}
          />
          <Input
            label="Username"
            value={webdavForm.username}
            onChange={(e) => setWebdavForm(f => ({ ...f, username: e.target.value }))}
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={webdavForm.password}
              onChange={(e) => setWebdavForm(f => ({ ...f, password: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Input
            label="Base Path"
            placeholder="/hometracker-backups"
            value={webdavForm.basePath}
            onChange={(e) => setWebdavForm(f => ({ ...f, basePath: e.target.value }))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddProvider(false)}>Cancel</Button>
          <Button onClick={handleAddWebDAV}>Add Provider</Button>
        </DialogFooter>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog
        open={showAddSchedule}
        onClose={() => setShowAddSchedule(false)}
        title="Create Backup Schedule"
      >
        <div className="space-y-4">
          <Input
            label="Schedule Name"
            placeholder="Daily Backup"
            value={scheduleForm.name}
            onChange={(e) => setScheduleForm(f => ({ ...f, name: e.target.value }))}
          />
          
          <div>
            <label className="block text-sm font-medium mb-1">Provider</label>
            <select
              className="w-full px-3 py-2 border rounded-lg bg-background"
              value={scheduleForm.provider}
              onChange={(e) => setScheduleForm(f => ({ ...f, provider: e.target.value }))}
            >
              {providers.map(p => (
                <option key={p.name} value={p.name}>{p.name} ({p.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Schedule</label>
            <select
              className="w-full px-3 py-2 border rounded-lg bg-background"
              value={scheduleForm.schedule}
              onChange={(e) => setScheduleForm(f => ({ ...f, schedule: e.target.value }))}
            >
              {CRON_PRESETS.map(preset => (
                <option key={preset.value} value={preset.value}>{preset.label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Retention Days"
            type="number"
            value={scheduleForm.retentionDays}
            onChange={(e) => setScheduleForm(f => ({ ...f, retentionDays: parseInt(e.target.value) || 30 }))}
          />

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={scheduleForm.includeImages}
                onChange={(e) => setScheduleForm(f => ({ ...f, includeImages: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Include Images</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={scheduleForm.compress}
                onChange={(e) => setScheduleForm(f => ({ ...f, compress: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Compress</span>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddSchedule(false)}>Cancel</Button>
          <Button onClick={handleCreateSchedule}>Create Schedule</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

