import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { fileApi, StoredFile } from '../lib/fileApi';
import { analyzeImage, findReceiptMatches, processBatchImages } from '../lib/imageAnalysis';
import { 
  useInventoryStagingStore, 
  StagedImage, 
  StagedInventoryItem,
  DetectedObject 
} from '../store/inventoryStagingStore';
import { useInventoryStore, DEFAULT_CATEGORIES, InventoryItem } from '../store/inventoryStore';
import { useAISettingsStore } from '../store/aiSettingsStore';
import { isAIReady } from '../lib/aiService';
import {
  Upload, Camera, FolderOpen, Cloud, ArrowRight, ArrowLeft,
  CheckCircle, XCircle, AlertTriangle, Loader2, Image as ImageIcon,
  Package, Tag, DollarSign, Calendar, FileText, Link2,   RefreshCw,
  Trash2, Eye, Edit, Check, X, Sparkles, Brain, Layers, Copy,
  Square, CheckSquare, MapPin
} from 'lucide-react';
import { cn } from '../lib/utils';

// Wizard steps
type WizardStep = 'upload' | 'analyze' | 'review' | 'complete';

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'upload', label: 'Upload Images', icon: <Upload className="w-5 h-5" /> },
  { key: 'analyze', label: 'AI Analysis', icon: <Brain className="w-5 h-5" /> },
  { key: 'review', label: 'Review & Edit', icon: <Edit className="w-5 h-5" /> },
  { key: 'complete', label: 'Complete', icon: <CheckCircle className="w-5 h-5" /> },
];

