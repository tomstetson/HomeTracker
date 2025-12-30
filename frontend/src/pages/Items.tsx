import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryStore, InventoryItem, SaleRecord, ConsumableInfo } from '../store/inventoryStore';
import { useInventoryStagingStore, StagedInventoryItem } from '../store/inventoryStagingStore';
import { fileApi } from '../lib/fileApi';
import { useOptionsStore } from '../store/optionsStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { FormSection } from '../components/ui/FormSection';
import { useFormMemory } from '../hooks/useFormMemory';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  DollarSign,
  MapPin,
  Package,
  X,
  Grid3x3,
  List,
  TrendingUp,
  RotateCcw,
  ShoppingCart,
  Shield,
  Settings,
  Tag,
  RefreshCw,
  Warehouse,
  Wand2,
  CheckCircle,
  Upload,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { ItemThumbnail, ImageGallery } from '../components/ImageGallery';
import { api } from '../lib/api';
import { DocumentLinkSelector } from '../components/DocumentLinkSelector';
import { useDocumentStore } from '../store/documentStore';
import { FileText } from 'lucide-react';

type ViewMode = 'grid' | 'list';
type TabType = 'active' | 'pending' | 'sold' | 'trash';
type SortBy = 'name' | 'value' | 'date' | 'category';

