import { useState, useEffect } from 'react';
import { useVendorStore, Vendor } from '../store/vendorStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Briefcase,
  Heart,
} from 'lucide-react';
import { cn } from '../lib/utils';

const VENDOR_CATEGORIES = [
  'General Contractor',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Roofing',
  'Landscaping',
  'Painting',
  'Carpentry',
  'Flooring',
  'Drywall',
  'Appliance Repair',
  'Cleaning',
  'Pest Control',
  'Emergency',
  'Licensed',
  'Insured',
];

export default function Vendors() {
  const { vendors, isLoading, addVendor, updateVendor, deleteVendor, searchVendors, getPreferredVendors, loadFromStorage } =
    useVendorStore();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPreferred, setFilterPreferred] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const displayedVendors = filterPreferred
    ? getPreferredVendors()
    : searchQuery
    ? searchVendors(searchQuery)
    : vendors;

  const handleAddVendor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newVendor: Vendor = {
      id: Date.now().toString(),
      businessName: formData.get('businessName') as string,
      contactPerson: formData.get('contactPerson') as string || undefined,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string || undefined,
      website: formData.get('website') as string || undefined,
      address: formData.get('address') as string || undefined,
      category: selectedCategories,
      rating: 0,
      totalJobs: 0,
      notes: formData.get('notes') as string || undefined,
      isPreferred: false,
    };
    addVendor(newVendor);
    setIsAddDialogOpen(false);
    setSelectedCategories([]);
    toast.success('Vendor Added', `Successfully added ${newVendor.businessName}`);
  };

  const handleEditVendor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedVendor) return;

    const formData = new FormData(e.currentTarget);
    const updates: Partial<Vendor> = {
      businessName: formData.get('businessName') as string,
      contactPerson: formData.get('contactPerson') as string || undefined,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string || undefined,
      website: formData.get('website') as string || undefined,
      address: formData.get('address') as string || undefined,
      category: selectedCategories,
      notes: formData.get('notes') as string || undefined,
    };
    updateVendor(selectedVendor.id, updates);
    setIsEditDialogOpen(false);
    setSelectedVendor(null);
    setSelectedCategories([]);
    toast.success('Vendor Updated', 'Successfully updated vendor details');
  };

  const handleDeleteVendor = (id: string, businessName: string) => {
    if (confirm(`Are you sure you want to delete ${businessName}?`)) {
      deleteVendor(id);
      toast.success('Vendor Deleted', `Removed ${businessName} from vendors`);
    }
  };

  const togglePreferred = (id: string, currentStatus: boolean) => {
    updateVendor(id, { isPreferred: !currentStatus });
  };

  const openEditDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setSelectedCategories(vendor.category);
    setIsEditDialogOpen(true);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn('w-4 h-4', star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-muted/20 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Vendor Directory</h1>
          <p className="text-muted-foreground">Manage your trusted contractors and service providers</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Vendor</span>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <Button
          variant={filterPreferred ? 'default' : 'outline'}
          onClick={() => setFilterPreferred(!filterPreferred)}
          className="flex items-center space-x-2"
        >
          <Heart className={cn('w-4 h-4', filterPreferred && 'fill-current')} />
          <span>Preferred</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Vendors</p>
            <p className="text-2xl font-bold text-foreground">{vendors.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Preferred Vendors</p>
            <p className="text-2xl font-bold text-foreground">
              {vendors.filter((v) => v.isPreferred).length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Jobs</p>
            <p className="text-2xl font-bold text-foreground">
              {vendors.reduce((sum, v) => sum + v.totalJobs, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vendors Grid */}
      {displayedVendors.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery || filterPreferred ? 'No vendors found' : 'No vendors yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterPreferred
                  ? 'Try adjusting your filters'
                  : 'Start building your vendor directory'}
              </p>
              {!searchQuery && !filterPreferred && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Vendor
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-xl transition-all bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-6">
                {/* Vendor Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-foreground">{vendor.businessName}</h3>
                      <button
                        onClick={() => togglePreferred(vendor.id, vendor.isPreferred)}
                        className={cn(
                          'p-1 transition-colors',
                          vendor.isPreferred ? 'text-red-500' : 'text-muted-foreground/30 hover:text-red-500'
                        )}
                      >
                        <Heart className={cn('w-4 h-4', vendor.isPreferred && 'fill-current')} />
                      </button>
                    </div>
                    {vendor.contactPerson && (
                      <p className="text-sm text-muted-foreground">{vendor.contactPerson}</p>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openEditDialog(vendor)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVendor(vendor.id, vendor.businessName)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center space-x-2 mb-4">
                  {renderStars(vendor.rating)}
                  <span className="text-sm text-muted-foreground">({vendor.totalJobs} jobs)</span>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {vendor.category.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-md font-medium"
                    >
                      {cat}
                    </span>
                  ))}
                  {vendor.category.length > 3 && (
                    <span className="px-2 py-1 bg-muted/30 text-muted-foreground text-xs rounded-md">
                      +{vendor.category.length - 3}
                    </span>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  <a
                    href={`tel:${vendor.phone}`}
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {vendor.phone}
                  </a>
                  {vendor.email && (
                    <a
                      href={`mailto:${vendor.email}`}
                      className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {vendor.email}
                    </a>
                  )}
                  {vendor.website && (
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Visit Website
                    </a>
                  )}
                  {vendor.address && (
                    <div className="flex items-start text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                      <span>{vendor.address}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {vendor.notes && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground italic">"{vendor.notes}"</p>
                  </div>
                )}

                {/* Last Used */}
                {vendor.lastUsed && (
                  <div className="mt-4 text-xs text-muted-foreground">
                    Last used: {new Date(vendor.lastUsed).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Vendor Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          setSelectedCategories([]);
        }}
        title="Add New Vendor"
        description="Add a new contractor or service provider"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddVendor}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input name="businessName" label="Business Name" required placeholder="Joe's Plumbing" />
              <Input name="contactPerson" label="Contact Person" placeholder="Joe Smith" />
              <Input name="phone" label="Phone" required type="tel" placeholder="215-555-0101" />
              <Input name="email" label="Email" type="email" placeholder="joe@example.com" />
              <Input name="website" label="Website" type="url" placeholder="www.example.com" className="col-span-2" />
              <Input name="address" label="Address" placeholder="123 Main St, City, State" className="col-span-2" />
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Categories <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-2 p-3 border border-input rounded-md bg-background">
                {VENDOR_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                      selectedCategories.includes(category)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {selectedCategories.length === 0 && (
                <p className="mt-1 text-sm text-destructive">Please select at least one category</p>
              )}
            </div>

            <Textarea name="notes" label="Notes" placeholder="Add notes about this vendor..." rows={3} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setSelectedCategories([]);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={selectedCategories.length === 0}>
              Add Vendor
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedVendor(null);
          setSelectedCategories([]);
        }}
        title="Edit Vendor"
        description="Update vendor information"
        maxWidth="2xl"
      >
        {selectedVendor && (
          <form onSubmit={handleEditVendor}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input name="businessName" label="Business Name" required defaultValue={selectedVendor.businessName} />
                <Input name="contactPerson" label="Contact Person" defaultValue={selectedVendor.contactPerson} />
                <Input name="phone" label="Phone" required type="tel" defaultValue={selectedVendor.phone} />
                <Input name="email" label="Email" type="email" defaultValue={selectedVendor.email} />
                <Input name="website" label="Website" type="url" defaultValue={selectedVendor.website} className="col-span-2" />
                <Input name="address" label="Address" defaultValue={selectedVendor.address} className="col-span-2" />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Categories</label>
                <div className="flex flex-wrap gap-2 p-3 border border-input rounded-md bg-background">
                  {VENDOR_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={cn(
                        'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                        selectedCategories.includes(category)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea name="notes" label="Notes" defaultValue={selectedVendor.notes} rows={3} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedVendor(null);
                  setSelectedCategories([]);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}
