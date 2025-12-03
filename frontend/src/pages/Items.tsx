import { useState, useMemo } from 'react';
import { useInventoryStore, InventoryItem } from '../store/inventoryStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  MapPin,
  Tag,
  Package,
  Filter,
  X,
  Grid3x3,
  List,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'value' | 'date' | 'category';

export default function Items() {
  const { items, addItem, updateItem, deleteItem } = useInventoryStore();
  const toast = useToast();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Get unique categories and stats
  const categories = useMemo(() => {
    const cats = new Set(items.map((item) => item.category));
    return Array.from(cats).sort();
  }, [items]);

  const stats = useMemo(() => {
    const totalValue = items.reduce((sum, item) => sum + (item.currentValue || 0), 0);
    const totalPurchase = items.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
    const activeWarranties = items.filter(
      (item) => item.warrantyExpiration && new Date(item.warrantyExpiration) > new Date()
    ).length;
    
    return {
      total: items.length,
      totalValue,
      totalPurchase,
      activeWarranties,
      appreciation: totalValue - totalPurchase,
    };
  }, [items]);

  // Filter and search items
  const displayedItems = useMemo(() => {
    let filtered = [...items];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query) ||
          item.modelNumber?.toLowerCase().includes(query) ||
          item.serialNumber?.toLowerCase().includes(query)
      );
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((item) => selectedCategories.includes(item.category));
    }

    if (selectedConditions.length > 0) {
      filtered = filtered.filter((item) => selectedConditions.includes(item.condition));
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'value':
          return (b.currentValue || 0) - (a.currentValue || 0);
        case 'date':
          return (b.purchaseDate || '').localeCompare(a.purchaseDate || '');
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, searchQuery, selectedCategories, selectedConditions, sortBy]);

  const clearSearch = () => setSearchQuery('');

  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      brand: formData.get('brand') as string || undefined,
      modelNumber: formData.get('modelNumber') as string || undefined,
      serialNumber: formData.get('serialNumber') as string || undefined,
      location: formData.get('location') as string,
      purchaseDate: formData.get('purchaseDate') as string || undefined,
      purchasePrice: formData.get('purchasePrice') ? Number(formData.get('purchasePrice')) : undefined,
      currentValue: formData.get('currentValue') ? Number(formData.get('currentValue')) : undefined,
      condition: (formData.get('condition') as any) || 'good',
      warrantyExpiration: formData.get('warrantyExpiration') as string || undefined,
      notes: formData.get('notes') as string || undefined,
      photos: [],
      tags: [],
    };
    addItem(newItem);
    setIsAddDialogOpen(false);
    toast.success('Item Added', `Successfully added ${newItem.name} to inventory`);
  };

  const handleEditItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) return;

    const formData = new FormData(e.currentTarget);
    const updates: Partial<InventoryItem> = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      brand: formData.get('brand') as string || undefined,
      modelNumber: formData.get('modelNumber') as string || undefined,
      serialNumber: formData.get('serialNumber') as string || undefined,
      location: formData.get('location') as string,
      purchaseDate: formData.get('purchaseDate') as string || undefined,
      purchasePrice: formData.get('purchasePrice') ? Number(formData.get('purchasePrice')) : undefined,
      currentValue: formData.get('currentValue') ? Number(formData.get('currentValue')) : undefined,
      condition: (formData.get('condition') as any) || 'good',
      warrantyExpiration: formData.get('warrantyExpiration') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };
    updateItem(selectedItem.id, updates);
    setIsEditDialogOpen(false);
    setSelectedItem(null);
    toast.success('Item Updated', 'Successfully updated item details');
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteItem(id);
      toast.success('Item Deleted', `Removed ${name} from inventory`);
    }
  };

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const toggleCondition = (condition: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSearchQuery('');
  };

  const conditionConfig = {
    excellent: { 
      label: 'Excellent', 
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
    },
    good: { 
      label: 'Good', 
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700' 
    },
    fair: { 
      label: 'Fair', 
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
    },
    poor: { 
      label: 'Poor', 
      color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700' 
    },
  };

  const activeFilters = selectedCategories.length + selectedConditions.length;

  return (
    <div className="space-y-4 md:space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Home Inventory</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Track all your appliances and household items
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Items</p>
                <p className="text-xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
              </div>
              <Package className="w-6 h-6 md:w-8 md:h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Value</p>
                <p className="text-xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Warranties</p>
                <p className="text-xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.activeWarranties}
                </p>
              </div>
              <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border-l-4', stats.appreciation >= 0 ? 'border-l-emerald-500' : 'border-l-orange-500')}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Net Change</p>
                <p className={cn(
                  'text-xl md:text-3xl font-bold',
                  stats.appreciation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
                )}>
                  {stats.appreciation >= 0 ? '+' : ''}{formatCurrency(Math.abs(stats.appreciation))}
                </p>
              </div>
              <TrendingUp className={cn(
                'w-6 h-6 md:w-8 md:h-8 opacity-50',
                stats.appreciation >= 0 ? 'text-emerald-500' : 'text-orange-500'
              )} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, brand, model, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-10 py-2.5 rounded-lg text-sm md:text-base",
                  "bg-background border border-input text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                  "transition-colors"
                )}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)} className="relative">
              <Filter className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Filters</span>
              <span className="sm:hidden">Filter</span>
              {activeFilters > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                  {activeFilters}
                </span>
              )}
            </Button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className={cn(
                "px-3 py-2.5 rounded-lg text-sm md:text-base",
                "bg-background border border-input text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              )}
            >
              <option value="name">Sort: A-Z</option>
              <option value="value">Sort: Value</option>
              <option value="date">Sort: Date</option>
              <option value="category">Sort: Category</option>
            </select>

            {/* View Toggle */}
            <div className="hidden md:flex border border-input rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-3 py-2 transition-colors',
                  viewMode === 'grid' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-2 border-l border-input transition-colors',
                  viewMode === 'list' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              {/* Category Filters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Categories</label>
                  {selectedCategories.length > 0 && (
                    <button onClick={() => setSelectedCategories([])} className="text-xs text-primary hover:text-primary/80">
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-colors',
                        selectedCategories.includes(category)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition Filters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Condition</label>
                  {selectedConditions.length > 0 && (
                    <button onClick={() => setSelectedConditions([])} className="text-xs text-primary hover:text-primary/80">
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(conditionConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => toggleCondition(key)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-colors',
                        selectedConditions.includes(key)
                          ? config.color
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {(selectedCategories.length > 0 || selectedConditions.length > 0 || searchQuery) && (
                <div className="pt-2">
                  <Button variant="outline" onClick={clearFilters} size="sm" className="w-full">
                    <X className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      {(searchQuery || activeFilters > 0) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>Showing {displayedItems.length} of {items.length} items</span>
          <button onClick={clearFilters} className="text-primary hover:text-primary/80">
            Clear filters
          </button>
        </div>
      )}

      {/* Items Grid/List */}
      {displayedItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 md:py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery || activeFilters > 0 ? 'No items found' : 'No items yet'}
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                {searchQuery || activeFilters > 0
                  ? "Try adjusting your search or filters to find what you're looking for"
                  : 'Start building your home inventory by adding your first item'}
              </p>
              {!searchQuery && activeFilters === 0 && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Item
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {displayedItems.map((item) => {
            const condition = conditionConfig[item.condition];
            const warrantyActive = item.warrantyExpiration && new Date(item.warrantyExpiration) > new Date();
            
            return (
              <Card key={item.id} className="hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-4 md:p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-semibold text-foreground mb-1 truncate">
                        {item.name}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{item.category}</p>
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button
                        onClick={() => openEditDialog(item)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-3">
                    {item.brand && (
                      <p className="text-xs md:text-sm text-foreground">
                        <span className="font-medium">Brand:</span> {item.brand}
                      </p>
                    )}
                    {item.modelNumber && (
                      <p className="text-xs md:text-sm text-foreground truncate">
                        <span className="font-medium">Model:</span> {item.modelNumber}
                      </p>
                    )}
                    <div className="flex items-center text-xs md:text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={cn('px-2 md:px-3 py-1 rounded-full text-xs font-medium border', condition.color)}>
                      {condition.label}
                    </span>
                    {warrantyActive && (
                      <span className="px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        Under Warranty
                      </span>
                    )}
                  </div>

                  {/* Value Info */}
                  {item.currentValue && (
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Current Value</span>
                        <span className="text-base md:text-lg font-bold text-foreground">
                          {formatCurrency(item.currentValue)}
                        </span>
                      </div>
                      {item.purchasePrice && item.currentValue !== item.purchasePrice && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">Purchase Price</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(item.purchasePrice)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {item.warrantyExpiration && (
                    <div className="pt-2 mt-2 border-t border-border">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>Warranty: {formatDate(item.warrantyExpiration)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map((item) => {
            const condition = conditionConfig[item.condition];
            const warrantyActive = item.warrantyExpiration && new Date(item.warrantyExpiration) > new Date();
            
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground mb-1">{item.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Tag className="w-3 h-3 mr-1" />
                          {item.category}
                        </span>
                        {item.brand && <span>• {item.brand}</span>}
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {item.location}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={cn('px-3 py-1 rounded-full text-xs font-medium border', condition.color)}>
                        {condition.label}
                      </span>
                      {warrantyActive && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          Under Warranty
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {item.currentValue && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-foreground">
                            {formatCurrency(item.currentValue)}
                          </div>
                          {item.purchasePrice && (
                            <div className="text-xs text-muted-foreground">
                              from {formatCurrency(item.purchasePrice)}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex space-x-1">
                        <button
                          onClick={() => openEditDialog(item)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Add New Item"
        description="Add a new item to your home inventory"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddItem}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="name" label="Item Name" required placeholder="Samsung Refrigerator" />
            <Input name="category" label="Category" required placeholder="Kitchen Appliances" />
            <Input name="brand" label="Brand" placeholder="Samsung" />
            <Input name="modelNumber" label="Model Number" placeholder="RF28R7351SR" />
            <Input name="serialNumber" label="Serial Number" placeholder="ABC123456" />
            <Input name="location" label="Location" required placeholder="Kitchen" />
            <Input name="purchaseDate" label="Purchase Date" type="date" />
            <Input name="purchasePrice" label="Purchase Price" type="number" step="0.01" placeholder="2499.00" />
            <Input name="currentValue" label="Current Value" type="number" step="0.01" placeholder="2000.00" />
            <Select
              name="condition"
              label="Condition"
              options={[
                { value: 'excellent', label: 'Excellent' },
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' },
                { value: 'poor', label: 'Poor' },
              ]}
            />
            <Input name="warrantyExpiration" label="Warranty Expiration" type="date" className="md:col-span-2" />
            <Textarea name="notes" label="Notes" placeholder="Additional notes..." className="md:col-span-2" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => { setIsEditDialogOpen(false); setSelectedItem(null); }}
        title="Edit Item"
        description="Update item details"
        maxWidth="2xl"
      >
        {selectedItem && (
          <form onSubmit={handleEditItem}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="name" label="Item Name" required defaultValue={selectedItem.name} />
              <Input name="category" label="Category" required defaultValue={selectedItem.category} />
              <Input name="brand" label="Brand" defaultValue={selectedItem.brand} />
              <Input name="modelNumber" label="Model Number" defaultValue={selectedItem.modelNumber} />
              <Input name="serialNumber" label="Serial Number" defaultValue={selectedItem.serialNumber} />
              <Input name="location" label="Location" required defaultValue={selectedItem.location} />
              <Input name="purchaseDate" label="Purchase Date" type="date" defaultValue={selectedItem.purchaseDate} />
              <Input name="purchasePrice" label="Purchase Price" type="number" step="0.01" defaultValue={selectedItem.purchasePrice} />
              <Input name="currentValue" label="Current Value" type="number" step="0.01" defaultValue={selectedItem.currentValue} />
              <Select
                name="condition"
                label="Condition"
                defaultValue={selectedItem.condition}
                options={[
                  { value: 'excellent', label: 'Excellent' },
                  { value: 'good', label: 'Good' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'poor', label: 'Poor' },
                ]}
              />
              <Input name="warrantyExpiration" label="Warranty Expiration" type="date" defaultValue={selectedItem.warrantyExpiration} className="md:col-span-2" />
              <Textarea name="notes" label="Notes" defaultValue={selectedItem.notes} className="md:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedItem(null); }}>
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
