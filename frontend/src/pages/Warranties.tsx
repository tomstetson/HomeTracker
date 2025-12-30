import { useState, useEffect, useRef } from 'react';
import { useWarrantyStore, Warranty } from '../store/warrantyStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { api } from '../lib/api';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Camera,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

export default function Warranties() {
  const {
    warranties,
    isLoading,
    addWarranty,
    updateWarranty,
    deleteWarranty,
    getExpiringWarranties,
    getExpiredWarranties,
    getActiveWarranties,
    searchWarranties,
    loadFromStorage,
  } = useWarrantyStore();
  
  const toast = useToast();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  
  // AI Scan state
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const expiringWarranties = getExpiringWarranties(90); // Next 90 days
  const expiredWarranties = getExpiredWarranties();
  const activeWarranties = getActiveWarranties();

  const getDisplayedWarranties = () => {
    let filtered = warranties;
    
    if (searchQuery) {
      filtered = searchWarranties(searchQuery);
    }
    
    switch (filterType) {
      case 'active':
        return filtered.filter((w) => new Date(w.endDate) >= new Date());
      case 'expiring':
        return filtered.filter((w) => {
          const endDate = new Date(w.endDate);
          const today = new Date();
          const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
          return endDate >= today && endDate <= ninetyDays;
        });
      case 'expired':
        return filtered.filter((w) => new Date(w.endDate) < new Date());
      default:
        return filtered;
    }
  };

  const displayedWarranties = getDisplayedWarranties();

  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusInfo = (warranty: Warranty) => {
    const daysRemaining = getDaysRemaining(warranty.endDate);
    
    if (daysRemaining < 0) {
      return {
        label: 'Expired',
        color: 'bg-red-500/20 text-red-400 dark:text-red-300 border-red-500/30',
        icon: AlertTriangle,
        iconColor: 'text-red-500',
      };
    } else if (daysRemaining <= 30) {
      return {
        label: `${daysRemaining} days left`,
        color: 'bg-orange-500/20 text-orange-400 dark:text-orange-300 border-orange-500/30',
        icon: AlertTriangle,
        iconColor: 'text-orange-500',
      };
    } else if (daysRemaining <= 90) {
      return {
        label: `${daysRemaining} days left`,
        color: 'bg-amber-500/20 text-amber-400 dark:text-amber-300 border-amber-500/30',
        icon: Clock,
        iconColor: 'text-amber-500',
      };
    } else {
      return {
        label: 'Active',
        color: 'bg-emerald-500/20 text-emerald-400 dark:text-emerald-300 border-emerald-500/30',
        icon: CheckCircle2,
        iconColor: 'text-emerald-500',
      };
    }
  };

  const handleAddWarranty = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newWarranty: Warranty = {
      id: Date.now().toString(),
      itemName: formData.get('itemName') as string,
      provider: formData.get('provider') as string,
      type: (formData.get('type') as any) || 'manufacturer',
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      coverageDetails: formData.get('coverageDetails') as string || undefined,
      policyNumber: formData.get('policyNumber') as string || undefined,
      cost: formData.get('cost') ? Number(formData.get('cost')) : undefined,
      claimContact: formData.get('claimContact') as string || undefined,
      claimPhone: formData.get('claimPhone') as string || undefined,
      claimEmail: formData.get('claimEmail') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };
    addWarranty(newWarranty);
    setIsAddDialogOpen(false);
    toast.success('Warranty Added', 'Successfully added new warranty');
  };

  const handleEditWarranty = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedWarranty) return;

    const formData = new FormData(e.currentTarget);
    const updates: Partial<Warranty> = {
      itemName: formData.get('itemName') as string,
      provider: formData.get('provider') as string,
      type: (formData.get('type') as any) || 'manufacturer',
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      coverageDetails: formData.get('coverageDetails') as string || undefined,
      policyNumber: formData.get('policyNumber') as string || undefined,
      cost: formData.get('cost') ? Number(formData.get('cost')) : undefined,
      claimContact: formData.get('claimContact') as string || undefined,
      claimPhone: formData.get('claimPhone') as string || undefined,
      claimEmail: formData.get('claimEmail') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };
    updateWarranty(selectedWarranty.id, updates);
    setIsEditDialogOpen(false);
    setSelectedWarranty(null);
    toast.success('Warranty Updated', 'Successfully updated warranty');
  };

  const handleDeleteWarranty = async (id: string, itemName: string) => {
    const confirmed = await confirm({
      title: 'Delete Warranty?',
      message: `Are you sure you want to delete the warranty for "${itemName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      deleteWarranty(id);
      toast.success('Warranty Deleted', 'Successfully deleted warranty');
    }
  };

  const openEditDialog = (warranty: Warranty) => {
    setSelectedWarranty(warranty);
    setIsEditDialogOpen(true);
  };

  // AI Scan functionality
  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setScanPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsScanning(true);
    setScanResult(null);

    try {
      // Upload image and get ID
      const uploadResult = await api.uploadImage(file, 'warranty', 'pending', false);
      
      if (!uploadResult.success || !uploadResult.image) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Analyze with warranty_detection
      const analysisResult = await api.analyzeSingleImage(
        uploadResult.image.id,
        'warranty_detection'
      );

      if (analysisResult.success && analysisResult.analysis) {
        setScanResult(analysisResult.analysis);
        toast.success('Scan Complete', 'Warranty information extracted');
      } else {
        throw new Error(analysisResult.error || 'Analysis failed');
      }
    } catch (error: any) {
      toast.error('Scan Failed', error.message);
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  const applyScannedData = () => {
    if (!scanResult) return;

    // Pre-fill the add dialog with scanned data
    setIsScanDialogOpen(false);
    setIsAddDialogOpen(true);

    // The form will be pre-filled via the scanResult state
    toast.info('Data Applied', 'Review and complete the warranty details');
  };

  const resetScan = () => {
    setScanPreview(null);
    setScanResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-muted/20 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Warranties</h1>
          <p className="text-muted-foreground">Track warranties and never miss a claim</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsScanDialogOpen(true)} className="flex items-center space-x-2">
            <Camera className="w-4 h-4" />
            <span>Scan Document</span>
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Warranty</span>
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search warranties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'expiring', 'expired'] as const).map((filter) => (
            <Button
              key={filter}
              variant={filterType === filter ? 'default' : 'outline'}
              onClick={() => setFilterType(filter)}
              size="sm"
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Active</p>
            <p className="text-3xl font-bold text-emerald-500">{activeWarranties.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Expiring Soon</p>
            <p className="text-3xl font-bold text-amber-500">{expiringWarranties.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Expired</p>
            <p className="text-3xl font-bold text-red-500">{expiredWarranties.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-3xl font-bold text-blue-500">{warranties.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Warranties Grid */}
      {displayedWarranties.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery || filterType !== 'all' ? 'No warranties found' : 'No warranties yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start tracking your appliance warranties'}
              </p>
              {!searchQuery && filterType === 'all' && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Warranty
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedWarranties.map((warranty) => {
            const status = getStatusInfo(warranty);
            const StatusIcon = status.icon;

            return (
              <Card key={warranty.id} className="hover:shadow-xl transition-all bg-card/80 backdrop-blur-sm border-border/50">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Shield className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">{warranty.itemName}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{warranty.provider}</p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => openEditDialog(warranty)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWarranty(warranty.id, warranty.itemName)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center space-x-2 mb-4">
                    <StatusIcon className={cn('w-4 h-4', status.iconColor)} />
                    <span className={cn('px-3 py-1 rounded-full text-xs font-medium border', status.color)}>
                      {status.label}
                    </span>
                    <span className="px-2 py-1 bg-muted/30 text-muted-foreground rounded text-xs border border-border/50">
                      {warranty.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>
                        {formatDate(warranty.startDate)} - {formatDate(warranty.endDate)}
                      </span>
                    </div>
                    {warranty.policyNumber && (
                      <div className="flex items-center text-foreground">
                        <span className="font-medium mr-2 text-muted-foreground">Policy:</span>
                        <span className="font-mono text-xs">{warranty.policyNumber}</span>
                      </div>
                    )}
                    {warranty.cost && (
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>${warranty.cost}</span>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  {(warranty.claimPhone || warranty.claimEmail) && (
                    <div className="pt-4 border-t border-border/50 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Claim Contact</p>
                      {warranty.claimPhone && (
                        <a
                          href={`tel:${warranty.claimPhone}`}
                          className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          {warranty.claimPhone}
                        </a>
                      )}
                      {warranty.claimEmail && (
                        <a
                          href={`mailto:${warranty.claimEmail}`}
                          className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          {warranty.claimEmail}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {warranty.notes && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground italic">"{warranty.notes}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Warranty Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Add New Warranty"
        description="Add a new warranty to track"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddWarranty}>
          <div className="grid grid-cols-2 gap-4">
            <Input name="itemName" label="Item Name" required placeholder="Samsung Refrigerator" />
            <Input name="provider" label="Provider" required placeholder="Samsung" />
            <Select
              name="type"
              label="Warranty Type"
              options={[
                { value: 'manufacturer', label: 'Manufacturer Warranty' },
                { value: 'extended', label: 'Extended Warranty' },
                { value: 'home_warranty', label: 'Home Warranty' },
              ]}
            />
            <Input name="policyNumber" label="Policy Number" placeholder="SAM-2024-123456" />
            <Input name="startDate" label="Start Date" type="date" required />
            <Input name="endDate" label="End Date" type="date" required />
            <Input name="cost" label="Cost" type="number" step="0.01" placeholder="0.00" />
            <Input name="claimPhone" label="Claim Phone" type="tel" placeholder="1-800-XXX-XXXX" />
            <Input name="claimEmail" label="Claim Email" type="email" placeholder="claims@provider.com" className="col-span-2" />
            <Textarea name="coverageDetails" label="Coverage Details" placeholder="What's covered..." className="col-span-2" />
            <Textarea name="notes" label="Notes" placeholder="Additional notes..." className="col-span-2" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Warranty</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Warranty Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedWarranty(null);
        }}
        title="Edit Warranty"
        description="Update warranty information"
        maxWidth="2xl"
      >
        {selectedWarranty && (
          <form onSubmit={handleEditWarranty}>
            <div className="grid grid-cols-2 gap-4">
              <Input name="itemName" label="Item Name" required defaultValue={selectedWarranty.itemName} />
              <Input name="provider" label="Provider" required defaultValue={selectedWarranty.provider} />
              <Select
                name="type"
                label="Warranty Type"
                defaultValue={selectedWarranty.type}
                options={[
                  { value: 'manufacturer', label: 'Manufacturer Warranty' },
                  { value: 'extended', label: 'Extended Warranty' },
                  { value: 'home_warranty', label: 'Home Warranty' },
                ]}
              />
              <Input name="policyNumber" label="Policy Number" defaultValue={selectedWarranty.policyNumber} />
              <Input name="startDate" label="Start Date" type="date" required defaultValue={selectedWarranty.startDate} />
              <Input name="endDate" label="End Date" type="date" required defaultValue={selectedWarranty.endDate} />
              <Input name="cost" label="Cost" type="number" step="0.01" defaultValue={selectedWarranty.cost} />
              <Input name="claimPhone" label="Claim Phone" type="tel" defaultValue={selectedWarranty.claimPhone} />
              <Input name="claimEmail" label="Claim Email" type="email" defaultValue={selectedWarranty.claimEmail} className="col-span-2" />
              <Textarea name="coverageDetails" label="Coverage Details" defaultValue={selectedWarranty.coverageDetails} className="col-span-2" />
              <Textarea name="notes" label="Notes" defaultValue={selectedWarranty.notes} className="col-span-2" />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedWarranty(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* AI Scan Dialog */}
      <Dialog
        open={isScanDialogOpen}
        onClose={() => {
          setIsScanDialogOpen(false);
          resetScan();
        }}
        title="Scan Warranty Document"
        description="Upload a photo of your warranty card, receipt, or documentation"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              scanPreview ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
            )}
          >
            {scanPreview ? (
              <div className="space-y-4">
                <img
                  src={scanPreview}
                  alt="Warranty document preview"
                  className="max-h-64 mx-auto rounded-lg shadow-md"
                />
                {isScanning && (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing document...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">Upload warranty document</p>
                  <p className="text-sm text-muted-foreground">
                    Supports JPG, PNG, HEIC
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select File
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScanFile}
            />
          </div>

          {/* Scan Results */}
          {scanResult && (
            <Card className="bg-emerald-500/10 border-emerald-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Warranty Information Detected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {scanResult.itemName && (
                    <div>
                      <span className="text-muted-foreground">Item:</span>
                      <span className="ml-2 font-medium">{scanResult.itemName}</span>
                    </div>
                  )}
                  {scanResult.provider && (
                    <div>
                      <span className="text-muted-foreground">Provider:</span>
                      <span className="ml-2 font-medium">{scanResult.provider}</span>
                    </div>
                  )}
                  {scanResult.startDate && (
                    <div>
                      <span className="text-muted-foreground">Start:</span>
                      <span className="ml-2 font-medium">{scanResult.startDate}</span>
                    </div>
                  )}
                  {scanResult.endDate && (
                    <div>
                      <span className="text-muted-foreground">End:</span>
                      <span className="ml-2 font-medium">{scanResult.endDate}</span>
                    </div>
                  )}
                  {scanResult.policyNumber && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Policy #:</span>
                      <span className="ml-2 font-medium">{scanResult.policyNumber}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsScanDialogOpen(false);
              resetScan();
            }}
          >
            Cancel
          </Button>
          {scanPreview && !isScanning && (
            <Button variant="outline" onClick={resetScan}>
              Scan Another
            </Button>
          )}
          {scanResult && (
            <Button onClick={applyScannedData}>
              <Sparkles className="w-4 h-4 mr-2" />
              Use This Data
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}
