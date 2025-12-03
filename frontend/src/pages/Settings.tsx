import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../lib/theme';
import {
  Home,
  Ruler,
  Users,
  Sun,
  Moon,
  Save,
  Database,
  Download,
  Upload,
  Trash2,
  Settings as SettingsIcon,
  TrendingUp,
  Palette,
  AlertTriangle,
  Droplets,
  Flame,
  Zap,
  Phone,
  HardDrive,
  Cloud,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '../lib/utils';
import HomeValueTracker from '../components/HomeValueTracker';
import { useHomeVitalsStore } from '../store/homeVitalsStore';

// Property settings stored in localStorage
interface PropertySettings {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  yearBuilt: string;
  squareFootage: string;
  lotSize: string;
  bedrooms: string;
  bathrooms: string;
  purchaseDate: string;
  purchasePrice: string;
  currentValue: string;
  notes: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}

const DEFAULT_SETTINGS: PropertySettings = {
  address: '',
  city: '',
  state: 'PA',
  zipCode: '',
  propertyType: 'Single Family Home',
  yearBuilt: '',
  squareFootage: '',
  lotSize: '',
  bedrooms: '',
  bathrooms: '',
  purchaseDate: '',
  purchasePrice: '',
  currentValue: '',
  notes: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
};

export default function Settings() {
  const toast = useToast();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<PropertySettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Home Vitals store for paint colors and emergency info
  const {
    paintColors,
    homeVitals,
    deletePaintColor,
    updateHomeVitals,
    deleteEmergencyContact,
  } = useHomeVitalsStore();

  const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('hometracker_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    try {
      localStorage.setItem('hometracker_settings', JSON.stringify(settings));
      setHasChanges(false);
      toast.success('Settings Saved', 'Your property settings have been updated');
    } catch (error) {
      toast.error('Error', 'Failed to save settings');
    }
  };

  // Handle input changes
  const handleChange = (field: keyof PropertySettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Export all data
  const exportAllData = () => {
    try {
      const data: Record<string, any> = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        settings,
      };

      // Get all collections from localStorage
      const collections = ['items', 'vendors', 'projects', 'maintenanceTasks', 'warranties', 'documents'];
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
        
        // Restore settings
        if (data.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
          localStorage.setItem('hometracker_settings', JSON.stringify(data.settings));
        }

        // Restore collections
        const collections = ['items', 'vendors', 'projects', 'maintenanceTasks', 'warranties', 'documents'];
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
      const keys = ['items', 'vendors', 'projects', 'maintenanceTasks', 'warranties', 'documents', 'settings'];
      keys.forEach((key) => localStorage.removeItem(`hometracker_${key}`));
      setSettings(DEFAULT_SETTINGS);
      toast.success('Data Cleared', 'All data has been deleted. Please refresh the page.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Configure your property and app preferences</p>
        </div>
        <Button onClick={saveSettings} disabled={!hasChanges} className="flex items-center space-x-2">
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </Button>
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

      {/* Property Information */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Home className="w-5 h-5 mr-2" />
            Property Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Street Address"
              value={settings.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main St"
            />
            <Input
              label="City"
              value={settings.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Anytown"
            />
            <Input
              label="State"
              value={settings.state}
              onChange={(e) => handleChange('state', e.target.value)}
              placeholder="PA"
            />
            <Input
              label="ZIP Code"
              value={settings.zipCode}
              onChange={(e) => handleChange('zipCode', e.target.value)}
              placeholder="12345"
            />
            <Input
              label="Property Type"
              value={settings.propertyType}
              onChange={(e) => handleChange('propertyType', e.target.value)}
              placeholder="Single Family Home"
            />
            <Input
              label="Year Built"
              value={settings.yearBuilt}
              onChange={(e) => handleChange('yearBuilt', e.target.value)}
              placeholder="1990"
            />
          </div>
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Ruler className="w-5 h-5 mr-2" />
            Property Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Square Footage"
              value={settings.squareFootage}
              onChange={(e) => handleChange('squareFootage', e.target.value)}
              placeholder="2,500"
            />
            <Input
              label="Lot Size (acres)"
              value={settings.lotSize}
              onChange={(e) => handleChange('lotSize', e.target.value)}
              placeholder="0.25"
            />
            <Input
              label="Bedrooms"
              value={settings.bedrooms}
              onChange={(e) => handleChange('bedrooms', e.target.value)}
              placeholder="4"
            />
            <Input
              label="Bathrooms"
              value={settings.bathrooms}
              onChange={(e) => handleChange('bathrooms', e.target.value)}
              placeholder="2.5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Purchase Information */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Home className="w-5 h-5 mr-2" />
            Purchase Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={settings.purchaseDate}
              onChange={(e) => handleChange('purchaseDate', e.target.value)}
            />
            <Input
              label="Purchase Price"
              value={settings.purchasePrice}
              onChange={(e) => handleChange('purchasePrice', e.target.value)}
              placeholder="$350,000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Home Value Tracking */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Home Value Tracking
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Track your home's value over time. Use manual entries or optionally connect to a property value API.
          </p>
          <HomeValueTracker />
        </CardContent>
      </Card>

      {/* Paint Colors */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Paint Colors
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Quick reference for paint colors used in your home.
          </p>
          
          {paintColors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No paint colors saved yet</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paintColors.map((paint) => (
                <div
                  key={paint.id}
                  className="p-3 bg-muted/20 rounded-lg border border-border/50 flex items-start gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-lg border border-border flex-shrink-0"
                    style={{ backgroundColor: paint.hexColor || '#ccc' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{paint.room}</p>
                    <p className="text-sm text-muted-foreground truncate">{paint.colorName}</p>
                    <p className="text-xs text-muted-foreground">{paint.brand}</p>
                  </div>
                  <button
                    onClick={() => deletePaintColor(paint.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Info */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
            Emergency Information
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Know where to find shutoffs in an emergency.
          </p>
          
          <div className="space-y-4">
            {/* Water Shutoff */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-foreground">Water Main Shutoff</span>
              </div>
              <Input
                placeholder="e.g., Basement, near water heater"
                value={homeVitals.waterMain?.location || ''}
                onChange={(e) => updateHomeVitals({ waterMain: { ...homeVitals.waterMain, location: e.target.value } })}
                className="bg-background/50"
              />
            </div>

            {/* Gas Shutoff */}
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-medium text-foreground">Gas Shutoff</span>
              </div>
              <Input
                placeholder="e.g., Outside, by meter"
                value={homeVitals.gasShutoff?.location || ''}
                onChange={(e) => updateHomeVitals({ gasShutoff: { ...homeVitals.gasShutoff, location: e.target.value } })}
                className="bg-background/50"
              />
            </div>

            {/* Electrical Panel */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-foreground">Electrical Panel</span>
              </div>
              <Input
                placeholder="e.g., Garage, left wall"
                value={homeVitals.electricalPanel?.location || ''}
                onChange={(e) => updateHomeVitals({ electricalPanel: { ...homeVitals.electricalPanel, location: e.target.value } })}
                className="bg-background/50"
              />
            </div>

            {/* Emergency Contacts */}
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-foreground">Emergency Contacts</span>
                </div>
              </div>
              {homeVitals.emergencyContacts?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No emergency contacts added</p>
              ) : (
                <div className="space-y-2">
                  {homeVitals.emergencyContacts?.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-2 bg-background/50 rounded">
                      <div>
                        <p className="font-medium text-foreground text-sm">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.phone} • {contact.type}</p>
                      </div>
                      <button
                        onClick={() => deleteEmergencyContact(contact.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Owner Information */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Owner Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Owner Name"
              value={settings.ownerName}
              onChange={(e) => handleChange('ownerName', e.target.value)}
              placeholder="Your Name"
            />
            <Input
              label="Email"
              type="email"
              value={settings.ownerEmail}
              onChange={(e) => handleChange('ownerEmail', e.target.value)}
              placeholder="tom@example.com"
            />
            <Input
              label="Phone"
              type="tel"
              value={settings.ownerPhone}
              onChange={(e) => handleChange('ownerPhone', e.target.value)}
              placeholder="215-555-0100"
            />
          </div>
          <div className="mt-4">
            <Textarea
              label="Notes"
              value={settings.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes about your property..."
              rows={3}
            />
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

      {/* About */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">About HomeTracker</h2>
          <p className="text-sm text-muted-foreground mb-4">
            HomeTracker is your complete home management solution. Track inventory, manage projects, 
            schedule maintenance, store documents, and never miss a warranty claim.
          </p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Version 1.0.0</span>
            <span>•</span>
            <span>Built for {settings.address || 'Your Home'}, {settings.city || 'Your City'}, {settings.state || 'State'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

