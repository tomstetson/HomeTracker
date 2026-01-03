/**
 * Power Settings Component
 *
 * Configuration panel for Emporia Vue power monitoring integration.
 * Allows users to:
 * - Enable/disable power monitoring
 * - Configure Emporia credentials
 * - View connection status and statistics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from './ui/Toast';
import {
  Zap,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  Clock,
  Activity,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PowerConfig {
  emporia_email: string | null;
  emporia_password: string | null;
  device_gid: string | null;
  enabled: string | null;
}

interface LearningStatus {
  learning_mode: number;
  learning_progress: number;
  first_reading_ts: number | null;
  total_readings: number;
  last_updated: string | null;
}

interface PowerStats {
  storage: {
    rawCount: number;
    oneMinCount: number;
    hourlyCount: number;
    totalEstimatedSizeKb: number;
    lastCleanup: any;
  };
  latestReading: {
    timestamp: string;
    totalWatts: number;
    phaseA: number | null;
    phaseB: number | null;
    circuits: Record<string, number> | null;
  } | null;
  todayEnergyKwh: number;
  retention: {
    rawRetentionDays: number;
    oneMinRetentionDays: number;
    hourlyRetention: string;
  };
}

interface ConnectionStatus {
  connected: boolean;
  lastReading: string | null;
  message: string;
}

// API URL helper
function getApiUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3001`;
    }
  }
  return 'http://localhost:3001';
}

const API_URL = getApiUrl();

export function PowerSettings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Configuration state
  const [config, setConfig] = useState<PowerConfig>({
    emporia_email: null,
    emporia_password: null,
    device_gid: null,
    enabled: null,
  });
  const [learningStatus, setLearningStatus] = useState<LearningStatus | null>(null);
  const [stats, setStats] = useState<PowerStats | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    loadConfig();
    loadStats();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/power/config`);
      const data = await response.json();

      if (data.success) {
        setConfig(data.config);
        setLearningStatus(data.learningStatus);
        setEmail(data.config.emporia_email || '');
        setPassword(data.config.emporia_password === '********' ? '********' : '');
        setEnabled(data.config.enabled === 'true');
      }
    } catch (error) {
      console.error('Failed to load power config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/power/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load power stats:', error);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch(`${API_URL}/api/power/test-connection`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setConnectionStatus({
          connected: data.connected,
          lastReading: data.lastReading,
          message: data.message,
        });

        if (data.connected) {
          toast.success('Connected', 'Emporia Vue connection is active');
        } else {
          toast.info('Not Connected', data.message);
        }
      } else {
        toast.error('Test Failed', data.error || 'Failed to test connection');
      }
    } catch (error) {
      toast.error('Error', 'Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    if (!email && enabled) {
      toast.error('Email Required', 'Please enter your Emporia email');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/power/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: password !== '********' ? password : undefined,
          enabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Saved', 'Power monitoring settings saved');
        setHasChanges(false);

        if (data.requiresRestart) {
          toast.info('Restart Required', 'Restart the container to apply changes');
        }

        // Reload config
        loadConfig();
        loadStats();
      } else {
        toast.error('Save Failed', data.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setHasChanges(true);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setHasChanges(true);
  };

  const handleEnabledChange = (value: boolean) => {
    setEnabled(value);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Power Monitoring (Emporia Vue)
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Track your home's energy usage in real-time with Emporia Vue smart energy monitor.
          Data is stored locally with intelligent downsampling for long-term storage efficiency.
        </p>

        {/* Enable Toggle */}
        <div className="mb-6 p-4 bg-muted/20 rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Enable Power Monitoring</p>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? 'Power monitoring is enabled'
                  : 'Enable to start tracking energy usage'}
              </p>
            </div>
            <button
              onClick={() => handleEnabledChange(!enabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                enabled ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>

        {/* Credentials */}
        {enabled && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Emporia Account Email
              </label>
              <Input
                type="email"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Emporia Account Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Credentials are stored securely in your local database
              </p>
            </div>

            {/* Get Account Link */}
            <div className="text-sm">
              <a
                href="https://www.emporiaenergy.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Don't have an Emporia Vue? Get one here
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Save Button */}
        {hasChanges && (
          <div className="mb-6">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        )}

        {/* Connection Status */}
        {enabled && config.emporia_email && (
          <div className="mb-6 p-4 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Connection Status
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span className="ml-2">Test</span>
              </Button>
            </div>

            {connectionStatus ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {connectionStatus.connected ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span
                    className={cn(
                      'text-sm',
                      connectionStatus.connected
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    )}
                  >
                    {connectionStatus.message}
                  </span>
                </div>
                {connectionStatus.lastReading && (
                  <p className="text-xs text-muted-foreground">
                    Last reading: {new Date(connectionStatus.lastReading).toLocaleString()}
                  </p>
                )}
              </div>
            ) : stats?.latestReading ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Receiving data
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last reading: {new Date(stats.latestReading.timestamp).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">
                  No data yet. Click "Test" to check connection.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        {enabled && stats && (
          <div className="space-y-4">
            {/* Current Power */}
            {stats.latestReading && (
              <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Power</p>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.latestReading.totalWatts.toFixed(0)} W
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Today's Usage</p>
                    <p className="text-xl font-semibold text-foreground">
                      {stats.todayEnergyKwh.toFixed(2)} kWh
                    </p>
                  </div>
                </div>

                {/* Phase breakdown */}
                {(stats.latestReading.phaseA || stats.latestReading.phaseB) && (
                  <div className="mt-3 pt-3 border-t border-yellow-500/20 grid grid-cols-2 gap-4 text-sm">
                    {stats.latestReading.phaseA && (
                      <div>
                        <span className="text-muted-foreground">Phase A: </span>
                        <span className="font-medium">{stats.latestReading.phaseA.toFixed(0)} W</span>
                      </div>
                    )}
                    {stats.latestReading.phaseB && (
                      <div>
                        <span className="text-muted-foreground">Phase B: </span>
                        <span className="font-medium">{stats.latestReading.phaseB.toFixed(0)} W</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Storage Stats */}
            <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
              <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Data Storage
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Raw (7 days)</p>
                  <p className="font-medium">{stats.storage.rawCount.toLocaleString()} readings</p>
                </div>
                <div>
                  <p className="text-muted-foreground">1-min (90 days)</p>
                  <p className="font-medium">{stats.storage.oneMinCount.toLocaleString()} records</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hourly (forever)</p>
                  <p className="font-medium">{stats.storage.hourlyCount.toLocaleString()} records</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Size</p>
                  <p className="font-medium">
                    {stats.storage.totalEstimatedSizeKb > 1024
                      ? `${(stats.storage.totalEstimatedSizeKb / 1024).toFixed(1)} MB`
                      : `${stats.storage.totalEstimatedSizeKb} KB`}
                  </p>
                </div>
              </div>
            </div>

            {/* Learning Status */}
            {learningStatus && learningStatus.total_readings > 0 && (
              <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Adaptive Learning
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Readings</span>
                    <span className="font-medium">{learningStatus.total_readings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Learning Progress</span>
                    <span className="font-medium">{learningStatus.learning_progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(learningStatus.learning_progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The system learns your home's normal usage patterns over time to detect anomalies.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Docker Environment Note */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            <strong>Note:</strong> Power monitoring requires <code className="bg-blue-500/20 px-1 rounded">POWER_MONITORING_ENABLED=true</code> in
            your docker-compose environment. Restart the container after enabling for the Python worker to start.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
