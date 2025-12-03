import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import {
  Home,
  Ruler,
  Users,
  Save,
  TrendingUp,
  Palette,
  AlertTriangle,
  Droplets,
  Flame,
  Zap,
  Phone,
  Trash2,
  DollarSign,
  MapPin,
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
  notes: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}

const DEFAULT_SETTINGS: PropertySettings = {
  address: '',
  city: '',
  state: '',
  zipCode: '',
  propertyType: 'Single Family Home',
  yearBuilt: '',
  squareFootage: '',
  lotSize: '',
  bedrooms: '',
  bathrooms: '',
  purchaseDate: '',
  purchasePrice: '',
  notes: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
};

type TabType = 'property' | 'value' | 'reference' | 'emergency';

export default function HomeInfo() {
  const toast = useToast();
  const [settings, setSettings] = useState<PropertySettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('property');

  // Home Vitals store for paint colors and emergency info
  const {
    paintColors,
    homeVitals,
    deletePaintColor,
    updateHomeVitals,
    deleteEmergencyContact,
  } = useHomeVitalsStore();

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
      toast.success('Saved', 'Your home information has been updated');
    } catch (error) {
      toast.error('Error', 'Failed to save settings');
    }
  };

  // Handle input changes
  const handleChange = (field: keyof PropertySettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const tabs = [
    { id: 'property' as TabType, label: 'Property', icon: Home },
    { id: 'value' as TabType, label: 'Value', icon: TrendingUp },
    { id: 'reference' as TabType, label: 'Reference', icon: Palette },
    { id: 'emergency' as TabType, label: 'Emergency', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Home Info</h1>
          <p className="text-muted-foreground">Everything about your property</p>
        </div>
        <Button onClick={saveSettings} disabled={!hasChanges} className="flex items-center space-x-2">
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted/30 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Property Tab */}
      {activeTab === 'property' && (
        <div className="space-y-6">
          {/* Address */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Property Address
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input
                  label="Property Type"
                  value={settings.propertyType}
                  onChange={(e) => handleChange('propertyType', e.target.value)}
                  placeholder="Single Family"
                />
                <Input
                  label="Year Built"
                  value={settings.yearBuilt}
                  onChange={(e) => handleChange('yearBuilt', e.target.value)}
                  placeholder="1990"
                />
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
                <DollarSign className="w-5 h-5 mr-2" />
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
                  placeholder="you@example.com"
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
        </div>
      )}

      {/* Value Tab */}
      {activeTab === 'value' && (
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
      )}

      {/* Reference Tab (Paint Colors) */}
      {activeTab === 'reference' && (
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Paint Colors
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Quick reference for paint colors used in your home.
            </p>
            
            {paintColors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Palette className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No paint colors saved yet</p>
                <p className="text-sm mt-1">Add paint colors to track what's used in each room</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paintColors.map((paint) => (
                  <div
                    key={paint.id}
                    className="p-4 bg-muted/20 rounded-lg border border-border/50 flex items-start gap-4"
                  >
                    <div
                      className="w-12 h-12 rounded-lg border border-border flex-shrink-0 shadow-inner"
                      style={{ backgroundColor: paint.hexColor || '#ccc' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{paint.room}</p>
                      <p className="text-sm text-muted-foreground">{paint.colorName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{paint.brand} • {paint.finish}</p>
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
      )}

      {/* Emergency Tab */}
      {activeTab === 'emergency' && (
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
              Emergency Information
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Know where to find shutoffs and who to call in an emergency.
            </p>
            
            <div className="space-y-4">
              {/* Water Shutoff */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Droplets className="w-5 h-5 text-blue-500" />
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
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-5 h-5 text-orange-500" />
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
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-yellow-500" />
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
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-foreground">Emergency Contacts</span>
                </div>
                {homeVitals.emergencyContacts?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No emergency contacts added yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {homeVitals.emergencyContacts?.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">{contact.phone} • {contact.type}</p>
                        </div>
                        <button
                          onClick={() => deleteEmergencyContact(contact.id)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

