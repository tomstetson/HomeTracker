/**
 * Document Extraction Modal
 * AI-powered data extraction from documents with editable fields and one-click record creation
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { useToast } from './ui/Toast';
import { 
  Sparkles, 
  Loader2, 
  Store, 
  Package, 
  Receipt, 
  Shield, 
  Wrench,
  ChevronDown,
  ChevronRight,
  Check,
  AlertTriangle,
  Link2,
  Plus,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  ExtractedData, 
  ExtractedVendor, 
  ExtractedItem, 
  ExtractedReceipt, 
  ExtractedWarranty,
  ExtractedMaintenance,
  extractAndParse,
  findMatchingSuggestions,
  MatchSuggestion,
  hasExtractedContent,
} from '../lib/documentExtraction';
import { useInventoryStore, DEFAULT_CATEGORIES } from '../store/inventoryStore';
import { useVendorStore } from '../store/vendorStore';
import { useMaintenanceStore } from '../store/maintenanceStore';
import { Document } from '../store/documentStore';

interface DocumentExtractionModalProps {
  open: boolean;
  onClose: () => void;
  document: Document;
  ocrText: string;
  onExtractionComplete?: (data: ExtractedData, linkedRecords: LinkedRecord[]) => void;
}

export interface LinkedRecord {
  type: 'item' | 'vendor' | 'warranty' | 'maintenance';
  id: string;
}

export function DocumentExtractionModal({
  open,
  onClose,
  document,
  ocrText,
  onExtractionComplete,
}: DocumentExtractionModalProps) {
  const toast = useToast();
  const { addItem } = useInventoryStore();
  const { addVendor } = useVendorStore();
  const { addTask } = useMaintenanceStore();

  // State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
  
  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['vendor', 'items', 'receipt']));
  
  // Editable form state
  const [vendorData, setVendorData] = useState<ExtractedVendor | null>(null);
  const [itemsData, setItemsData] = useState<ExtractedItem[]>([]);
  const [receiptData, setReceiptData] = useState<ExtractedReceipt | null>(null);
  const [warrantyData, setWarrantyData] = useState<ExtractedWarranty | null>(null);
  const [maintenanceData, setMaintenanceData] = useState<ExtractedMaintenance | null>(null);

  // Run extraction when modal opens
  useEffect(() => {
    if (open && ocrText && !extractedData && !isExtracting) {
      runExtraction();
    }
  }, [open, ocrText]);

  // Update form state when extraction completes
  useEffect(() => {
    if (extractedData) {
      setVendorData(extractedData.vendor || null);
      setItemsData(extractedData.items || []);
      setReceiptData(extractedData.receipt || null);
      setWarrantyData(extractedData.warranty || null);
      setMaintenanceData(extractedData.maintenance || null);
      
      // Find matching suggestions
      const matches = findMatchingSuggestions(extractedData);
      setSuggestions(matches);
    }
  }, [extractedData]);

  const runExtraction = async () => {
    setIsExtracting(true);
    setError(null);

    const result = await extractAndParse(ocrText);

    if (result.success && result.data) {
      setExtractedData(result.data);
    } else {
      setError(result.error || 'Extraction failed');
    }

    setIsExtracting(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Create vendor from extracted data
  const createVendor = () => {
    if (!vendorData?.name) {
      toast.error('Error', 'Vendor name is required');
      return;
    }

    const newVendor = {
      id: crypto.randomUUID(),
      businessName: vendorData.name,
      phone: vendorData.phone || '',
      email: vendorData.email,
      website: vendorData.website,
      address: vendorData.address,
      category: ['General'],
      rating: 0,
      totalJobs: 0,
      isPreferred: false,
    };

    addVendor(newVendor);
    setLinkedRecords((prev) => [...prev, { type: 'vendor', id: newVendor.id }]);
    toast.success('Vendor Created', `Added "${vendorData.name}" to vendors`);
  };

  // Create inventory item from extracted data
  const createItem = (item: ExtractedItem, index: number) => {
    if (!item.name) {
      toast.error('Error', 'Item name is required');
      return;
    }

    const newItem = {
      id: crypto.randomUUID(),
      name: item.name,
      category: item.category || 'Other',
      brand: item.brand,
      modelNumber: item.model,
      serialNumber: item.serialNumber,
      location: 'To be assigned',
      purchaseDate: receiptData?.date,
      purchasePrice: item.price,
      condition: 'good' as const,
      photos: [],
      tags: [],
      status: 'active' as const,
    };

    addItem(newItem);
    setLinkedRecords((prev) => [...prev, { type: 'item', id: newItem.id }]);
    
    // Remove from list
    setItemsData((prev) => prev.filter((_, i) => i !== index));
    toast.success('Item Created', `Added "${item.name}" to inventory`);
  };

  // Create maintenance task from extracted data
  const createMaintenance = () => {
    if (!maintenanceData?.type) {
      toast.error('Error', 'Maintenance type is required');
      return;
    }

    const newTask = {
      id: crypto.randomUUID(),
      title: maintenanceData.type,
      description: maintenanceData.notes,
      category: 'General',
      priority: 'medium' as const,
      dueDate: maintenanceData.date || new Date().toISOString().split('T')[0],
      recurrence: 'none' as const,
      status: 'completed' as const,
      estimatedCost: maintenanceData.cost,
      actualCost: maintenanceData.cost,
      completedDate: maintenanceData.date,
      completedBy: maintenanceData.technician,
    };

    addTask(newTask);
    setLinkedRecords((prev) => [...prev, { type: 'maintenance', id: newTask.id }]);
    toast.success('Maintenance Created', `Added "${maintenanceData.type}" to maintenance history`);
  };

  const handleClose = () => {
    // Notify parent of created records
    if (extractedData && onExtractionComplete) {
      onExtractionComplete(extractedData, linkedRecords);
    }
    
    // Reset state
    setExtractedData(null);
    setError(null);
    setSuggestions([]);
    setLinkedRecords([]);
    onClose();
  };

  const getConfidenceBadge = () => {
    if (!extractedData?.confidence) return null;
    
    const colors = {
      high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
      <span className={cn('px-2 py-0.5 text-xs rounded-full', colors[extractedData.confidence])}>
        {extractedData.confidence} confidence
      </span>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span>AI Data Extraction</span>
          {getConfidenceBadge()}
        </div>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto space-y-4">
        {/* Loading state */}
        {isExtracting && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-foreground font-medium">Analyzing document...</p>
            <p className="text-sm text-muted-foreground">Extracting vendor, items, and receipt data</p>
          </div>
        )}

        {/* Error state */}
        {error && !isExtracting && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">Extraction Failed</p>
                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={runExtraction}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Extracted data sections */}
        {extractedData && !isExtracting && (
          <>
            {/* Match suggestions */}
            {suggestions.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    Possible Matches Found
                  </span>
                </div>
                <div className="space-y-1">
                  {suggestions.slice(0, 3).map((s, i) => (
                    <p key={i} className="text-xs text-blue-600 dark:text-blue-300">
                      "{s.extractedValue}" may match existing {s.type}: 
                      <span className="font-medium">
                        {' '}{s.type === 'vendor' 
                          ? (s.matchedRecord as any).businessName 
                          : (s.matchedRecord as any).name}
                      </span>
                      {' '}({Math.round(s.confidence * 100)}% match via {s.matchField})
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {extractedData.warnings && extractedData.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-700 dark:text-amber-400">
                    {extractedData.warnings.join('. ')}
                  </span>
                </div>
              </div>
            )}

            {/* Vendor Section */}
            {vendorData && (
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('vendor')}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('vendor') ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Store className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Vendor</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{vendorData.name}</span>
                </button>
                
                {expandedSections.has('vendor') && (
                  <div className="p-4 space-y-3">
                    <Input
                      label="Business Name"
                      value={vendorData.name}
                      onChange={(e) => setVendorData({ ...vendorData, name: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Phone"
                        value={vendorData.phone || ''}
                        onChange={(e) => setVendorData({ ...vendorData, phone: e.target.value })}
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={vendorData.email || ''}
                        onChange={(e) => setVendorData({ ...vendorData, email: e.target.value })}
                      />
                    </div>
                    <Input
                      label="Address"
                      value={vendorData.address || ''}
                      onChange={(e) => setVendorData({ ...vendorData, address: e.target.value })}
                    />
                    <Button onClick={createVendor} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Vendors
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Items Section */}
            {itemsData.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('items')}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('items') ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Package className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Items ({itemsData.length})</span>
                  </div>
                </button>
                
                {expandedSections.has('items') && (
                  <div className="p-4 space-y-4">
                    {itemsData.map((item, index) => (
                      <div key={index} className="p-3 border border-border/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                          <button
                            onClick={() => setItemsData((prev) => prev.filter((_, i) => i !== index))}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <Input
                          label="Name"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...itemsData];
                            updated[index] = { ...item, name: e.target.value };
                            setItemsData(updated);
                          }}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Brand"
                            value={item.brand || ''}
                            onChange={(e) => {
                              const updated = [...itemsData];
                              updated[index] = { ...item, brand: e.target.value };
                              setItemsData(updated);
                            }}
                          />
                          <Input
                            label="Model"
                            value={item.model || ''}
                            onChange={(e) => {
                              const updated = [...itemsData];
                              updated[index] = { ...item, model: e.target.value };
                              setItemsData(updated);
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Price"
                            type="number"
                            value={item.price?.toString() || ''}
                            onChange={(e) => {
                              const updated = [...itemsData];
                              updated[index] = { ...item, price: parseFloat(e.target.value) || undefined };
                              setItemsData(updated);
                            }}
                          />
                          <Select
                            label="Category"
                            value={item.category || 'Other'}
                            onChange={(e) => {
                              const updated = [...itemsData];
                              updated[index] = { ...item, category: e.target.value };
                              setItemsData(updated);
                            }}
                            options={DEFAULT_CATEGORIES.map((c) => ({ value: c, label: c }))}
                          />
                        </div>
                        <Button onClick={() => createItem(item, index)} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Inventory
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Receipt Section */}
            {receiptData && (
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('receipt')}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('receipt') ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Receipt className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Receipt</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ${receiptData.total?.toFixed(2)} on {receiptData.date}
                  </span>
                </button>
                
                {expandedSections.has('receipt') && (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Date"
                        type="date"
                        value={receiptData.date}
                        onChange={(e) => setReceiptData({ ...receiptData, date: e.target.value })}
                      />
                      <Input
                        label="Total"
                        type="number"
                        step="0.01"
                        value={receiptData.total?.toString() || ''}
                        onChange={(e) => setReceiptData({ ...receiptData, total: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Tax"
                        type="number"
                        step="0.01"
                        value={receiptData.tax?.toString() || ''}
                        onChange={(e) => setReceiptData({ ...receiptData, tax: parseFloat(e.target.value) })}
                      />
                      <Input
                        label="Payment Method"
                        value={receiptData.paymentMethod || ''}
                        onChange={(e) => setReceiptData({ ...receiptData, paymentMethod: e.target.value })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Receipt data will be associated with created items automatically.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Warranty Section */}
            {warrantyData && (
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('warranty')}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('warranty') ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Shield className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">Warranty</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{warrantyData.provider}</span>
                </button>
                
                {expandedSections.has('warranty') && (
                  <div className="p-4 space-y-3">
                    <Input
                      label="Provider"
                      value={warrantyData.provider}
                      onChange={(e) => setWarrantyData({ ...warrantyData, provider: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Start Date"
                        type="date"
                        value={warrantyData.startDate || ''}
                        onChange={(e) => setWarrantyData({ ...warrantyData, startDate: e.target.value })}
                      />
                      <Input
                        label="End Date"
                        type="date"
                        value={warrantyData.endDate || ''}
                        onChange={(e) => setWarrantyData({ ...warrantyData, endDate: e.target.value })}
                      />
                    </div>
                    <Textarea
                      label="Coverage Details"
                      value={warrantyData.coverage || ''}
                      onChange={(e) => setWarrantyData({ ...warrantyData, coverage: e.target.value })}
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      Warranty info will be attached to created inventory items.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Maintenance Section */}
            {maintenanceData && (
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection('maintenance')}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has('maintenance') ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Wrench className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">Maintenance</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{maintenanceData.type}</span>
                </button>
                
                {expandedSections.has('maintenance') && (
                  <div className="p-4 space-y-3">
                    <Input
                      label="Service Type"
                      value={maintenanceData.type}
                      onChange={(e) => setMaintenanceData({ ...maintenanceData, type: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Date"
                        type="date"
                        value={maintenanceData.date || ''}
                        onChange={(e) => setMaintenanceData({ ...maintenanceData, date: e.target.value })}
                      />
                      <Input
                        label="Cost"
                        type="number"
                        step="0.01"
                        value={maintenanceData.cost?.toString() || ''}
                        onChange={(e) => setMaintenanceData({ ...maintenanceData, cost: parseFloat(e.target.value) })}
                      />
                    </div>
                    <Textarea
                      label="Notes"
                      value={maintenanceData.notes || ''}
                      onChange={(e) => setMaintenanceData({ ...maintenanceData, notes: e.target.value })}
                      rows={2}
                    />
                    <Button onClick={createMaintenance} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Maintenance History
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* No data extracted */}
            {!hasExtractedContent(extractedData) && (
              <div className="text-center py-8">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="text-foreground font-medium">No structured data found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The AI couldn't extract meaningful data from this document.
                </p>
                {extractedData.raw && (
                  <details className="mt-4 text-left">
                    <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                      View raw AI response
                    </summary>
                    <pre className="mt-2 p-3 bg-muted/30 rounded text-xs overflow-auto max-h-40">
                      {extractedData.raw}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Created records summary */}
            {linkedRecords.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Created {linkedRecords.length} record{linkedRecords.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <DialogFooter>
        {!isExtracting && extractedData && (
          <Button variant="outline" onClick={runExtraction}>
            Re-extract
          </Button>
        )}
        <Button onClick={handleClose}>
          {linkedRecords.length > 0 ? 'Done' : 'Close'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}