export default function InventoryWizard() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  
  // Stores
  const {
    session,
    stagedImages,
    stagedItems,
    startSession,
    endSession,
    updateSession,
    addStagedImage,
    updateStagedImage,
    markAsDuplicate,
    addStagedItem,
    updateStagedItem,
    approveItem,
    rejectItem,
    approveAllItems,
  } = useInventoryStagingStore();
  
  const { addItem } = useInventoryStore();
  const { isFeatureEnabled } = useAISettingsStore();
  const aiReady = isAIReady();
  
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0, item: '' });
  const [dragActive, setDragActive] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);
  
  // Initialize session if not exists
  useEffect(() => {
    if (!session) {
      startSession();
    }
  }, [session, startSession]);
  
  // Check AI readiness
  const canAnalyze = aiReady.ready && isFeatureEnabled('enableDocumentIntelligence');
  
  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!session) return;
    
    setIsUploading(true);
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    
    if (fileArray.length === 0) {
      toast.error('No images', 'Please select image files only');
      setIsUploading(false);
      return;
    }
    
    try {
      for (const file of fileArray) {
        // Upload to backend
        const storedFile = await fileApi.uploadFile(file);
        
        // Create staged image entry
        const stagedImage: StagedImage = {
          id: storedFile.id,
          fileId: storedFile.id,
          originalName: file.name,
          thumbnailUrl: fileApi.getViewUrl(storedFile.id),
          fullUrl: fileApi.getViewUrl(storedFile.id),
          uploadedAt: new Date().toISOString(),
          status: 'pending',
          detectedObjects: [],
          receiptMatches: [],
        };
        
        addStagedImage(stagedImage);
      }
      
      toast.success('Uploaded', `${fileArray.length} images ready for analysis`);
    } catch (error: any) {
      toast.error('Upload failed', error.message);
    } finally {
      setIsUploading(false);
    }
  }, [session, addStagedImage, toast]);
  
  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);
  
  // Run AI analysis on all pending images
  const runAnalysis = async () => {
    if (!canAnalyze) {
      toast.error('AI not ready', aiReady.message || 'Configure AI in settings');
      return;
    }
    
    const pendingImages = stagedImages.filter(img => img.status === 'pending');
    if (pendingImages.length === 0) {
      toast.info('No images', 'Upload images first');
      return;
    }
    
    setIsAnalyzing(true);
    updateSession({ status: 'analyzing' });
    
    let processed = 0;
    const detectedItems: Map<string, { 
      object: DetectedObject; 
      imageIds: string[];
      primaryImageId: string;
    }> = new Map();
    
    for (const image of pendingImages) {
      setAnalysisProgress({ 
        current: processed + 1, 
        total: pendingImages.length, 
        item: image.originalName 
      });
      
      updateStagedImage(image.id, { status: 'analyzing' });
      
      try {
        const result = await analyzeImage(image.fullUrl);
        
        if (result.success && result.objects.length > 0) {
          // Update image with results
          updateStagedImage(image.id, {
            status: 'analyzed',
            detectedObjects: result.objects,
            extractedText: result.extractedText.join(', '),
            suggestedName: result.objects[0]?.name,
            suggestedCategory: result.objects[0]?.category,
            suggestedBrand: result.objects[0]?.brand,
            suggestedLocation: result.objects[0]?.suggestedLocation || result.detectedRoom,
          });
          
          // Group similar objects (potential duplicates)
          for (const obj of result.objects) {
            const key = `${obj.name.toLowerCase()}-${(obj.brand || '').toLowerCase()}`;
            
            if (detectedItems.has(key)) {
              // Potential duplicate - add to existing group
              const existing = detectedItems.get(key)!;
              existing.imageIds.push(image.id);
              
              // Mark as potential duplicate
              updateStagedImage(image.id, {
                similarImages: [existing.primaryImageId],
              });
            } else {
              // New unique item
              detectedItems.set(key, {
                object: obj,
                imageIds: [image.id],
                primaryImageId: image.id,
              });
            }
          }
        } else {
          updateStagedImage(image.id, {
            status: 'error',
            errorMessage: result.error || 'No objects detected',
          });
        }
      } catch (error: any) {
        updateStagedImage(image.id, {
          status: 'error',
          errorMessage: error.message,
        });
      }
      
      processed++;
    }
    
    // Create staged items from unique detected objects
    updateSession({ status: 'matching' });
    
    for (const [key, data] of detectedItems) {
      const { object, imageIds, primaryImageId } = data;
      
      // Find matching receipts (pass image upload date for date proximity matching)
      const primaryImage = stagedImages.find(img => img.id === primaryImageId);
      const receiptMatches = await findReceiptMatches(
        object.name,
        object.brand,
        object.modelNumber,
        primaryImage?.uploadedAt // Pass image date for date proximity matching
      );
      
      // Update images with receipt matches
      for (const imageId of imageIds) {
        updateStagedImage(imageId, { receiptMatches });
      }
      
      // Create staged inventory item
      const stagedItem: StagedInventoryItem = {
        id: `staged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        imageIds,
        primaryImageId,
        name: object.name,
        category: object.category || 'Other',
        brand: object.brand,
        modelNumber: object.modelNumber,
        location: object.suggestedLocation || '', // Use AI-suggested location
        condition: 'good',
        linkedReceiptId: receiptMatches[0]?.documentId,
        purchaseDate: receiptMatches[0]?.extractedData?.purchaseDate,
        purchasePrice: receiptMatches[0]?.extractedData?.purchasePrice,
        status: 'pending',
        confidence: {
          name: object.confidence,
          category: object.confidence * 0.9,
          brand: object.brand ? object.confidence : 0,
          receiptMatch: receiptMatches[0]?.matchScore || 0,
        },
      };
      
      addStagedItem(stagedItem);
    }
    
    updateSession({ status: 'reviewing', processedImages: processed });
    setIsAnalyzing(false);
    setCurrentStep('review');
    
    toast.success(
      'Analysis complete',
      `Found ${detectedItems.size} unique items from ${processed} images`
    );
  };
  
  // Approve item and add to inventory
  const handleApproveItem = (item: StagedInventoryItem) => {
    // Create inventory item
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
    approveItem(item.id);
    
    toast.success('Added to inventory', item.name);
  };
  
  // Complete wizard
  const handleComplete = async () => {
    const pendingItems = stagedItems.filter(i => i.status === 'pending');
    
    if (pendingItems.length > 0) {
      const confirmed = await confirm({
        title: 'Incomplete Review',
        message: `You have ${pendingItems.length} items still pending review. Do you want to approve all remaining items?`,
        confirmText: 'Approve All',
        cancelText: 'Keep Reviewing',
        variant: 'warning',
      });
      
      if (confirmed) {
        for (const item of pendingItems) {
          handleApproveItem(item);
        }
      } else {
        return;
      }
    }
    
    const approvedCount = stagedItems.filter(i => i.status === 'approved').length;
    updateSession({ status: 'complete' });
    setCurrentStep('complete');
    
    toast.success('Inventory updated', `${approvedCount} items added to your inventory`);
  };
  
  // Exit wizard
  const handleExit = async () => {
    if (stagedImages.length > 0 || stagedItems.length > 0) {
      const confirmed = await confirm({
        title: 'Exit Wizard?',
        message: 'You have unsaved work. Are you sure you want to exit?',
        confirmText: 'Exit',
        cancelText: 'Stay',
        variant: 'danger',
      });
      
      if (!confirmed) return;
    }
    
    endSession();
    navigate('/items');
  };
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return renderUploadStep();
      case 'analyze':
        return renderAnalyzeStep();
      case 'review':
        return renderReviewStep();
      case 'complete':
        return renderCompleteStep();
    }
  };
  
  // Upload step
  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Drag & Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-12 text-center transition-all",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Drag & drop images here
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse from your device
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => document.getElementById('file-input')?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Browse Files
                </>
              )}
            </Button>
          </div>
          
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </div>
      
      {/* Cloud storage options (future) */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center opacity-50 cursor-not-allowed">
          <Cloud className="w-8 h-8 mx-auto mb-2 text-blue-500" />
          <p className="text-sm font-medium">Google Drive</p>
          <p className="text-xs text-muted-foreground">Coming soon</p>
        </Card>
        <Card className="p-4 text-center opacity-50 cursor-not-allowed">
          <Cloud className="w-8 h-8 mx-auto mb-2 text-blue-600" />
          <p className="text-sm font-medium">OneDrive</p>
          <p className="text-xs text-muted-foreground">Coming soon</p>
        </Card>
        <Card className="p-4 text-center opacity-50 cursor-not-allowed">
          <Cloud className="w-8 h-8 mx-auto mb-2 text-orange-500" />
          <p className="text-sm font-medium">iCloud</p>
          <p className="text-xs text-muted-foreground">Coming soon</p>
        </Card>
      </div>
      
      {/* Uploaded images preview */}
      {stagedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Uploaded Images ({stagedImages.length})
            </h3>
            <Button
              onClick={() => setCurrentStep('analyze')}
              disabled={stagedImages.length === 0}
            >
              Continue to Analysis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {stagedImages.map((img) => (
              <div
                key={img.id}
                className="aspect-square rounded-lg overflow-hidden bg-muted relative group"
              >
                <img
                  src={img.thumbnailUrl}
                  alt={img.originalName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => {
                      const newImages = stagedImages.filter(i => i.id !== img.id);
                      // Remove from store would go here
                    }}
                    className="p-1 rounded-full bg-red-500 text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {img.status === 'duplicate' && (
                  <div className="absolute top-1 right-1">
                    <Copy className="w-4 h-4 text-yellow-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  
  // Analyze step
  const renderAnalyzeStep = () => (
    <div className="space-y-6">
      {!isAnalyzing ? (
        <>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Ready to Analyze</h3>
                <p className="text-sm text-muted-foreground">
                  AI will analyze {stagedImages.filter(i => i.status === 'pending').length} images 
                  to detect appliances, electronics, and furniture
                </p>
              </div>
              <Button onClick={runAnalysis} disabled={!canAnalyze}>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Analysis
              </Button>
            </div>
            
            {!canAnalyze && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  {aiReady.message || 'AI is not configured. Go to Settings to add your API key.'}
                </p>
              </div>
            )}
          </Card>
          
          <div className="text-sm text-muted-foreground">
            <h4 className="font-medium mb-2">What AI will detect:</h4>
            <ul className="grid grid-cols-2 gap-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Appliances (fridge, washer, dryer)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Electronics (TV, computer, speakers)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Brand logos (LG, Samsung, Whirlpool)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Model numbers from labels
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Duplicate/similar images
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Receipt matching
              </li>
            </ul>
          </div>
        </>
      ) : (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Analyzing Images...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {analysisProgress.current} of {analysisProgress.total}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {analysisProgress.item}
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${(analysisProgress.current / analysisProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
  
  // Batch operations
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };
  
  const selectAllPending = () => {
    const pendingIds = stagedItems.filter(i => i.status === 'pending').map(i => i.id);
    setSelectedItems(new Set(pendingIds));
  };
  
  const clearSelection = () => {
    setSelectedItems(new Set());
  };
  
  const batchApprove = () => {
    selectedItems.forEach(id => {
      const item = stagedItems.find(i => i.id === id);
      if (item && item.status === 'pending') {
        handleApproveItem(item);
      }
    });
    clearSelection();
  };
  
  const batchUpdateLocation = (location: string) => {
    selectedItems.forEach(id => {
      updateStagedItem(id, { location });
    });
  };
  
  const batchUpdateCategory = (category: string) => {
    selectedItems.forEach(id => {
      updateStagedItem(id, { category });
    });
  };
  
  // Review step
  const renderReviewStep = () => {
    const pendingItems = stagedItems.filter(i => i.status === 'pending');
    const approvedItems = stagedItems.filter(i => i.status === 'approved');
    const rejectedItems = stagedItems.filter(i => i.status === 'rejected');
    
    return (
      <div className="space-y-6">
        {/* Stats bar */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg flex-wrap">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">{stagedItems.length} items detected</span>
          </div>
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="w-4 h-4" />
            <span>{pendingItems.length} pending</span>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>{approvedItems.length} approved</span>
          </div>
          <div className="flex-1" />
          <div className="flex gap-2">
            {!isBatchMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBatchMode(true)}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Batch Mode
                </Button>
                {pendingItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pendingItems.forEach(item => handleApproveItem(item))}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve All
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsBatchMode(false);
                    clearSelection();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllPending}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select All ({pendingItems.length})
                </Button>
                {selectedItems.size > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={batchApprove}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve ({selectedItems.size})
                    </Button>
                    <div className="flex gap-1">
                      <Select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            batchUpdateLocation(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="text-sm"
                      >
                        <option value="">Set Location...</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Living Room">Living Room</option>
                        <option value="Bedroom">Bedroom</option>
                        <option value="Garage">Garage</option>
                        <option value="Basement">Basement</option>
                        <option value="Attic">Attic</option>
                        <option value="Bathroom">Bathroom</option>
                        <option value="Office">Office</option>
                        <option value="Outdoor">Outdoor</option>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Items grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stagedItems.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "overflow-hidden transition-all",
                item.status === 'approved' && "ring-2 ring-green-500",
                item.status === 'rejected' && "opacity-50",
                isBatchMode && selectedItems.has(item.id) && "ring-2 ring-primary"
              )}
            >
              {/* Batch mode checkbox */}
              {isBatchMode && item.status === 'pending' && (
                <div className="absolute top-2 left-2 z-10">
                  <button
                    onClick={() => toggleItemSelection(item.id)}
                    className={cn(
                      "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                      selectedItems.has(item.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background border-border hover:border-primary"
                    )}
                  >
                    {selectedItems.has(item.id) && <Check className="w-4 h-4" />}
                  </button>
                </div>
              )}
              
              {/* Image preview */}
              <div className="aspect-video bg-muted relative">
                <img
                  src={fileApi.getViewUrl(item.primaryImageId)}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {item.imageIds.length > 1 && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded-full text-white text-xs">
                    <Layers className="w-3 h-3 inline mr-1" />
                    {item.imageIds.length} photos
                  </div>
                )}
                {item.linkedReceiptId && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-green-500/90 rounded-full text-white text-xs">
                    <Link2 className="w-3 h-3 inline mr-1" />
                    Receipt matched
                  </div>
                )}
              </div>
              
              <CardContent className="p-4 space-y-3">
                {/* Item details */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.category}
                        {item.brand && ` • ${item.brand}`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs rounded-full",
                        item.status === 'pending' && "bg-yellow-100 text-yellow-700",
                        item.status === 'approved' && "bg-green-100 text-green-700",
                        item.status === 'rejected' && "bg-red-100 text-red-700"
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                  
                  {/* Confidence scores */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Confidence:</span>
                    <div className="flex gap-1">
                      {['name', 'category', 'brand'].map((key) => {
                        const score = item.confidence[key as keyof typeof item.confidence];
                        return (
                          <span
                            key={key}
                            className={cn(
                              "px-1.5 py-0.5 text-xs rounded",
                              score > 0.8 && "bg-green-100 text-green-700",
                              score > 0.5 && score <= 0.8 && "bg-yellow-100 text-yellow-700",
                              score <= 0.5 && "bg-red-100 text-red-700"
                            )}
                            title={`${key}: ${Math.round(score * 100)}%`}
                          >
                            {key.charAt(0).toUpperCase()}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Receipt match info */}
                  {item.purchasePrice && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span>${item.purchasePrice}</span>
                      {item.purchaseDate && (
                        <>
                          <Calendar className="w-4 h-4 text-muted-foreground ml-2" />
                          <span>{item.purchaseDate}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Location input */}
                <div className="relative">
                  <Input
                    placeholder="Location (e.g., Kitchen, Living Room)"
                    value={item.location}
                    onChange={(e) => updateStagedItem(item.id, { location: e.target.value })}
                    disabled={item.status !== 'pending'}
                    className={cn(
                      item.location && item.location === item.suggestedLocation && "border-purple-300"
                    )}
                  />
                  {item.suggestedLocation && !item.location && (
                    <button
                      onClick={() => updateStagedItem(item.id, { location: item.suggestedLocation })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                      title="Use AI-suggested location"
                    >
                      <MapPin className="w-3 h-3" />
                      {item.suggestedLocation}
                    </button>
                  )}
                </div>
                
                {/* Actions */}
                {item.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleApproveItem(item)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => rejectItem(item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingItemId(item.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        {stagedItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No items detected. Try uploading more images or running analysis again.</p>
          </div>
        )}
      </div>
    );
  };
  
  // Complete step
  const renderCompleteStep = () => {
    const approved = stagedItems.filter(i => i.status === 'approved').length;
    const rejected = stagedItems.filter(i => i.status === 'rejected').length;
    
    return (
      <div className="text-center py-12 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inventory Updated!</h2>
          <p className="text-muted-foreground mt-2">
            Successfully added {approved} items to your inventory
          </p>
        </div>
        
        <div className="flex justify-center gap-4">
          <Card className="px-6 py-4">
            <p className="text-3xl font-bold text-green-600">{approved}</p>
            <p className="text-sm text-muted-foreground">Items Added</p>
          </Card>
          <Card className="px-6 py-4">
            <p className="text-3xl font-bold text-muted-foreground">{rejected}</p>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </Card>
          <Card className="px-6 py-4">
            <p className="text-3xl font-bold text-blue-600">{stagedImages.length}</p>
            <p className="text-sm text-muted-foreground">Images Processed</p>
          </Card>
        </div>
        
        <div className="flex justify-center gap-3">
          <Button onClick={() => navigate('/items')}>
            View Inventory
          </Button>
          <Button variant="outline" onClick={() => {
            endSession();
            startSession();
            setCurrentStep('upload');
          }}>
            Start New Session
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Wizard</h1>
          <p className="text-muted-foreground">
            Quickly add multiple items with AI-powered detection
          </p>
        </div>
        <Button variant="outline" onClick={handleExit}>
          <X className="w-4 h-4 mr-2" />
          Exit
        </Button>
      </div>
      
      {/* Progress steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => {
                  // Only allow going back to previous completed steps
                  const stepIndex = STEPS.findIndex(s => s.key === step.key);
                  const currentIndex = STEPS.findIndex(s => s.key === currentStep);
                  if (stepIndex < currentIndex) {
                    setCurrentStep(step.key);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                  currentStep === step.key
                    ? "bg-primary text-primary-foreground"
                    : STEPS.findIndex(s => s.key === step.key) < STEPS.findIndex(s => s.key === currentStep)
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {step.icon}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 lg:w-16 h-0.5 mx-2",
                  STEPS.findIndex(s => s.key === step.key) < STEPS.findIndex(s => s.key === currentStep)
                    ? "bg-green-500"
                    : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step content */}
      {renderStepContent()}
      
      {/* Navigation */}
      {currentStep !== 'complete' && (
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => {
              const currentIndex = STEPS.findIndex(s => s.key === currentStep);
              if (currentIndex > 0) {
                setCurrentStep(STEPS[currentIndex - 1].key);
              }
            }}
            disabled={currentStep === 'upload'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          {currentStep === 'review' && (
            <Button onClick={handleComplete}>
              Complete
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