export default function Items() {
  const { 
    items, 
    addItem, 
    updateItem, 
    softDeleteItem,
    restoreItem,
    permanentlyDeleteItem,
    emptyTrash,
    sellItem,
    getActiveItems,
    getSoldItems,
    getDeletedItems,
    getTotalValue,
    getTotalSaleRecoup,
  } = useInventoryStore();
  
  // Get staged items from Inventory Wizard
  const { 
    stagedItems, 
    approveItem: approveStagedItem, 
    rejectItem: rejectStagedItem,
    stagedImages,
  } = useInventoryStagingStore();
  
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { updateDocument } = useDocumentStore();
  
  // Form memory - remember last used category and location
  const { lastUsed, rememberAll } = useFormMemory('items', { 
    fields: ['category', 'location'] 
  });
  
  // View state
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories] = useState<string[]>([]);
  const [selectedConditions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  
  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newCategory, setNewCategory] = useState('');
  
  // Staged images for new item creation
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const addImageInputRef = useRef<HTMLInputElement>(null);

  // Get pending staged items count
  const pendingItemsCount = stagedItems.filter(i => i.status === 'pending').length;

  // Get items based on active tab
  const tabItems = useMemo(() => {
    switch (activeTab) {
      case 'active': return getActiveItems();
      case 'pending': return []; // Pending items handled separately
      case 'sold': return getSoldItems();
      case 'trash': return getDeletedItems();
      default: return [];
    }
  }, [activeTab, items, getActiveItems, getSoldItems, getDeletedItems]);
  
  // Get pending staged items for review
  const pendingStagedItems = useMemo(() => {
    return stagedItems.filter(i => i.status === 'pending');
  }, [stagedItems]);
  
  // Handle approving a staged item (add to inventory)
  const handleApproveStagedItem = (item: StagedInventoryItem) => {
    const inventoryItem: InventoryItem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name,
      category: item.category,
      brand: item.brand,
      modelNumber: item.modelNumber,
      location: item.location || 'Unspecified',
      purchaseDate: item.purchaseDate,
      purchasePrice: item.purchasePrice,
      condition: item.condition,
      photos: item.imageIds.map(id => fileApi.getViewUrl(id)),
      tags: [],
      status: 'active',
    };
    
    addItem(inventoryItem);
    approveStagedItem(item.id);
    toast.success('Added to inventory', item.name);
  };
  
  // Handle rejecting a staged item
  const handleRejectStagedItem = async (item: StagedInventoryItem) => {
    const confirmed = await confirm({
      title: 'Remove Item?',
      message: `Remove "${item.name}" from pending review?`,
      confirmText: 'Remove',
      variant: 'danger',
    });
    
    if (confirmed) {
      rejectStagedItem(item.id);
      toast.info('Item removed', item.name);
    }
  };
  
  // Approve all pending items
  const handleApproveAllPending = async () => {
    if (pendingStagedItems.length === 0) return;
    
    const confirmed = await confirm({
      title: 'Approve All Items?',
      message: `Add ${pendingStagedItems.length} items to your inventory?`,
      confirmText: 'Approve All',
    });
    
    if (confirmed) {
      for (const item of pendingStagedItems) {
        handleApproveStagedItem(item);
      }
    }
  };

  // Stats
  const stats = useMemo(() => {
    const activeItems = getActiveItems();
    const totalValue = getTotalValue();
    const saleRecoup = getTotalSaleRecoup();
    const expiringWarranties = activeItems.filter((item) => {
      if (!item.warranty?.endDate) return false;
      const endDate = new Date(item.warranty.endDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return endDate > new Date() && endDate <= thirtyDaysFromNow;
    }).length;
    
    return {
      totalItems: activeItems.length,
      totalValue,
      soldItems: getSoldItems().length,
      trashedItems: getDeletedItems().length,
      expiringWarranties,
      saleRecoup,
    };
  }, [items, getActiveItems, getSoldItems, getDeletedItems, getTotalValue, getTotalSaleRecoup]);

  // Filter and search
  const displayedItems = useMemo(() => {
    let filtered = [...tabItems];

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
        case 'name': return a.name.localeCompare(b.name);
        case 'value': return (b.currentValue || 0) - (a.currentValue || 0);
        case 'date': return (b.purchaseDate || '').localeCompare(a.purchaseDate || '');
        case 'category': return a.category.localeCompare(b.category);
        default: return 0;
      }
    });

    return filtered;
  }, [tabItems, searchQuery, selectedCategories, selectedConditions, sortBy]);

  // Handle staged image file selection for new items
  const handleStagedFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles = Array.from(files);
    if (stagedFiles.length + newFiles.length > 10) {
      toast.warning('Too many images', 'Maximum 10 images allowed per item');
      return;
    }
    
    // Create preview URLs
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setStagedFiles(prev => [...prev, ...newFiles]);
    setStagedPreviews(prev => [...prev, ...newPreviews]);
    
    // Reset input
    if (addImageInputRef.current) {
      addImageInputRef.current.value = '';
    }
  };
  
  // Remove a staged image
  const removeStagedImage = (index: number) => {
    URL.revokeObjectURL(stagedPreviews[index]);
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
    setStagedPreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  // Clear all staged images
  const clearStagedImages = () => {
    stagedPreviews.forEach(url => URL.revokeObjectURL(url));
    setStagedFiles([]);
    setStagedPreviews([]);
  };

  // Form handlers
  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Build consumable info if checkbox is checked or has data
    const isConsumable = formData.get('isConsumable') === 'on';
    const partStorageLocation = formData.get('partStorageLocation') as string;
    const stockQuantity = formData.get('stockQuantity') as string;
    const replacementInterval = formData.get('replacementInterval') as string;
    const lastReplaced = formData.get('lastReplaced') as string;
    const reorderUrl = formData.get('reorderUrl') as string;
    const linkedApplianceId = formData.get('linkedApplianceId') as string;
    
    let consumableInfo: ConsumableInfo | undefined;
    if (isConsumable || partStorageLocation || stockQuantity) {
      // Calculate next replacement date if we have interval and last replaced
      let nextReplacementDate: string | undefined;
      if (lastReplaced && replacementInterval) {
        const next = new Date(lastReplaced);
        next.setMonth(next.getMonth() + parseInt(replacementInterval));
        nextReplacementDate = next.toISOString().split('T')[0];
      }
      
      consumableInfo = {
        isConsumable: true,
        replacementStorageLocation: partStorageLocation || undefined,
        stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined,
        replacementIntervalMonths: replacementInterval ? parseInt(replacementInterval) : undefined,
        lastReplacedDate: lastReplaced || undefined,
        nextReplacementDate,
        reorderUrl: reorderUrl || undefined,
        linkedApplianceId: linkedApplianceId || undefined,
      };
    }
    
    const itemId = Date.now().toString();
    const newItem: InventoryItem = {
      id: itemId,
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      brand: formData.get('brand') as string || undefined,
      modelNumber: formData.get('modelNumber') as string || undefined,
      serialNumber: formData.get('serialNumber') as string || undefined,
      location: formData.get('location') as string,
      purchaseDate: formData.get('purchaseDate') as string || undefined,
      purchasePrice: formData.get('purchasePrice') ? parseFloat(formData.get('purchasePrice') as string) : undefined,
      currentValue: formData.get('currentValue') ? parseFloat(formData.get('currentValue') as string) : undefined,
      condition: formData.get('condition') as InventoryItem['condition'],
      notes: formData.get('notes') as string || undefined,
      photos: [],
      tags: [],
      status: 'active',
      warranty: {
        provider: formData.get('warrantyProvider') as string || undefined,
        endDate: formData.get('warrantyEndDate') as string || undefined,
        coverageDetails: formData.get('warrantyCoverage') as string || undefined,
        policyNumber: formData.get('warrantyPolicyNumber') as string || undefined,
      },
      consumableInfo,
    };

    // Clean up empty warranty
    if (!newItem.warranty?.provider && !newItem.warranty?.endDate) {
      delete newItem.warranty;
    }

    // Add item to store
    addItem(newItem);
    
    // Upload staged images if any
    if (stagedFiles.length > 0) {
      setIsUploadingImages(true);
      try {
        let uploadedCount = 0;
        for (let i = 0; i < stagedFiles.length; i++) {
          const file = stagedFiles[i];
          const isPrimary = i === 0; // First image is primary
          const result = await api.uploadImage(file, 'item', itemId, isPrimary);
          if (result.success) {
            uploadedCount++;
          }
        }
        if (uploadedCount > 0) {
          toast.success('Images Uploaded', `${uploadedCount} image(s) added to ${newItem.name}`);
        }
      } catch (error) {
        console.error('Failed to upload images:', error);
        toast.warning('Images Not Uploaded', 'Item saved but images failed to upload. Edit the item to retry.');
      } finally {
        setIsUploadingImages(false);
        clearStagedImages();
      }
    }
    
    setIsAddDialogOpen(false);
    toast.success('Item Added', `${newItem.name} has been added to inventory`);
  };

  // Quick Add handler - minimal fields with optional image
  const handleQuickAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const category = formData.get('category') as string || 'Other';
    const location = formData.get('location') as string || 'Unspecified';
    
    // Remember category and location for next time
    rememberAll({ category, location });
    
    const itemId = Date.now().toString();
    const newItem: InventoryItem = {
      id: itemId,
      name: formData.get('name') as string,
      category,
      location,
      condition: 'good',
      photos: [],
      tags: [],
      status: 'active',
    };
    
    addItem(newItem);
    
    // Upload staged images if any
    if (stagedFiles.length > 0) {
      setIsUploadingImages(true);
      try {
        let uploadedCount = 0;
        for (let i = 0; i < stagedFiles.length; i++) {
          const file = stagedFiles[i];
          const isPrimary = i === 0;
          const result = await api.uploadImage(file, 'item', itemId, isPrimary);
          if (result.success) {
            uploadedCount++;
          }
        }
        if (uploadedCount > 0) {
          toast.success('Images Uploaded', `${uploadedCount} image(s) added to ${newItem.name}`);
        }
      } catch (error) {
        console.error('Failed to upload images:', error);
        toast.warning('Images Not Uploaded', 'Item saved but images failed to upload. Edit the item to retry.');
      } finally {
        setIsUploadingImages(false);
        clearStagedImages();
      }
    }
    
    setIsQuickAddOpen(false);
    toast.success('Item Added', `${newItem.name} has been added to inventory`);
  };

  const handleEditItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    const formData = new FormData(e.currentTarget);
    
    // Build consumable info
    const isConsumable = formData.get('isConsumable') === 'on';
    const partStorageLocation = formData.get('partStorageLocation') as string;
    const stockQuantity = formData.get('stockQuantity') as string;
    const replacementInterval = formData.get('replacementInterval') as string;
    const lastReplaced = formData.get('lastReplaced') as string;
    const reorderUrl = formData.get('reorderUrl') as string;
    const linkedApplianceId = formData.get('linkedApplianceId') as string;
    
    let consumableInfo: ConsumableInfo | undefined;
    if (isConsumable || partStorageLocation || stockQuantity) {
      // Calculate next replacement date if we have interval and last replaced
      let nextReplacementDate: string | undefined = selectedItem.consumableInfo?.nextReplacementDate;
      if (lastReplaced && replacementInterval) {
        const next = new Date(lastReplaced);
        next.setMonth(next.getMonth() + parseInt(replacementInterval));
        nextReplacementDate = next.toISOString().split('T')[0];
      }
      
      consumableInfo = {
        isConsumable: true,
        replacementStorageLocation: partStorageLocation || undefined,
        stockQuantity: stockQuantity ? parseInt(stockQuantity) : undefined,
        replacementIntervalMonths: replacementInterval ? parseInt(replacementInterval) : undefined,
        lastReplacedDate: lastReplaced || undefined,
        nextReplacementDate,
        reorderUrl: reorderUrl || undefined,
        linkedApplianceId: linkedApplianceId || undefined,
      };
    }
    
    const updates: Partial<InventoryItem> = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      brand: formData.get('brand') as string || undefined,
      modelNumber: formData.get('modelNumber') as string || undefined,
      serialNumber: formData.get('serialNumber') as string || undefined,
      location: formData.get('location') as string,
      purchaseDate: formData.get('purchaseDate') as string || undefined,
      purchasePrice: formData.get('purchasePrice') ? parseFloat(formData.get('purchasePrice') as string) : undefined,
      currentValue: formData.get('currentValue') ? parseFloat(formData.get('currentValue') as string) : undefined,
      condition: formData.get('condition') as InventoryItem['condition'],
      notes: formData.get('notes') as string || undefined,
      warranty: {
        provider: formData.get('warrantyProvider') as string || undefined,
        endDate: formData.get('warrantyEndDate') as string || undefined,
        coverageDetails: formData.get('warrantyCoverage') as string || undefined,
        policyNumber: formData.get('warrantyPolicyNumber') as string || undefined,
      },
      consumableInfo,
    };

    updateItem(selectedItem.id, updates);
    setIsEditDialogOpen(false);
    setSelectedItem(null);
    toast.success('Item Updated', 'Changes have been saved');
  };

  const handleSoftDelete = () => {
    if (!selectedItem) return;
    softDeleteItem(selectedItem.id);
    setIsDeleteDialogOpen(false);
    setSelectedItem(null);
    toast.info('Item Moved to Trash', 'You can restore it within 180 days');
  };

  const handleRestore = (item: InventoryItem) => {
    restoreItem(item.id);
    toast.success('Item Restored', `${item.name} is back in your inventory`);
  };

  const handlePermanentDelete = (item: InventoryItem) => {
    permanentlyDeleteItem(item.id);
    toast.success('Permanently Deleted', 'Item has been removed forever');
  };

  const handleSellItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    const formData = new FormData(e.currentTarget);
    const sale: SaleRecord = {
      saleDate: formData.get('saleDate') as string,
      salePrice: parseFloat(formData.get('salePrice') as string),
      buyer: formData.get('buyer') as string || undefined,
      platform: formData.get('platform') as string || undefined,
      notes: formData.get('saleNotes') as string || undefined,
    };

    sellItem(selectedItem.id, sale);
    setIsSellDialogOpen(false);
    
    const profit = sale.salePrice - (selectedItem.purchasePrice || 0);
    toast.success(
      'Item Sold!', 
      `${selectedItem.name} sold for ${formatCurrency(sale.salePrice)}${profit >= 0 ? ` (+${formatCurrency(profit)})` : ` (${formatCurrency(profit)})`}`
    );
    setSelectedItem(null);
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addOption('inventoryCategories', newCategory.trim());
      setNewCategory('');
      toast.success('Category Added', `"${newCategory.trim()}" is now available`);
    }
  };

  // Document linking handlers
  const handleLinkDocument = (docId: string) => {
    if (!selectedItem) return;
    updateDocument(docId, {
      relatedTo: selectedItem.id,
      relatedType: 'item',
    });
    toast.success('Linked', 'Document linked to this item');
  };

  const handleUnlinkDocument = (docId: string) => {
    updateDocument(docId, {
      relatedTo: undefined,
      relatedType: undefined,
    });
    toast.info('Unlinked', 'Document unlinked from item');
  };

  // Condition options
  const conditionOptions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  // Get options from centralized store
  const { getOptions, addOption, removeOption, isDefault } = useOptionsStore();
  const inventoryCategories = getOptions('inventoryCategories');
  const sellPlatforms = getOptions('sellPlatforms');
  
  // Platform options for selling
  const platformOptions = [
    { value: '', label: 'Select platform...' },
    ...sellPlatforms.map(p => ({ value: p, label: p })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Track your home items, warranties, and sales</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)} className="hidden sm:flex">
            <Settings className="w-4 h-4 mr-2" />
            Categories
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/inventory-wizard')}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 hover:from-purple-600 hover:to-blue-600"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">AI </span>Wizard
          </Button>
          <Button onClick={() => setIsQuickAddOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            Quick Add
          </Button>
          <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
            <Settings className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Detailed</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Items</p>
                <p className="text-xl font-bold text-foreground">{stats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Sold</p>
                <p className="text-xl font-bold text-foreground">{stats.soldItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                stats.saleRecoup.profit >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
              )}>
                <TrendingUp className={cn(
                  "w-5 h-5",
                  stats.saleRecoup.profit >= 0 ? "text-emerald-500" : "text-red-500"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sale Profit/Loss</p>
                <p className={cn(
                  "text-xl font-bold",
                  stats.saleRecoup.profit >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {stats.saleRecoup.profit >= 0 ? '+' : ''}{formatCurrency(stats.saleRecoup.profit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border/50 pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-md transition-colors",
            activeTab === 'active' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="w-4 h-4" />
          Active ({stats.totalItems})
        </button>
        {pendingItemsCount > 0 && (
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-md transition-colors",
              activeTab === 'pending' 
                ? "text-amber-500 border-b-2 border-amber-500" 
                : "text-amber-500/70 hover:text-amber-500"
            )}
          >
            <Wand2 className="w-4 h-4" />
            Pending Review ({pendingItemsCount})
          </button>
        )}
        <button
          onClick={() => setActiveTab('sold')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-md transition-colors",
            activeTab === 'sold' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingCart className="w-4 h-4" />
          Sold ({stats.soldItems})
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-md transition-colors",
            activeTab === 'trash' 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Trash2 className="w-4 h-4" />
          Trash ({stats.trashedItems})
        </button>
        {activeTab === 'trash' && stats.trashedItems > 0 && (
          <Button 
            variant="destructive" 
            size="sm" 
            className="ml-auto"
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Empty Trash?',
                message: `This will permanently delete ${stats.trashedItems} item${stats.trashedItems > 1 ? 's' : ''}. This action cannot be undone.`,
                confirmText: 'Delete Permanently',
                cancelText: 'Cancel',
                variant: 'danger',
              });
              if (confirmed) {
                emptyTrash();
                toast.success('Trash Emptied', 'All items permanently deleted');
              }
            }}
          >
            Empty Trash
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            options={[
              { value: 'name', label: 'Sort by Name' },
              { value: 'value', label: 'Sort by Value' },
              { value: 'date', label: 'Sort by Date' },
              { value: 'category', label: 'Sort by Category' },
            ]}
          />
          <div className="flex border border-input rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'grid' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              )}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pending Items from AI Wizard */}
      {activeTab === 'pending' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Items detected by AI Wizard awaiting your review
            </p>
            {pendingStagedItems.length > 0 && (
              <Button onClick={handleApproveAllPending} variant="outline" size="sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve All ({pendingStagedItems.length})
              </Button>
            )}
          </div>
          
          {pendingStagedItems.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-12 text-center">
                <Wand2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No pending items</h3>
                <p className="text-muted-foreground mb-4">
                  Use the AI Wizard to quickly add multiple items from photos
                </p>
                <Button onClick={() => navigate('/inventory-wizard')}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Open AI Wizard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingStagedItems.map((item) => {
                const primaryImage = stagedImages.find(img => img.id === item.primaryImageId);
                return (
                  <Card key={item.id} className="bg-amber-500/5 border-amber-500/30 overflow-hidden">
                    {/* Image Preview */}
                    <div className="aspect-video bg-muted relative flex items-center justify-center">
                      {primaryImage?.thumbnailUrl ? (
                        <img
                          src={primaryImage.thumbnailUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Package className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500 text-white text-xs rounded">
                        AI Detected
                      </div>
                    </div>
                    
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.category} {item.brand && `• ${item.brand}`}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {item.location || 'No location set'}
                      </div>
                      
                      {/* Confidence indicator */}
                      {item.confidence && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Confidence:</span>
                          <div className="flex gap-1">
                            {['name', 'category', 'brand'].map((key) => (
                              <div
                                key={key}
                                className={cn(
                                  "w-4 h-4 rounded text-[10px] flex items-center justify-center font-medium",
                                  (item.confidence?.[key as keyof typeof item.confidence] || 0) > 0.8
                                    ? "bg-green-500/20 text-green-500"
                                    : (item.confidence?.[key as keyof typeof item.confidence] || 0) > 0.5
                                    ? "bg-yellow-500/20 text-yellow-500"
                                    : "bg-red-500/20 text-red-500"
                                )}
                                title={`${key}: ${Math.round((item.confidence?.[key as keyof typeof item.confidence] || 0) * 100)}%`}
                              >
                                {key[0].toUpperCase()}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleApproveStagedItem(item)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectStagedItem(item)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : displayedItems.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {activeTab === 'active' ? 'No items in inventory' : 
               activeTab === 'sold' ? 'No items sold yet' : 
               'Trash is empty'}
            </h3>
            <p className="text-muted-foreground">
              {activeTab === 'active' ? 'Add your first item to start tracking' : 
               activeTab === 'sold' ? 'Sold items will appear here' : 
               'Deleted items will appear here for 180 days'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedItems.map((item) => (
            <Card 
              key={item.id} 
              className={cn(
                "bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all overflow-hidden",
                item.status === 'sold' && "border-purple-500/30",
                item.status === 'deleted' && "opacity-75"
              )}
            >
              {/* Item Thumbnail */}
              <ItemThumbnail 
                entityType="item" 
                entityId={item.id} 
                className="w-full h-32"
              />
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded-full",
                    item.condition === 'excellent' && "bg-emerald-500/20 text-emerald-500",
                    item.condition === 'good' && "bg-blue-500/20 text-blue-500",
                    item.condition === 'fair' && "bg-amber-500/20 text-amber-500",
                    item.condition === 'poor' && "bg-red-500/20 text-red-500"
                  )}>
                    {item.condition}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  {item.brand && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Tag className="w-3 h-3" />
                      {item.brand} {item.modelNumber && `• ${item.modelNumber}`}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {item.location}
                  </div>
                  {item.currentValue && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(item.currentValue)}
                    </div>
                  )}
                  {item.warranty?.endDate && (
                    <div className={cn(
                      "flex items-center gap-2",
                      new Date(item.warranty.endDate) < new Date() 
                        ? "text-red-500" 
                        : "text-emerald-500"
                    )}>
                      <Shield className="w-3 h-3" />
                      Warranty: {formatDate(item.warranty.endDate)}
                    </div>
                  )}
                  {item.status === 'sold' && item.sale && (
                    <div className="flex items-center gap-2 text-purple-500">
                      <ShoppingCart className="w-3 h-3" />
                      Sold: {formatCurrency(item.sale.salePrice)} on {formatDate(item.sale.saleDate)}
                    </div>
                  )}
                  {item.consumableInfo?.isConsumable && (
                    <>
                      <div className="flex items-center gap-2 text-amber-500">
                        <RefreshCw className="w-3 h-3" />
                        Consumable
                        {item.consumableInfo.nextReplacementDate && (
                          <span className={cn(
                            "text-xs",
                            new Date(item.consumableInfo.nextReplacementDate) < new Date() && "text-red-500"
                          )}>
                            • Due: {formatDate(item.consumableInfo.nextReplacementDate)}
                          </span>
                        )}
                      </div>
                      {item.consumableInfo.replacementStorageLocation && (
                        <div className="flex items-center gap-2 text-blue-500">
                          <Warehouse className="w-3 h-3" />
                          Spares: {item.consumableInfo.replacementStorageLocation}
                          {item.consumableInfo.stockQuantity !== undefined && (
                            <span className={cn(
                              "px-1.5 py-0.5 text-xs rounded",
                              item.consumableInfo.stockQuantity === 0 
                                ? "bg-red-500/20 text-red-500" 
                                : "bg-blue-500/20"
                            )}>
                              {item.consumableInfo.stockQuantity} in stock
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                  {item.status === 'active' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setSelectedItem(item); setIsEditDialogOpen(true); }}
                      >
                        <Edit className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedItem(item); setIsSellDialogOpen(true); }}
                      >
                        <ShoppingCart className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  {item.status === 'deleted' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRestore(item)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handlePermanentDelete(item)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  {item.status === 'sold' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setSelectedItem(item); setIsEditDialogOpen(true); }}
                    >
                      <Edit className="w-3 h-3 mr-1" /> View Details
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <div className="divide-y divide-border/50">
            {displayedItems.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <ItemThumbnail 
                    entityType="item" 
                    entityId={item.id} 
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{item.name}</h3>
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full",
                      item.condition === 'excellent' && "bg-emerald-500/20 text-emerald-500",
                      item.condition === 'good' && "bg-blue-500/20 text-blue-500",
                      item.condition === 'fair' && "bg-amber-500/20 text-amber-500",
                      item.condition === 'poor' && "bg-red-500/20 text-red-500"
                    )}>
                      {item.condition}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.category} • {item.location}
                    {item.brand && ` • ${item.brand}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{formatCurrency(item.currentValue || 0)}</p>
                  {item.warranty?.endDate && (
                    <p className={cn(
                      "text-xs",
                      new Date(item.warranty.endDate) < new Date() ? "text-red-500" : "text-muted-foreground"
                    )}>
                      Warranty: {formatDate(item.warranty.endDate)}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  {item.status === 'active' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedItem(item); setIsEditDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedItem(item); setIsSellDialogOpen(true); }}>
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {item.status === 'deleted' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleRestore(item)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handlePermanentDelete(item)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => { setIsAddDialogOpen(false); clearStagedImages(); }} title="Add New Item">
        <form onSubmit={handleAddItem} className="space-y-4">
          {/* Basic Info - Always visible */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Item Name" name="name" required placeholder="e.g., Samsung Refrigerator" />
              <Select
                label="Category"
                name="category"
                required
                options={inventoryCategories.map(c => ({ value: c, label: c }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Location" name="location" required placeholder="e.g., Kitchen" />
              <Select
                label="Condition"
                name="condition"
                required
                options={conditionOptions}
              />
            </div>
          </div>

          {/* Images Section - Collapsible */}
          <FormSection
            title="Photos"
            description="Add images of the item"
            icon={<ImageIcon className="w-4 h-4 text-blue-500" />}
            hasData={stagedPreviews.length > 0}
            badge={stagedPreviews.length > 0 ? `${stagedPreviews.length}` : undefined}
          >
            {stagedPreviews.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {stagedPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeStagedImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded">Primary</span>
                    )}
                  </div>
                ))}
                {stagedPreviews.length < 10 && (
                  <button
                    type="button"
                    onClick={() => addImageInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-blue-500/30 flex flex-col items-center justify-center text-blue-500 hover:border-blue-500 hover:bg-blue-500/10 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-xs mt-1">Add</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addImageInputRef.current?.click()}
                className="w-full py-6 rounded-lg border-2 border-dashed border-blue-500/30 flex flex-col items-center justify-center text-muted-foreground hover:border-blue-500 hover:text-blue-500 transition-colors"
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm mt-2">Click to add photos</span>
                <span className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC up to 10MB each</span>
              </button>
            )}
            <input ref={addImageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleStagedFileSelect} />
          </FormSection>

          {/* Purchase Details - Collapsible */}
          <FormSection
            title="Purchase Details"
            description="Price, date, and model info"
            icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <Input label="Brand" name="brand" placeholder="e.g., Samsung" />
              <Input label="Model Number" name="modelNumber" placeholder="e.g., RF28R7351SR" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Serial Number" name="serialNumber" placeholder="e.g., ABC123456" />
              <Input label="Purchase Date" name="purchaseDate" type="date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Purchase Price" name="purchasePrice" type="number" step="0.01" placeholder="0.00" />
              <Input label="Current Value" name="currentValue" type="number" step="0.01" placeholder="0.00" />
            </div>
          </FormSection>
          
          {/* Warranty Section - Collapsible */}
          <FormSection
            title="Warranty"
            description="Coverage and expiration details"
            icon={<Shield className="w-4 h-4 text-blue-500" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <Input label="Warranty Provider" name="warrantyProvider" placeholder="e.g., Samsung" />
              <Input label="Warranty End Date" name="warrantyEndDate" type="date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Policy Number" name="warrantyPolicyNumber" placeholder="Optional" />
              <Input label="Coverage Details" name="warrantyCoverage" placeholder="e.g., 2-year full coverage" />
            </div>
          </FormSection>

          {/* Consumable/Replacement Part Section - Collapsible */}
          <FormSection
            title="Replacement Tracking"
            description="For filters, batteries, and other consumables"
            icon={<RefreshCw className="w-4 h-4 text-amber-500" />}
          >
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isConsumable" className="rounded border-border" />
                <span className="text-sm text-foreground">This is a consumable/replacement part</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Storage Location" name="partStorageLocation" placeholder="e.g., Garage cabinet" />
                <Input label="Stock Quantity" name="stockQuantity" type="number" min="0" placeholder="How many spares?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Replace Every (months)" name="replacementInterval" type="number" min="1" placeholder="e.g., 6" />
                <Input label="Last Replaced" name="lastReplaced" type="date" />
              </div>
              <Input label="Reorder URL" name="reorderUrl" type="url" placeholder="https://amazon.com/..." />
              <Select
                label="Linked Appliance"
                name="linkedApplianceId"
                options={[
                  { value: '', label: 'Select appliance this part is for...' },
                  ...getActiveItems().map(item => ({ value: item.id, label: `${item.name}${item.location ? ` (${item.location})` : ''}` }))
                ]}
              />
            </div>
          </FormSection>

          <Textarea label="Notes" name="notes" placeholder="Any additional notes..." rows={2} />
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); clearStagedImages(); }} disabled={isUploadingImages}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploadingImages}>
              {isUploadingImages ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>Add Item{stagedFiles.length > 0 && ` + ${stagedFiles.length} Photo${stagedFiles.length > 1 ? 's' : ''}`}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Quick Add Dialog */}
      <Dialog open={isQuickAddOpen} onClose={() => { setIsQuickAddOpen(false); clearStagedImages(); }} title="Quick Add Item">
        <form onSubmit={handleQuickAdd} className="space-y-4">
          <Input label="Item Name" name="name" required placeholder="What is this item?" autoFocus />
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              name="category"
              defaultValue={lastUsed.category}
              options={inventoryCategories.map(c => ({ value: c, label: c }))}
            />
            <Input 
              label="Location" 
              name="location" 
              defaultValue={lastUsed.location}
              placeholder="e.g., Kitchen, Garage" 
            />
          </div>

          {/* Quick Image Upload */}
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            {stagedPreviews.length > 0 ? (
              <div className="flex items-center gap-2">
                {stagedPreviews.slice(0, 4).map((preview, index) => (
                  <div key={index} className="relative w-14 h-14 rounded overflow-hidden group">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeStagedImage(index)}
                      className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-amber-500 text-white text-[8px] text-center">Primary</span>
                    )}
                  </div>
                ))}
                {stagedPreviews.length > 4 && (
                  <span className="text-sm text-muted-foreground">+{stagedPreviews.length - 4}</span>
                )}
                <button
                  type="button"
                  onClick={() => addImageInputRef.current?.click()}
                  className="w-14 h-14 rounded border-2 border-dashed border-blue-500/30 flex items-center justify-center text-blue-500 hover:bg-blue-500/10"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addImageInputRef.current?.click()}
                className="w-full py-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span className="text-sm">Add photo (optional)</span>
              </button>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsQuickAddOpen(false); clearStagedImages(); }} disabled={isUploadingImages}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploadingImages}>
              {isUploadingImages ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add{stagedFiles.length > 0 && ` + ${stagedFiles.length} Photo${stagedFiles.length > 1 ? 's' : ''}`}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => { setIsEditDialogOpen(false); setSelectedItem(null); }} title="Edit Item">
        {selectedItem && (
          <form onSubmit={handleEditItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Item Name" name="name" required defaultValue={selectedItem.name} />
              <Select
                label="Category"
                name="category"
                required
                value={selectedItem.category}
                options={inventoryCategories.map(c => ({ value: c, label: c }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Brand" name="brand" defaultValue={selectedItem.brand} />
              <Input label="Model Number" name="modelNumber" defaultValue={selectedItem.modelNumber} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Serial Number" name="serialNumber" defaultValue={selectedItem.serialNumber} />
              <Input label="Location" name="location" required defaultValue={selectedItem.location} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Purchase Date" name="purchaseDate" type="date" defaultValue={selectedItem.purchaseDate} />
              <Input label="Purchase Price" name="purchasePrice" type="number" step="0.01" defaultValue={selectedItem.purchasePrice} />
              <Input label="Current Value" name="currentValue" type="number" step="0.01" defaultValue={selectedItem.currentValue} />
            </div>
            <Select
              label="Condition"
              name="condition"
              required
              value={selectedItem.condition}
              options={conditionOptions}
            />

            {/* Images Section */}
            <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
              <h4 className="font-medium text-foreground mb-3">Images</h4>
              <ImageGallery
                entityType="item"
                entityId={selectedItem.id}
                editable={selectedItem.status === 'active'}
                maxImages={10}
              />
            </div>

            {/* Documents Section - Bidirectional linking */}
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Linked Documents
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Link manuals, warranties, receipts, and other documents to this item
              </p>
              <DocumentLinkSelector
                itemId={selectedItem.id}
                onLink={handleLinkDocument}
                onUnlink={handleUnlinkDocument}
              />
            </div>
            
            {/* Warranty Section */}
            <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Warranty Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Warranty Provider" name="warrantyProvider" defaultValue={selectedItem.warranty?.provider} />
                <Input label="Warranty End Date" name="warrantyEndDate" type="date" defaultValue={selectedItem.warranty?.endDate} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input label="Policy Number" name="warrantyPolicyNumber" defaultValue={selectedItem.warranty?.policyNumber} />
                <Input label="Coverage Details" name="warrantyCoverage" defaultValue={selectedItem.warranty?.coverageDetails} />
              </div>
            </div>

            {/* Consumable/Replacement Part Section */}
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-500" />
                Replacement Part Tracking
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                For items that need periodic replacement (filters, batteries, etc.)
              </p>
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    name="isConsumable" 
                    className="rounded border-border" 
                    defaultChecked={selectedItem.consumableInfo?.isConsumable}
                  />
                  <span className="text-sm text-foreground">This is a consumable/replacement part</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Spare Parts Storage Location" 
                    name="partStorageLocation" 
                    placeholder="e.g., Garage cabinet, Under sink" 
                    defaultValue={selectedItem.consumableInfo?.replacementStorageLocation}
                  />
                  <Input 
                    label="Stock Quantity" 
                    name="stockQuantity" 
                    type="number" 
                    min="0"
                    placeholder="How many spares?" 
                    defaultValue={selectedItem.consumableInfo?.stockQuantity}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Replacement Interval (months)" 
                    name="replacementInterval" 
                    type="number" 
                    min="1"
                    placeholder="e.g., 6 for every 6 months" 
                    defaultValue={selectedItem.consumableInfo?.replacementIntervalMonths}
                  />
                  <Input 
                    label="Last Replaced" 
                    name="lastReplaced" 
                    type="date" 
                    defaultValue={selectedItem.consumableInfo?.lastReplacedDate}
                  />
                </div>
                <Input 
                  label="Reorder URL (Optional)" 
                  name="reorderUrl" 
                  type="url"
                  placeholder="https://amazon.com/..." 
                  defaultValue={selectedItem.consumableInfo?.reorderUrl}
                />
                <Select
                  label="Linked Appliance (Optional)"
                  name="linkedApplianceId"
                  value={selectedItem.consumableInfo?.linkedApplianceId || ''}
                  options={[
                    { value: '', label: 'Select appliance this part is for...' },
                    ...getActiveItems()
                      .filter(item => item.id !== selectedItem.id)
                      .map(item => ({ 
                        value: item.id, 
                        label: `${item.name}${item.location ? ` (${item.location})` : ''}` 
                      }))
                  ]}
                />
              </div>
            </div>

            <Textarea label="Notes" name="notes" defaultValue={selectedItem.notes} rows={2} />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedItem(null); }}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => { setIsDeleteDialogOpen(false); setSelectedItem(null); }} title="Move to Trash?">
        {selectedItem && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to move <strong className="text-foreground">{selectedItem.name}</strong> to trash?
            </p>
            <div className="p-3 bg-muted/20 rounded-lg text-sm text-muted-foreground">
              <p>• Items in trash are kept for 180 days</p>
              <p>• You can restore them anytime during this period</p>
              <p>• After 180 days, items are permanently deleted</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedItem(null); }}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleSoftDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Move to Trash
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Sell Item Dialog */}
      <Dialog open={isSellDialogOpen} onClose={() => { setIsSellDialogOpen(false); setSelectedItem(null); }} title="Sell Item">
        {selectedItem && (
          <form onSubmit={handleSellItem} className="space-y-4">
            <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
              <h4 className="font-medium text-foreground">{selectedItem.name}</h4>
              <p className="text-sm text-muted-foreground">
                Purchase Price: {formatCurrency(selectedItem.purchasePrice || 0)}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input label="Sale Date" name="saleDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
              <Input label="Sale Price" name="salePrice" type="number" step="0.01" required placeholder="0.00" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Buyer (Optional)" name="buyer" placeholder="e.g., John Smith" />
              <Select
                label="Platform"
                name="platform"
                options={platformOptions}
              />
            </div>
            <Textarea label="Sale Notes" name="saleNotes" placeholder="Any notes about the sale..." rows={2} />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsSellDialogOpen(false); setSelectedItem(null); }}>
                Cancel
              </Button>
              <Button type="submit">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Mark as Sold
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* Categories Management Dialog */}
      <Dialog open={isCategoryDialogOpen} onClose={() => setIsCategoryDialogOpen(false)} title="Manage Categories">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New category name..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
            />
            <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-1">
            {inventoryCategories.map((category) => (
              <div key={category} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20">
                <span className="text-foreground">{category}</span>
                {!isDefault('inventoryCategories', category) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      removeOption('inventoryCategories', category);
                      toast.info('Category Removed', `"${category}" has been removed`);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground">
            Default categories cannot be removed. Custom categories sync with your data backup.
          </p>
          
          <DialogFooter>
            <Button onClick={() => setIsCategoryDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
