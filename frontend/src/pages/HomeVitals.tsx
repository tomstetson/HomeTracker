import { useState } from 'react';
import { 
  useHomeVitalsStore, 
  PaintColor, 
  EmergencyContact, 
  ServiceRecord 
} from '../store/homeVitalsStore';
import { useVendorStore } from '../store/vendorStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import {
  Palette, Droplets, Flame, Zap, Wind, Phone, Plus, Edit, Trash2,
  AlertTriangle, Wrench, Calendar, DollarSign, MapPin,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

type TabType = 'vitals' | 'paint' | 'service';

export default function HomeVitals() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('vitals');
  const [isPaintDialogOpen, setIsPaintDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedPaint, setSelectedPaint] = useState<PaintColor | null>(null);
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['shutoffs', 'hvac', 'contacts']));

  const {
    paintColors,
    homeVitals,
    serviceHistory,
    addPaintColor,
    updatePaintColor,
    deletePaintColor,
    updateHomeVitals,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
    addServiceRecord,
    updateServiceRecord,
    deleteServiceRecord,
  } = useHomeVitalsStore();

  const { vendors } = useVendorStore();

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Paint color handlers
  const handleSavePaint = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const paintData: PaintColor = {
      id: selectedPaint?.id || Date.now().toString(),
      room: formData.get('room') as string,
      brand: formData.get('brand') as string,
      colorName: formData.get('colorName') as string,
      colorCode: formData.get('colorCode') as string,
      hexColor: formData.get('hexColor') as string,
      finish: formData.get('finish') as PaintColor['finish'],
      surface: formData.get('surface') as PaintColor['surface'],
      dateApplied: formData.get('dateApplied') as string,
      purchaseLocation: formData.get('purchaseLocation') as string,
      notes: formData.get('notes') as string,
    };

    if (selectedPaint) {
      updatePaintColor(selectedPaint.id, paintData);
      toast.success('Paint Color Updated', `Updated ${paintData.colorName}`);
    } else {
      addPaintColor(paintData);
      toast.success('Paint Color Added', `Added ${paintData.colorName} to ${paintData.room}`);
    }
    setIsPaintDialogOpen(false);
    setSelectedPaint(null);
  };

  // Emergency contact handlers
  const handleSaveContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const contactData: EmergencyContact = {
      id: selectedContact?.id || Date.now().toString(),
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      type: formData.get('type') as EmergencyContact['type'],
      notes: formData.get('notes') as string,
    };

    if (selectedContact) {
      updateEmergencyContact(selectedContact.id, contactData);
      toast.success('Contact Updated', `Updated ${contactData.name}`);
    } else {
      addEmergencyContact(contactData);
      toast.success('Contact Added', `Added ${contactData.name}`);
    }
    setIsContactDialogOpen(false);
    setSelectedContact(null);
  };

  // Service record handlers
  const handleSaveService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const vendorId = formData.get('vendorId') as string;
    const vendor = vendors.find(v => v.id === vendorId);
    
    const serviceData: ServiceRecord = {
      id: selectedService?.id || Date.now().toString(),
      date: formData.get('date') as string,
      type: formData.get('type') as string,
      vendorId: vendorId || undefined,
      vendorName: vendor?.businessName,
      cost: formData.get('cost') ? Number(formData.get('cost')) : undefined,
      description: formData.get('description') as string,
      notes: formData.get('notes') as string,
    };

    if (selectedService) {
      updateServiceRecord(selectedService.id, serviceData);
      toast.success('Service Record Updated', 'Record updated successfully');
    } else {
      addServiceRecord(serviceData);
      toast.success('Service Record Added', 'Record added successfully');
    }
    setIsServiceDialogOpen(false);
    setSelectedService(null);
  };

  // Handle shutoff location updates
  const handleShutoffChange = (
    type: 'waterMain' | 'gasShutoff' | 'electricalPanel',
    field: 'location' | 'notes',
    value: string
  ) => {
    updateHomeVitals({
      [type]: {
        ...homeVitals[type],
        [field]: value,
      },
    });
  };

  const tabs = [
    { id: 'vitals', label: 'Emergency Info', icon: AlertTriangle },
    { id: 'paint', label: 'Paint Colors', icon: Palette },
    { id: 'service', label: 'Service History', icon: Wrench },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Home Vitals</h1>
        <p className="text-muted-foreground">Emergency info, paint colors, and service history</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted/30 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
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

      {/* Emergency Info Tab */}
      {activeTab === 'vitals' && (
        <div className="space-y-4">
          {/* Shutoff Locations */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <button
              onClick={() => toggleSection('shutoffs')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-semibold text-foreground">Shutoff Locations</h3>
              </div>
              {expandedSections.has('shutoffs') ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            
            {expandedSections.has('shutoffs') && (
              <CardContent className="pt-0 space-y-4">
                {/* Water Main */}
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Droplets className="w-5 h-5 text-blue-500" />
                    <h4 className="font-medium text-foreground">Water Main Shutoff</h4>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Location (e.g., Basement, near water heater)"
                      value={homeVitals.waterMain.location}
                      onChange={(e) => handleShutoffChange('waterMain', 'location', e.target.value)}
                    />
                    <Input
                      placeholder="Additional notes"
                      value={homeVitals.waterMain.notes}
                      onChange={(e) => handleShutoffChange('waterMain', 'notes', e.target.value)}
                    />
                  </div>
                </div>

                {/* Gas Shutoff */}
                <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h4 className="font-medium text-foreground">Gas Shutoff</h4>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Location (e.g., Outside, by meter)"
                      value={homeVitals.gasShutoff.location}
                      onChange={(e) => handleShutoffChange('gasShutoff', 'location', e.target.value)}
                    />
                    <Input
                      placeholder="Additional notes"
                      value={homeVitals.gasShutoff.notes}
                      onChange={(e) => handleShutoffChange('gasShutoff', 'notes', e.target.value)}
                    />
                  </div>
                </div>

                {/* Electrical Panel */}
                <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <h4 className="font-medium text-foreground">Electrical Panel</h4>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="Location (e.g., Garage, left wall)"
                      value={homeVitals.electricalPanel.location}
                      onChange={(e) => handleShutoffChange('electricalPanel', 'location', e.target.value)}
                    />
                    <Input
                      placeholder="Additional notes"
                      value={homeVitals.electricalPanel.notes}
                      onChange={(e) => handleShutoffChange('electricalPanel', 'notes', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* HVAC Info */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <button
              onClick={() => toggleSection('hvac')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Wind className="w-5 h-5 text-cyan-500" />
                </div>
                <h3 className="font-semibold text-foreground">HVAC Filter</h3>
              </div>
              {expandedSections.has('hvac') ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            
            {expandedSections.has('hvac') && (
              <CardContent className="pt-0">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label="Filter Size"
                    placeholder="e.g., 20x25x1"
                    value={homeVitals.hvacFilter.size}
                    onChange={(e) => updateHomeVitals({
                      hvacFilter: { ...homeVitals.hvacFilter, size: e.target.value }
                    })}
                  />
                  <Input
                    label="Brand"
                    placeholder="e.g., Filtrete"
                    value={homeVitals.hvacFilter.brand || ''}
                    onChange={(e) => updateHomeVitals({
                      hvacFilter: { ...homeVitals.hvacFilter, brand: e.target.value }
                    })}
                  />
                  <Input
                    label="Last Changed"
                    type="date"
                    value={homeVitals.hvacFilter.lastChanged || ''}
                    onChange={(e) => updateHomeVitals({
                      hvacFilter: { ...homeVitals.hvacFilter, lastChanged: e.target.value }
                    })}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Emergency Contacts */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <button
              onClick={() => toggleSection('contacts')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="font-semibold text-foreground">Emergency Contacts</h3>
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                  {homeVitals.emergencyContacts.length}
                </span>
              </div>
              {expandedSections.has('contacts') ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            
            {expandedSections.has('contacts') && (
              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  {homeVitals.emergencyContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {contact.type} • {contact.phone}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setSelectedContact(contact); setIsContactDialogOpen(true); }}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { deleteEmergencyContact(contact.id); toast.success('Contact Deleted', `Removed ${contact.name}`); }}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {homeVitals.emergencyContacts.length === 0 && (
                    <p className="text-center py-4 text-muted-foreground text-sm">
                      No emergency contacts added yet
                    </p>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => { setSelectedContact(null); setIsContactDialogOpen(true); }}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Emergency Contact
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Paint Colors Tab */}
      {activeTab === 'paint' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSelectedPaint(null); setIsPaintDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Paint Color
            </Button>
          </div>

          {paintColors.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="py-12 text-center">
                <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No Paint Colors Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Track paint colors used in each room for easy touch-ups
                </p>
                <Button onClick={() => { setSelectedPaint(null); setIsPaintDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Color
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paintColors.map((color) => (
                <Card key={color.id} className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                  {/* Color swatch */}
                  <div
                    className="h-16"
                    style={{ backgroundColor: color.hexColor || '#808080' }}
                  />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-foreground">{color.colorName}</h4>
                        <p className="text-sm text-muted-foreground">{color.room}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setSelectedPaint(color); setIsPaintDialogOpen(true); }}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { deletePaintColor(color.id); toast.success('Color Deleted', `Removed ${color.colorName}`); }}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{color.brand}</span> • {color.colorCode}
                      </p>
                      <p className="text-muted-foreground">
                        {color.finish} • {color.surface}
                      </p>
                      {color.dateApplied && (
                        <p className="text-muted-foreground text-xs">
                          Applied: {new Date(color.dateApplied).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Service History Tab */}
      {activeTab === 'service' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSelectedService(null); setIsServiceDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Service Record
            </Button>
          </div>

          {serviceHistory.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="py-12 text-center">
                <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No Service History</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Track when things are serviced to stay on top of maintenance
                </p>
                <Button onClick={() => { setSelectedService(null); setIsServiceDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Record
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {serviceHistory.map((record) => (
                <Card key={record.id} className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Wrench className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{record.type}</h4>
                          <p className="text-sm text-muted-foreground">{record.description}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm">
                            <span className="flex items-center text-muted-foreground">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(record.date).toLocaleDateString()}
                            </span>
                            {record.vendorName && (
                              <span className="flex items-center text-muted-foreground">
                                <MapPin className="w-3 h-3 mr-1" />
                                {record.vendorName}
                              </span>
                            )}
                            {record.cost && (
                              <span className="flex items-center text-muted-foreground">
                                <DollarSign className="w-3 h-3 mr-1" />
                                {formatCurrency(record.cost)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setSelectedService(record); setIsServiceDialogOpen(true); }}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { deleteServiceRecord(record.id); toast.success('Record Deleted', 'Service record removed'); }}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Paint Color Dialog */}
      <Dialog
        open={isPaintDialogOpen}
        onClose={() => { setIsPaintDialogOpen(false); setSelectedPaint(null); }}
        title={selectedPaint ? 'Edit Paint Color' : 'Add Paint Color'}
        description="Track paint colors for easy touch-ups and matching"
        maxWidth="lg"
      >
        <form onSubmit={handleSavePaint}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="room" label="Room" required placeholder="Living Room" defaultValue={selectedPaint?.room} />
            <Input name="brand" label="Brand" required placeholder="Sherwin-Williams" defaultValue={selectedPaint?.brand} />
            <Input name="colorName" label="Color Name" required placeholder="Agreeable Gray" defaultValue={selectedPaint?.colorName} />
            <Input name="colorCode" label="Color Code" placeholder="SW 7029" defaultValue={selectedPaint?.colorCode} />
            <Input name="hexColor" label="Hex Color" type="color" defaultValue={selectedPaint?.hexColor || '#808080'} />
            <Select
              name="finish"
              label="Finish"
              required
              defaultValue={selectedPaint?.finish || 'eggshell'}
              options={[
                { value: 'flat', label: 'Flat' },
                { value: 'eggshell', label: 'Eggshell' },
                { value: 'satin', label: 'Satin' },
                { value: 'semi-gloss', label: 'Semi-Gloss' },
                { value: 'gloss', label: 'Gloss' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Select
              name="surface"
              label="Surface"
              required
              defaultValue={selectedPaint?.surface || 'walls'}
              options={[
                { value: 'walls', label: 'Walls' },
                { value: 'ceiling', label: 'Ceiling' },
                { value: 'trim', label: 'Trim' },
                { value: 'doors', label: 'Doors' },
                { value: 'cabinets', label: 'Cabinets' },
                { value: 'exterior', label: 'Exterior' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input name="dateApplied" label="Date Applied" type="date" defaultValue={selectedPaint?.dateApplied} />
            <Input name="purchaseLocation" label="Where to Buy" placeholder="Home Depot" defaultValue={selectedPaint?.purchaseLocation} />
            <Textarea name="notes" label="Notes" placeholder="Additional notes..." className="md:col-span-2" defaultValue={selectedPaint?.notes} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsPaintDialogOpen(false); setSelectedPaint(null); }}>Cancel</Button>
            <Button type="submit">{selectedPaint ? 'Save Changes' : 'Add Color'}</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Emergency Contact Dialog */}
      <Dialog
        open={isContactDialogOpen}
        onClose={() => { setIsContactDialogOpen(false); setSelectedContact(null); }}
        title={selectedContact ? 'Edit Contact' : 'Add Emergency Contact'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveContact}>
          <div className="grid gap-4">
            <Input name="name" label="Name" required placeholder="John's Plumbing" defaultValue={selectedContact?.name} />
            <Input name="phone" label="Phone" required type="tel" placeholder="(555) 123-4567" defaultValue={selectedContact?.phone} />
            <Select
              name="type"
              label="Type"
              required
              defaultValue={selectedContact?.type || 'other'}
              options={[
                { value: 'plumber', label: 'Plumber' },
                { value: 'electrician', label: 'Electrician' },
                { value: 'hvac', label: 'HVAC' },
                { value: 'handyman', label: 'Handyman' },
                { value: 'locksmith', label: 'Locksmith' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Textarea name="notes" label="Notes" placeholder="Additional notes..." defaultValue={selectedContact?.notes} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsContactDialogOpen(false); setSelectedContact(null); }}>Cancel</Button>
            <Button type="submit">{selectedContact ? 'Save Changes' : 'Add Contact'}</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Service Record Dialog */}
      <Dialog
        open={isServiceDialogOpen}
        onClose={() => { setIsServiceDialogOpen(false); setSelectedService(null); }}
        title={selectedService ? 'Edit Service Record' : 'Add Service Record'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveService}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="date" label="Date" required type="date" defaultValue={selectedService?.date || new Date().toISOString().split('T')[0]} />
            <Input name="type" label="Service Type" required placeholder="HVAC Tune-up" defaultValue={selectedService?.type} />
            <Select
              name="vendorId"
              label="Vendor"
              defaultValue={selectedService?.vendorId || ''}
              options={[
                { value: '', label: 'Select vendor...' },
                ...vendors.map(v => ({ value: v.id, label: v.businessName })),
              ]}
            />
            <Input name="cost" label="Cost" type="number" step="0.01" placeholder="150.00" defaultValue={selectedService?.cost} />
            <Input name="description" label="Description" required placeholder="Annual maintenance" defaultValue={selectedService?.description} className="md:col-span-2" />
            <Textarea name="notes" label="Notes" placeholder="Additional notes..." className="md:col-span-2" defaultValue={selectedService?.notes} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsServiceDialogOpen(false); setSelectedService(null); }}>Cancel</Button>
            <Button type="submit">{selectedService ? 'Save Changes' : 'Add Record'}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}


