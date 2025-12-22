import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
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
  Plus,
  Edit,
  RefreshCw,
  Cloud,
  AlertCircle,
  CheckCircle,
  Download,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { useHomeVitalsStore, PaintColor, EmergencyContact, HomeValue } from '../store/homeVitalsStore';
import { usePropertyValueStore } from '../store/propertyValueStore';
import { fetchPropertyValue, shouldAutoUpdate } from '../lib/propertyValueService';
import { EditableSelect } from '../components/ui/EditableSelect';
import { ValueTrendChart } from '../components/ui/Chart';
import { askAboutHome } from '../lib/aiService';
import { useAISettingsStore } from '../store/aiSettingsStore';
import { isAIReady } from '../lib/aiService';

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

type TabType = 'property' | 'value' | 'paint' | 'emergency';

export default function HomeInfo() {
  const toast = useToast();
  const [settings, setSettings] = useState<PropertySettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('property');
  const [isFetchingValue, setIsFetchingValue] = useState(false);
  const [valueInsights, setValueInsights] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  
  // Property value store
  const {
    config: propertyValueConfig,
    currentEstimate,
    updateError,
    setCurrentEstimate,
    setUpdateError,
    setLastUpdateAttempt,
  } = usePropertyValueStore();
  
  // AI settings
  const { isFeatureEnabled } = useAISettingsStore();
  const aiReady = isAIReady();
  
  // Dialog states
  const [isPaintDialogOpen, setIsPaintDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isValueDialogOpen, setIsValueDialogOpen] = useState(false);
  const [editingPaint, setEditingPaint] = useState<PaintColor | null>(null);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  
  // Form state for new paint
  const [paintForm, setPaintForm] = useState({
    room: '',
    colorName: '',
    brand: '',
    colorCode: '',
    hexColor: '#cccccc',
    finish: '',
  });
  
  // Form state for new contact
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    type: 'Other' as EmergencyContact['type'],
    notes: '',
  });

  // Home Vitals store
  const {
    paintColors,
    homeVitals,
    homeValues,
    addPaintColor,
    updatePaintColor,
    deletePaintColor,
    updateHomeVitals,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
    addHomeValue,
    deleteHomeValue,
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

  // Paint handlers
  const handleSavePaint = () => {
    if (!paintForm.room || !paintForm.colorName) {
      toast.error('Required', 'Please enter room and color name');
      return;
    }
    
    if (editingPaint) {
      updatePaintColor(editingPaint.id, paintForm);
      toast.success('Updated', 'Paint color updated');
    } else {
      const newPaint: PaintColor = {
        id: Date.now().toString(),
        ...paintForm,
      };
      addPaintColor(newPaint);
      toast.success('Added', 'Paint color added');
    }
    
    setIsPaintDialogOpen(false);
    setEditingPaint(null);
    setPaintForm({ room: '', colorName: '', brand: '', colorCode: '', hexColor: '#cccccc', finish: '' });
  };

  const openEditPaint = (paint: PaintColor) => {
    setEditingPaint(paint);
    setPaintForm({
      room: paint.room,
      colorName: paint.colorName,
      brand: paint.brand || '',
      colorCode: paint.colorCode || '',
      hexColor: paint.hexColor || '#cccccc',
      finish: paint.finish || '',
    });
    setIsPaintDialogOpen(true);
  };

  // Contact handlers
  const handleSaveContact = () => {
    if (!contactForm.name || !contactForm.phone) {
      toast.error('Required', 'Please enter name and phone');
      return;
    }
    
    if (editingContact) {
      updateEmergencyContact(editingContact.id, contactForm);
      toast.success('Updated', 'Contact updated');
    } else {
      const newContact: EmergencyContact = {
        id: Date.now().toString(),
        ...contactForm,
      };
      addEmergencyContact(newContact);
      toast.success('Added', 'Emergency contact added');
    }
    
    setIsContactDialogOpen(false);
    setEditingContact(null);
    setContactForm({ name: '', phone: '', type: 'Other', notes: '' });
  };

  const openEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      phone: contact.phone,
      type: contact.type,
      notes: contact.notes || '',
    });
    setIsContactDialogOpen(true);
  };

  // Value handlers
  const handleAddValue = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const value: HomeValue = {
      date: formData.get('date') as string,
      value: parseFloat(formData.get('value') as string),
      source: formData.get('source') as string || 'Manual',
      notes: formData.get('notes') as string || undefined,
    };
    addHomeValue(value);
    setIsValueDialogOpen(false);
    toast.success('Added', `Value of ${formatCurrency(value.value)} recorded`);
  };

  // Fetch property value from API
  const fetchPropertyValueFromAPI = async () => {
    if (!settings.address || !settings.city || !settings.state || !settings.zipCode) {
      return;
    }
    
    if (propertyValueConfig.provider === 'none') {
      return;
    }
    
    setIsFetchingValue(true);
    setUpdateError(null);
    
    try {
      const estimate = await fetchPropertyValue(
        settings.address,
        settings.city,
        settings.state,
        settings.zipCode,
        propertyValueConfig
      );
      
      setCurrentEstimate(estimate);
      setLastUpdateAttempt(new Date().toISOString());
      
      if (estimate.error) {
        setUpdateError(estimate.error);
        toast.error('Value Fetch Failed', estimate.error);
      } else if (estimate.value > 0) {
        // Auto-add to home values if it's a new value
        const existingValue = homeValues.find(
          v => v.date === estimate.lastUpdated.split('T')[0] && v.source === estimate.source
        );
        
        if (!existingValue) {
          addHomeValue({
            date: estimate.lastUpdated.split('T')[0],
            value: estimate.value,
            source: estimate.source === 'rentcast' ? 'RentCast API' : estimate.source,
            notes: estimate.confidence ? `Confidence: ${Math.round(estimate.confidence * 100)}%` : undefined,
          });
          toast.success('Value Updated', `Current value: ${formatCurrency(estimate.value)}`);
        }
      }
    } catch (error: any) {
      setUpdateError(error.message);
      toast.error('Value Fetch Failed', error.message);
    } finally {
      setIsFetchingValue(false);
    }
  };
  
  // Auto-fetch on mount or when address/config changes
  useEffect(() => {
    if (
      propertyValueConfig.autoUpdate &&
      propertyValueConfig.provider !== 'none' &&
      settings.address &&
      settings.city &&
      settings.state &&
      settings.zipCode
    ) {
      const lastEstimate = currentEstimate;
      const shouldUpdate = !lastEstimate || 
        shouldAutoUpdate(lastEstimate.lastUpdated, propertyValueConfig.updateFrequency);
      
      if (shouldUpdate) {
        fetchPropertyValueFromAPI();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.address,
    settings.city,
    settings.state,
    settings.zipCode,
    propertyValueConfig.provider,
    propertyValueConfig.autoUpdate,
    propertyValueConfig.updateFrequency,
    currentEstimate?.lastUpdated,
  ]);
  
  // Calculate home value stats
  const latestValue = homeValues.length > 0 
    ? [...homeValues].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  
  // Use API estimate if it's newer than manual entry
  const displayValue = currentEstimate && currentEstimate.value > 0 && 
    (!latestValue || new Date(currentEstimate.lastUpdated) > new Date(latestValue.date))
    ? {
        value: currentEstimate.value,
        date: currentEstimate.lastUpdated.split('T')[0],
        source: currentEstimate.source === 'rentcast' ? 'RentCast API' : currentEstimate.source,
      }
    : latestValue;
  
  const purchaseValue = settings.purchasePrice ? parseFloat(settings.purchasePrice.replace(/[^0-9.-]/g, '')) : 0;
  const appreciation = displayValue ? displayValue.value - purchaseValue : 0;

  const tabs = [
    { id: 'property' as TabType, label: 'Property', icon: Home },
    { id: 'value' as TabType, label: 'Value', icon: TrendingUp },
    { id: 'paint' as TabType, label: 'Paint Colors', icon: Palette },
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

      {/* Value Tab - Simplified inline tracking */}
      {activeTab === 'value' && (
        <div className="space-y-6">
          {/* Current Value Summary */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Home Value
                  {propertyValueConfig.provider !== 'none' && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                      <Cloud className="w-3 h-3" />
                      Auto-tracking
                    </span>
                  )}
                </h2>
                <div className="flex gap-2">
                  {propertyValueConfig.provider !== 'none' && (
                    <Button
                      variant="outline"
                      onClick={fetchPropertyValueFromAPI}
                      disabled={isFetchingValue || !settings.address}
                    >
                      {isFetchingValue ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh Value
                        </>
                      )}
                    </Button>
                  )}
                  <Button onClick={() => setIsValueDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manual Value
                  </Button>
                </div>
              </div>
              
              {/* API Status */}
              {propertyValueConfig.provider !== 'none' && (
                <div className="mb-4">
                  {updateError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">Update Failed</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{updateError}</p>
                      </div>
                    </div>
                  )}
                  {currentEstimate && currentEstimate.value > 0 && !updateError && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          Last updated: {new Date(currentEstimate.lastUpdated).toLocaleString()}
                        </p>
                        {currentEstimate.confidence && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Confidence: {Math.round(currentEstimate.confidence * 100)}%
                            {currentEstimate.lowEstimate && currentEstimate.highEstimate && (
                              <> • Range: {formatCurrency(currentEstimate.lowEstimate)} - {formatCurrency(currentEstimate.highEstimate)}</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {propertyValueConfig.provider === 'rentcast' && !propertyValueConfig.apiKey && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        Configure your RentCast API key in Settings to enable automatic value tracking.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Purchase Price</p>
                  <p className="text-2xl font-bold text-foreground">
                    {purchaseValue > 0 ? formatCurrency(purchaseValue) : '—'}
                  </p>
                </div>
                <div className="p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-2xl font-bold text-foreground">
                    {displayValue ? formatCurrency(displayValue.value) : '—'}
                  </p>
                  {displayValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      as of {formatDate(displayValue.date)} • {displayValue.source}
                    </p>
                  )}
                  {currentEstimate && currentEstimate.lowEstimate && currentEstimate.highEstimate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Range: {formatCurrency(currentEstimate.lowEstimate)} - {formatCurrency(currentEstimate.highEstimate)}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Appreciation</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    appreciation > 0 ? "text-emerald-500" : appreciation < 0 ? "text-red-500" : "text-foreground"
                  )}>
                    {appreciation !== 0 ? (appreciation > 0 ? '+' : '') + formatCurrency(appreciation) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Value Trends Chart */}
          {homeValues.length > 0 && (
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Value Trends
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Export value report
                      const data = homeValues.map(v => ({
                        Date: v.date,
                        Value: formatCurrency(v.value),
                        Source: v.source,
                        Notes: v.notes || '',
                      }));
                      
                      const csv = [
                        Object.keys(data[0]).join(','),
                        ...data.map(row => Object.values(row).join(','))
                      ].join('\n');
                      
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `home-value-report-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Exported', 'Value report downloaded');
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>
                <ValueTrendChart
                  data={homeValues.map(v => ({
                    date: v.date,
                    value: v.value,
                    purchasePrice: purchaseValue > 0 ? purchaseValue : undefined,
                  }))}
                  purchasePrice={purchaseValue > 0 ? purchaseValue : undefined}
                  showRange={currentEstimate?.lowEstimate && currentEstimate?.highEstimate ? true : false}
                />
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {homeValues.length > 0 && purchaseValue > 0 && aiReady.ready && isFeatureEnabled('enableSmartAssistant') && (
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
                    AI Insights
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsGeneratingInsights(true);
                      try {
                        const question = `Analyze my home value trends. Purchase price: ${formatCurrency(purchaseValue)}, Current value: ${displayValue ? formatCurrency(displayValue.value) : 'unknown'}, Appreciation: ${appreciation > 0 ? '+' : ''}${formatCurrency(appreciation)}. I have ${homeValues.length} value records. Provide insights about appreciation rate, market trends, and recommendations.`;
                        const response = await askAboutHome(question);
                        if (response.success) {
                          setValueInsights(response.content || 'No insights available');
                        } else {
                          toast.error('Failed', response.error || 'Could not generate insights');
                        }
                      } catch (error: any) {
                        toast.error('Error', error.message);
                      } finally {
                        setIsGeneratingInsights(false);
                      }
                    }}
                    disabled={isGeneratingInsights}
                  >
                    {isGeneratingInsights ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Insights
                      </>
                    )}
                  </Button>
                </div>
                {valueInsights ? (
                  <div className="p-4 bg-muted/20 rounded-lg">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{valueInsights}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click "Generate Insights" to get AI-powered analysis of your home value trends.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Value History */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Value History</h3>
              {homeValues.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No value records yet. Add your first value estimate above.
                </p>
              ) : (
                <div className="space-y-2">
                  {[...homeValues]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((val, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">{formatCurrency(val.value)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(val.date)} • {val.source}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteHomeValue(val.date)}
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
        </div>
      )}

      {/* Paint Colors Tab */}
      {activeTab === 'paint' && (
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                <Palette className="w-5 h-5 mr-2" />
                Paint Colors
              </h2>
              <Button onClick={() => {
                setEditingPaint(null);
                setPaintForm({ room: '', colorName: '', brand: '', colorCode: '', hexColor: '#cccccc', finish: '' });
                setIsPaintDialogOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Color
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Track paint colors used in each room for easy touch-ups and repainting.
            </p>
            
            {paintColors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Palette className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No paint colors saved yet</p>
                <p className="text-sm mt-1">Click "Add Color" to track paint in each room</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paintColors.map((paint) => (
                  <div
                    key={paint.id}
                    className="p-4 bg-muted/20 rounded-lg border border-border/50"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-14 h-14 rounded-lg border border-border flex-shrink-0 shadow-inner"
                        style={{ backgroundColor: paint.hexColor || '#ccc' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{paint.room}</p>
                        <p className="text-sm text-muted-foreground">{paint.colorName}</p>
                        {paint.brand && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {paint.brand} {paint.colorCode && `• ${paint.colorCode}`}
                          </p>
                        )}
                        {paint.finish && (
                          <p className="text-xs text-muted-foreground">{paint.finish}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => openEditPaint(paint)}>
                        <Edit className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive"
                        onClick={() => {
                          deletePaintColor(paint.id);
                          toast.success('Deleted', 'Paint color removed');
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Emergency Tab */}
      {activeTab === 'emergency' && (
        <div className="space-y-6">
          {/* Shutoff Locations */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
                Utility Shutoffs
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Know where to find shutoffs in an emergency.
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
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-red-500" />
                  Emergency Contacts
                </h2>
                <Button onClick={() => {
                  setEditingContact(null);
                  setContactForm({ name: '', phone: '', type: 'Other', notes: '' });
                  setIsContactDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Quick access to important contacts: plumbers, electricians, family, etc.
              </p>
              
              {homeVitals.emergencyContacts?.length === 0 || !homeVitals.emergencyContacts ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No emergency contacts added yet</p>
                  <p className="text-sm mt-1">Click "Add Contact" to add your first one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {homeVitals.emergencyContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border/50">
                      <div>
                        <p className="font-medium text-foreground">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {contact.phone} • <span className="text-primary">{contact.type}</span>
                        </p>
                        {contact.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{contact.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEditContact(contact)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive"
                          onClick={() => {
                            deleteEmergencyContact(contact.id);
                            toast.success('Deleted', 'Contact removed');
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Paint Color Dialog */}
      <Dialog open={isPaintDialogOpen} onClose={() => setIsPaintDialogOpen(false)} title={editingPaint ? 'Edit Paint Color' : 'Add Paint Color'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <EditableSelect
              label="Room"
              value={paintForm.room}
              onChange={(v) => setPaintForm(p => ({ ...p, room: v }))}
              optionKey="rooms"
              required
            />
            <Input
              label="Color Name"
              value={paintForm.colorName}
              onChange={(e) => setPaintForm(p => ({ ...p, colorName: e.target.value }))}
              placeholder="e.g., Swiss Coffee"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Brand"
              value={paintForm.brand}
              onChange={(e) => setPaintForm(p => ({ ...p, brand: e.target.value }))}
              placeholder="e.g., Benjamin Moore"
            />
            <Input
              label="Color Code"
              value={paintForm.colorCode}
              onChange={(e) => setPaintForm(p => ({ ...p, colorCode: e.target.value }))}
              placeholder="e.g., OC-45"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Color Preview</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={paintForm.hexColor}
                  onChange={(e) => setPaintForm(p => ({ ...p, hexColor: e.target.value }))}
                  className="w-12 h-10 rounded border border-input cursor-pointer"
                />
                <Input
                  value={paintForm.hexColor}
                  onChange={(e) => setPaintForm(p => ({ ...p, hexColor: e.target.value }))}
                  placeholder="#cccccc"
                  className="flex-1"
                />
              </div>
            </div>
            <EditableSelect
              label="Finish"
              value={paintForm.finish}
              onChange={(v) => setPaintForm(p => ({ ...p, finish: v }))}
              optionKey="paintFinishes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsPaintDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePaint}>{editingPaint ? 'Save Changes' : 'Add Color'}</Button>
        </DialogFooter>
      </Dialog>

      {/* Emergency Contact Dialog */}
      <Dialog open={isContactDialogOpen} onClose={() => setIsContactDialogOpen(false)} title={editingContact ? 'Edit Contact' : 'Add Emergency Contact'}>
        <div className="space-y-4">
          <Input
            label="Name"
            value={contactForm.name}
            onChange={(e) => setContactForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g., Joe's Plumbing"
            required
          />
          <Input
            label="Phone"
            value={contactForm.phone}
            onChange={(e) => setContactForm(p => ({ ...p, phone: e.target.value }))}
            placeholder="e.g., 215-555-0123"
            required
          />
          <EditableSelect
            label="Type"
            value={contactForm.type}
            onChange={(v) => setContactForm(p => ({ ...p, type: v as EmergencyContact['type'] }))}
            optionKey="emergencyContactTypes"
          />
          <Textarea
            label="Notes (optional)"
            value={contactForm.notes}
            onChange={(e) => setContactForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="e.g., Available 24/7, mention you're a neighbor of John"
            rows={2}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveContact}>{editingContact ? 'Save Changes' : 'Add Contact'}</Button>
        </DialogFooter>
      </Dialog>

      {/* Add Value Dialog */}
      <Dialog open={isValueDialogOpen} onClose={() => setIsValueDialogOpen(false)} title="Add Home Value">
        <form onSubmit={handleAddValue} className="space-y-4">
          <Input
            label="Date"
            name="date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            required
          />
          <Input
            label="Estimated Value"
            name="value"
            type="number"
            step="1000"
            placeholder="450000"
            required
          />
          <Input
            label="Source"
            name="source"
            placeholder="e.g., Zillow, Redfin, Appraisal"
            defaultValue="Manual Estimate"
          />
          <Textarea
            label="Notes (optional)"
            name="notes"
            placeholder="Any notes about this valuation..."
            rows={2}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsValueDialogOpen(false)}>Cancel</Button>
            <Button type="submit">Add Value</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
