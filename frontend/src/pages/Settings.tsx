import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTheme } from '../lib/theme';
import { useAISettingsStore, AI_PROVIDER_INFO, AIProvider } from '../store/aiSettingsStore';
import { usePropertyValueStore } from '../store/propertyValueStore';
import { PropertyValueConfig } from '../lib/propertyValueService';
import { useNotificationStore, NotificationChannel, requestNotificationPermission } from '../store/notificationStore';
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
  Bot,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Sparkles,
  Search,
  FileText,
  Wrench,
  BrainCircuit,
  Calendar,
  TrendingUp,
  Bell,
  Smartphone,
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Settings() {
  const toast = useToast();
  const confirm = useConfirm();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [apiEnabled, setApiEnabled] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  
  // AI Settings
  const { 
    settings: aiSettings, 
    setActiveProvider, 
    updateProviderConfig,
    updateFeatureToggle,
    setAssistantSchedule,
  } = useAISettingsStore();
  
  // Property Value Settings
  const {
    config: propertyValueConfig,
    updateConfig: updatePropertyValueConfig,
  } = usePropertyValueStore();
  
  // Notification Settings
  const {
    preferences: notificationPrefs,
    updatePreferences: updateNotificationPrefs,
  } = useNotificationStore();

  // Dynamically determine API URL based on current browser location
  const API_URL = (() => {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) return envUrl;
    if (typeof window !== 'undefined') {
      const { hostname } = window.location;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}:3001`;
      }
    }
    return 'http://localhost:3001';
  })();
  
  // Toggle API key visibility
  const toggleKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

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
  const clearAllData = async () => {
    const confirmed = await confirm({
      title: 'Delete All Data?',
      message: 'This will permanently delete all your HomeTracker data including inventory, projects, maintenance records, and more. This action cannot be undone.',
      confirmText: 'Delete Everything',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
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

      {/* AI Settings */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Bot className="w-5 h-5 mr-2" />
            AI Assistant (BYOK)
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Bring Your Own Key - Connect your preferred LLM provider for AI-powered features like diagram assistance.
          </p>

          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-3">
              Active AI Provider
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['none', 'openai', 'anthropic', 'gemini'] as AIProvider[]).map((provider) => {
                const info = AI_PROVIDER_INFO[provider];
                const isActive = aiSettings.activeProvider === provider;
                const config = provider !== 'none' ? aiSettings.providers[provider] : null;
                const hasKey = config?.apiKey && config.apiKey.length > 0;
                
                return (
                  <button
                    key={provider}
                    onClick={() => setActiveProvider(provider)}
                    className={cn(
                      "relative p-3 rounded-lg border-2 text-left transition-all",
                      isActive 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <div className="font-medium text-sm">{info.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {info.description}
                    </div>
                    {provider !== 'none' && (
                      <div className="absolute top-2 right-2">
                        {hasKey ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-muted-foreground/50" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider Configuration */}
          {aiSettings.activeProvider !== 'none' && (
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">
                  {AI_PROVIDER_INFO[aiSettings.activeProvider].name} Configuration
                </h3>
                <div className="flex gap-2">
                  <a
                    href={AI_PROVIDER_INFO[aiSettings.activeProvider].keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Get API Key <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={AI_PROVIDER_INFO[aiSettings.activeProvider].docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                  >
                    Docs <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKeys[aiSettings.activeProvider] ? 'text' : 'password'}
                    placeholder="Enter your API key"
                    value={aiSettings.providers[aiSettings.activeProvider].apiKey}
                    onChange={(e) => updateProviderConfig(aiSettings.activeProvider, { 
                      apiKey: e.target.value,
                      enabled: e.target.value.length > 0 
                    })}
                    className="w-full px-3 py-2 pr-10 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility(aiSettings.activeProvider)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKeys[aiSettings.activeProvider] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  🔒 Stored locally in your browser. Never sent to our servers.
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Model
                </label>
                <select
                  value={aiSettings.providers[aiSettings.activeProvider].model}
                  onChange={(e) => updateProviderConfig(aiSettings.activeProvider, { 
                    model: e.target.value 
                  })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {AI_PROVIDER_INFO[aiSettings.activeProvider].models.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              {aiSettings.providers[aiSettings.activeProvider].apiKey && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">
                    Ready to use AI features
                  </span>
                </div>
              )}
            </div>
          )}

          {/* AI Features Toggle */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-medium text-foreground">AI Features</h3>
            
            {/* Diagram AI Assistant */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Diagram AI Assistant</p>
                  <p className="text-xs text-muted-foreground">
                    Get help creating and fixing Mermaid diagrams
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateFeatureToggle('enableDiagramAssistant', !aiSettings.features.enableDiagramAssistant)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  aiSettings.features.enableDiagramAssistant ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    aiSettings.features.enableDiagramAssistant ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Natural Language Search */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Natural Language Search</p>
                  <p className="text-xs text-muted-foreground">
                    Ask questions about your home in plain English (Ctrl+K)
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateFeatureToggle('enableNaturalLanguageSearch', !aiSettings.features.enableNaturalLanguageSearch)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  aiSettings.features.enableNaturalLanguageSearch ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    aiSettings.features.enableNaturalLanguageSearch ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Document Intelligence */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Document Intelligence</p>
                  <p className="text-xs text-muted-foreground">
                    Auto-extract data from receipts, invoices, and manuals
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateFeatureToggle('enableDocumentIntelligence', !aiSettings.features.enableDocumentIntelligence)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  aiSettings.features.enableDocumentIntelligence ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    aiSettings.features.enableDocumentIntelligence ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Maintenance Automation */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Maintenance Automation</p>
                  <p className="text-xs text-muted-foreground">
                    AI-powered maintenance suggestions and scheduling
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateFeatureToggle('enableMaintenanceAutomation', !aiSettings.features.enableMaintenanceAutomation)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  aiSettings.features.enableMaintenanceAutomation ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    aiSettings.features.enableMaintenanceAutomation ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Smart Home Assistant */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-5 h-5 text-pink-500" />
                <div>
                  <p className="text-sm font-medium">Smart Home Assistant</p>
                  <p className="text-xs text-muted-foreground">
                    Proactive insights and recommendations for your home
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateFeatureToggle('enableSmartAssistant', !aiSettings.features.enableSmartAssistant)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  aiSettings.features.enableSmartAssistant ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    aiSettings.features.enableSmartAssistant ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Smart Assistant Schedule */}
            {aiSettings.features.enableSmartAssistant && (
              <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg ml-8 border-l-2 border-pink-500/30">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Analysis Schedule</p>
                    <p className="text-xs text-muted-foreground">
                      How often should AI analyze your home?
                    </p>
                  </div>
                </div>
                <select
                  value={aiSettings.assistantSchedule}
                  onChange={(e) => setAssistantSchedule(e.target.value as 'manual' | 'daily' | 'weekly')}
                  className="px-3 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="manual">Manual only</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <strong>Privacy:</strong> When using AI features, your home data and queries are sent directly to the selected provider's API. 
              API keys are stored only in your browser's localStorage. No data is sent to our servers.
            </p>
          </div>
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

      {/* Property Value Tracking */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Property Value Tracking
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Automatically track your home's estimated value using property data APIs. 
            Free tier available (100 requests/month).
          </p>
          
          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-3">
              Value Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updatePropertyValueConfig({ provider: 'none' })}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-all",
                  propertyValueConfig.provider === 'none'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <div className="font-medium text-sm">Disabled</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Manual entry only
                </div>
              </button>
              <button
                onClick={() => updatePropertyValueConfig({ provider: 'rentcast' })}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-all",
                  propertyValueConfig.provider === 'rentcast'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <div className="font-medium text-sm">RentCast</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Free: 100/month
                </div>
              </button>
            </div>
          </div>
          
          {/* API Key Input */}
          {propertyValueConfig.provider === 'rentcast' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                RentCast API Key
              </label>
              <div className="flex gap-2">
                <Input
                  type={showApiKeys['rentcast'] ? 'text' : 'password'}
                  value={propertyValueConfig.apiKey || ''}
                  onChange={(e) => updatePropertyValueConfig({ apiKey: e.target.value })}
                  placeholder="Enter your RentCast API key"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => toggleKeyVisibility('rentcast')}
                >
                  {showApiKeys['rentcast'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Get your free API key at{' '}
                <a
                  href="https://rentcast.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  rentcast.io
                  <ExternalLink className="w-3 h-3 inline ml-1" />
                </a>
              </p>
            </div>
          )}
          
          {/* Auto-Update Settings */}
          {propertyValueConfig.provider !== 'none' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Auto-Update</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically fetch updated values
                  </p>
                </div>
                <button
                  onClick={() => updatePropertyValueConfig({ autoUpdate: !propertyValueConfig.autoUpdate })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    propertyValueConfig.autoUpdate ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      propertyValueConfig.autoUpdate ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
              
              {propertyValueConfig.autoUpdate && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Update Frequency
                  </label>
                  <select
                    value={propertyValueConfig.updateFrequency}
                    onChange={(e) => updatePropertyValueConfig({ 
                      updateFrequency: e.target.value as PropertyValueConfig['updateFrequency']
                    })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="manual">Manual Only</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {propertyValueConfig.updateFrequency === 'daily' && 'Updates every day (uses ~30 requests/month)'}
                    {propertyValueConfig.updateFrequency === 'weekly' && 'Updates weekly (uses ~4 requests/month)'}
                    {propertyValueConfig.updateFrequency === 'monthly' && 'Updates monthly (uses 1 request/month)'}
                    {propertyValueConfig.updateFrequency === 'manual' && 'Only updates when you click "Refresh Value"'}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notifications
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Configure how and when you receive notifications about maintenance, warranties, and projects.
          </p>

          {/* Maintenance Notifications */}
          <div className="mb-6 p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-medium text-foreground">Maintenance Reminders</h3>
                  <p className="text-xs text-muted-foreground">Get notified before maintenance tasks are due</p>
                </div>
              </div>
              <button
                onClick={() => updateNotificationPrefs({ maintenanceEnabled: !notificationPrefs.maintenanceEnabled })}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  notificationPrefs.maintenanceEnabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    notificationPrefs.maintenanceEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
            
            {notificationPrefs.maintenanceEnabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notify me (days before due)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[7, 3, 1, 0].map((days) => (
                      <button
                        key={days}
                        onClick={() => {
                          const current = notificationPrefs.maintenanceAdvanceDays;
                          const updated = current.includes(days)
                            ? current.filter(d => d !== days)
                            : [...current, days].sort((a, b) => b - a);
                          updateNotificationPrefs({ maintenanceAdvanceDays: updated });
                        }}
                        className={cn(
                          "px-3 py-1 rounded text-sm transition-colors",
                          notificationPrefs.maintenanceAdvanceDays.includes(days)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                        )}
                      >
                        {days === 0 ? 'Due' : `${days}d`}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notification Channels
                  </label>
                  <div className="flex gap-4">
                    {(['dashboard', 'browser'] as NotificationChannel[]).map((channel) => (
                      <label key={channel} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.maintenanceChannels.includes(channel)}
                          onChange={(e) => {
                            const current = notificationPrefs.maintenanceChannels;
                            const updated = e.target.checked
                              ? [...current, channel]
                              : current.filter(c => c !== channel);
                            updateNotificationPrefs({ maintenanceChannels: updated });
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-foreground">
                          {channel === 'dashboard' ? 'Dashboard' : 'Browser Push'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Browser Push Permission */}
          <div className="mb-6 p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-purple-500" />
                <div>
                  <h3 className="font-medium text-foreground">Browser Push Notifications</h3>
                  <p className="text-xs text-muted-foreground">
                    {notificationPrefs.browserPushPermissionGranted
                      ? 'Permission granted - you will receive browser notifications'
                      : 'Click to enable browser push notifications'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  updateNotificationPrefs({ 
                    browserPushEnabled: granted,
                    browserPushPermissionGranted: granted 
                  });
                  if (granted) {
                    toast.success('Permission Granted', 'Browser notifications enabled');
                  } else {
                    toast.error('Permission Denied', 'Please enable notifications in your browser settings');
                  }
                }}
              >
                {notificationPrefs.browserPushPermissionGranted ? 'Enabled' : 'Enable'}
              </Button>
            </div>
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
            <span className="px-2 py-1 bg-muted/30 rounded">Version 1.6.0</span>
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
