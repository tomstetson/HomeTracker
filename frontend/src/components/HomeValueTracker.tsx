/**
 * Home Value Tracker Component
 * 
 * Tracks home value over time with optional API integration.
 * Privacy-first: No outbound calls unless explicitly enabled by user.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from './ui/Toast';
import {
  Home, TrendingUp, TrendingDown, DollarSign, RefreshCw,
  Settings, Shield, ExternalLink, Plus, Trash2, Eye, EyeOff,
  Info, History, Wifi, WifiOff
} from 'lucide-react';
import { cn } from '../lib/utils';

// Types
interface HomeValueEntry {
  id: string;
  date: string;
  value: number;
  source: 'manual' | 'api' | 'estimate';
  notes?: string;
}

interface HomeValueSettings {
  apiEnabled: boolean;
  apiProvider: 'none' | 'rapidapi' | 'attom' | 'custom';
  apiKey: string;
  autoRefresh: boolean;
  refreshIntervalDays: number;
  showInDashboard: boolean;
  address: string;
}

interface HomeValueData {
  currentValue: number | null;
  lastUpdated: string | null;
  history: HomeValueEntry[];
  settings: HomeValueSettings;
}

const STORAGE_KEY = 'hometracker_homeValue';

const DEFAULT_SETTINGS: HomeValueSettings = {
  apiEnabled: false,
  apiProvider: 'none',
  apiKey: '',
  autoRefresh: false,
  refreshIntervalDays: 30,
  showInDashboard: true,
  address: '',
};

const DEFAULT_DATA: HomeValueData = {
  currentValue: null,
  lastUpdated: null,
  history: [],
  settings: DEFAULT_SETTINGS,
};

// API Providers info
const API_PROVIDERS = {
  none: {
    name: 'Manual Entry Only',
    description: 'No API calls - enter values manually',
    freeQuota: 'N/A',
    signupUrl: null,
  },
  rapidapi: {
    name: 'RapidAPI - Realty Mole',
    description: 'Property data API with free tier',
    freeQuota: '50 requests/month',
    signupUrl: 'https://rapidapi.com/realtymole/api/realty-mole-property-api',
  },
  attom: {
    name: 'ATTOM Property API',
    description: 'Comprehensive property data',
    freeQuota: 'Trial available',
    signupUrl: 'https://api.attomdata.com/',
  },
  custom: {
    name: 'Custom API Endpoint',
    description: 'Use your own API endpoint',
    freeQuota: 'Depends on provider',
    signupUrl: null,
  },
};

export function HomeValueTracker() {
  const toast = useToast();
  const [data, setData] = useState<HomeValueData>(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setData({ ...DEFAULT_DATA, ...parsed });
      } catch {
        setData(DEFAULT_DATA);
      }
    }
  }, []);

  // Save data to localStorage
  const saveData = (newData: HomeValueData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  };

  // Add manual value entry
  const addManualEntry = () => {
    const value = parseFloat(manualValue.replace(/[^0-9.]/g, ''));
    if (isNaN(value) || value <= 0) {
      toast.error('Invalid Value', 'Please enter a valid dollar amount');
      return;
    }

    const entry: HomeValueEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      value,
      source: 'manual',
      notes: manualNotes || undefined,
    };

    const newData: HomeValueData = {
      ...data,
      currentValue: value,
      lastUpdated: entry.date,
      history: [entry, ...data.history].slice(0, 100), // Keep last 100 entries
    };

    saveData(newData);
    setManualValue('');
    setManualNotes('');
    toast.success('Value Added', `Home value set to $${value.toLocaleString()}`);
  };

  // Fetch value from API
  const fetchFromApi = async () => {
    if (!data.settings.apiEnabled || data.settings.apiProvider === 'none') {
      toast.error('API Disabled', 'Enable API access in settings first');
      return;
    }

    if (!data.settings.apiKey) {
      toast.error('No API Key', 'Please add your API key in settings');
      return;
    }

    if (!data.settings.address) {
      toast.error('No Address', 'Please set your property address in settings');
      return;
    }

    setIsLoading(true);

    try {
      let value: number | null = null;

      if (data.settings.apiProvider === 'rapidapi') {
        // RapidAPI - Realty Mole Property API
        const response = await fetch(
          `https://realty-mole-property-api.p.rapidapi.com/salePrice?address=${encodeURIComponent(data.settings.address)}`,
          {
            headers: {
              'X-RapidAPI-Key': data.settings.apiKey,
              'X-RapidAPI-Host': 'realty-mole-property-api.p.rapidapi.com',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        value = result.price || result.salePrice || result.estimatedValue;
      } else if (data.settings.apiProvider === 'attom') {
        // ATTOM API
        const response = await fetch(
          `https://api.gateway.attomdata.com/propertyapi/v1.0.0/avm/detail?address=${encodeURIComponent(data.settings.address)}`,
          {
            headers: {
              'apikey': data.settings.apiKey,
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        value = result?.property?.[0]?.avm?.amount?.value;
      } else if (data.settings.apiProvider === 'custom') {
        // Custom API endpoint (API key is the full URL)
        const response = await fetch(data.settings.apiKey);
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        const result = await response.json();
        value = result.value || result.price || result.estimatedValue;
      }

      if (value && value > 0) {
        const entry: HomeValueEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          value,
          source: 'api',
          notes: `From ${API_PROVIDERS[data.settings.apiProvider].name}`,
        };

        const newData: HomeValueData = {
          ...data,
          currentValue: value,
          lastUpdated: entry.date,
          history: [entry, ...data.history].slice(0, 100),
        };

        saveData(newData);
        toast.success('Value Updated', `Home value: $${value.toLocaleString()}`);
      } else {
        throw new Error('No value returned from API');
      }
    } catch (error: any) {
      console.error('API fetch error:', error);
      toast.error('API Error', error.message || 'Failed to fetch home value');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete history entry
  const deleteEntry = (id: string) => {
    const newHistory = data.history.filter(e => e.id !== id);
    const newData: HomeValueData = {
      ...data,
      history: newHistory,
      currentValue: newHistory[0]?.value || null,
      lastUpdated: newHistory[0]?.date || null,
    };
    saveData(newData);
    toast.success('Entry Deleted', 'History entry removed');
  };

  // Update settings
  const updateSettings = (updates: Partial<HomeValueSettings>) => {
    const newSettings = { ...data.settings, ...updates };
    saveData({ ...data, settings: newSettings });
  };

  // Calculate value change
  const getValueChange = () => {
    if (data.history.length < 2) return null;
    
    const current = data.history[0]?.value || 0;
    const previous = data.history[1]?.value || 0;
    const change = current - previous;
    const percentChange = previous > 0 ? ((change / previous) * 100) : 0;
    
    return { change, percentChange };
  };

  const valueChange = getValueChange();

  return (
    <div className="space-y-4">
      {/* Main Value Card */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Home className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Home Value</h3>
                <p className="text-xs text-muted-foreground">
                  {data.lastUpdated 
                    ? `Updated ${new Date(data.lastUpdated).toLocaleDateString()}`
                    : 'No data yet'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowHistory(!showHistory)}
                title="View history"
              >
                <History className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Current Value */}
          <div className="mb-4">
            {data.currentValue ? (
              <div className="flex items-end gap-4">
                <span className="text-4xl font-bold text-foreground">
                  ${data.currentValue.toLocaleString()}
                </span>
                {valueChange && (
                  <div className={cn(
                    "flex items-center gap-1 text-sm mb-1",
                    valueChange.change >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {valueChange.change >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>
                      {valueChange.change >= 0 ? '+' : ''}
                      ${Math.abs(valueChange.change).toLocaleString()}
                      ({valueChange.percentChange >= 0 ? '+' : ''}
                      {valueChange.percentChange.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No value recorded yet</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {data.settings.apiEnabled && data.settings.apiProvider !== 'none' && (
              <Button 
                onClick={fetchFromApi} 
                disabled={isLoading}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Fetch from API
              </Button>
            )}
          </div>

          {/* Privacy Notice */}
          <div className={cn(
            "mt-4 p-3 rounded-lg flex items-start gap-2",
            data.settings.apiEnabled 
              ? "bg-amber-500/10 border border-amber-500/20" 
              : "bg-emerald-500/10 border border-emerald-500/20"
          )}>
            {data.settings.apiEnabled ? (
              <>
                <Wifi className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-medium text-amber-500">API Enabled</span>
                  <p className="text-muted-foreground">
                    External API calls will be made when you click "Fetch from API"
                  </p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-medium text-emerald-500">Privacy Mode</span>
                  <p className="text-muted-foreground">
                    No external API calls - all data stays local
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Entry */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Manual Entry
          </h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter value (e.g., 450000)"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Notes (optional)"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="bg-background"
              />
            </div>
            <Button onClick={addManualEntry}>
              <DollarSign className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Tip: Check Zillow, Redfin, or your county assessor for current estimates
          </p>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              API Settings & Privacy
            </h4>

            {/* API Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  {data.settings.apiEnabled ? (
                    <Wifi className="w-5 h-5 text-amber-500" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-emerald-500" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">External API Access</p>
                    <p className="text-xs text-muted-foreground">
                      {data.settings.apiEnabled 
                        ? 'API calls enabled - data may be sent externally'
                        : 'Disabled - no external calls will be made'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={data.settings.apiEnabled ? "destructive" : "default"}
                  size="sm"
                  onClick={() => updateSettings({ apiEnabled: !data.settings.apiEnabled })}
                >
                  {data.settings.apiEnabled ? 'Disable' : 'Enable'}
                </Button>
              </div>

              {data.settings.apiEnabled && (
                <>
                  {/* API Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      API Provider
                    </label>
                    <select
                      value={data.settings.apiProvider}
                      onChange={(e) => updateSettings({ apiProvider: e.target.value as any })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    >
                      {Object.entries(API_PROVIDERS).map(([key, provider]) => (
                        <option key={key} value={key}>
                          {provider.name} - {provider.freeQuota}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Provider Info */}
                  {data.settings.apiProvider !== 'none' && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-foreground font-medium">
                        {API_PROVIDERS[data.settings.apiProvider].name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {API_PROVIDERS[data.settings.apiProvider].description}
                      </p>
                      <p className="text-xs text-blue-500 mt-1">
                        Free quota: {API_PROVIDERS[data.settings.apiProvider].freeQuota}
                      </p>
                      {API_PROVIDERS[data.settings.apiProvider].signupUrl && (
                        <a
                          href={API_PROVIDERS[data.settings.apiProvider].signupUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Get API Key
                        </a>
                      )}
                    </div>
                  )}

                  {/* API Key Input */}
                  {data.settings.apiProvider !== 'none' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        API Key
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="Enter your API key"
                            value={data.settings.apiKey}
                            onChange={(e) => updateSettings({ apiKey: e.target.value })}
                            className="bg-background pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        🔒 Your API key is stored locally and never sent to our servers
                      </p>
                    </div>
                  )}

                  {/* Property Address */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Property Address
                    </label>
                    <Input
                      type="text"
                      placeholder="123 Main St, City, State ZIP"
                      value={data.settings.address}
                      onChange={(e) => updateSettings({ address: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Panel */}
      {showHistory && data.history.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <History className="w-4 h-4" />
              Value History
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs",
                      entry.source === 'api' ? "bg-blue-500/20 text-blue-500" : "bg-emerald-500/20 text-emerald-500"
                    )}>
                      {entry.source === 'api' ? 'API' : 'M'}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        ${entry.value.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString()}
                        {entry.notes && ` • ${entry.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {index > 0 && data.history[index - 1] && (
                      <span className={cn(
                        "text-xs",
                        entry.value > data.history[index - 1].value 
                          ? "text-emerald-500" 
                          : entry.value < data.history[index - 1].value
                          ? "text-red-500"
                          : "text-muted-foreground"
                      )}>
                        {entry.value > data.history[index - 1].value ? '↑' : 
                         entry.value < data.history[index - 1].value ? '↓' : '→'}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEntry(entry.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/20 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">About Home Value Tracking</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>All data is stored locally on your device/server</li>
                <li>API calls are only made when you explicitly request them</li>
                <li>Free API tiers have limited quotas - check provider details</li>
                <li>Manual entries are recommended for most accurate tracking</li>
                <li>Consider checking Zillow, Redfin, or your county assessor monthly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HomeValueTracker;

