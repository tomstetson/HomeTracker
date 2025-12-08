import { useState, useEffect, useCallback, useRef } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import { useDiagramStore, Diagram, DIAGRAM_CATEGORIES } from '../store/diagramStore';
import { InventoryItem } from '../store/inventoryStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import DiagramInventoryPanel from '../components/DiagramInventoryPanel';
import {
  Plus,
  ArrowLeft,
  Save,
  Trash2,
  Edit,
  Search,
  Grid3X3,
  List,
  Download,
  Maximize2,
  X,
  Package,
} from 'lucide-react';
import { cn } from '../lib/utils';

// Generate unique ID for Excalidraw elements
const generateId = () => Math.random().toString(36).substring(2, 15);

type ViewMode = 'gallery' | 'editor';

export default function Diagrams() {
  const {
    diagrams,
    isLoading,
    addDiagram,
    updateDiagram,
    deleteDiagram,
    getDiagram,
    activeDiagramId,
    setActiveDiagram,
  } = useDiagramStore();
  const toast = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDiagram, setSelectedDiagram] = useState<Diagram | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [isInventoryPanelOpen, setIsInventoryPanelOpen] = useState(false);

  // Excalidraw API reference for programmatic control
  const excalidrawAPIRef = useRef<any>(null);

  // Excalidraw refs - using refs to avoid infinite re-render loops
  // Excalidraw manages its own internal state, we just need to track changes for saving
  const excalidrawDataRef = useRef<{ elements: any[]; appState: any; files: any }>({
    elements: [],
    appState: {},
    files: {},
  });
  
  // Initial data for Excalidraw - only set when opening a diagram
  const [initialData, setInitialData] = useState<{ elements: any[]; appState: any; files: any } | null>(null);

  // Form state for new/edit diagram
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<Diagram['category']>('other');

  // Filter diagrams
  const filteredDiagrams = diagrams.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Handle creating a new diagram
  const handleCreateDiagram = (e: React.FormEvent) => {
    e.preventDefault();
    const newDiagramData = { elements: [], appState: {}, files: {} };
    const id = addDiagram({
      name: formName,
      description: formDescription,
      category: formCategory,
      data: newDiagramData,
    });
    setIsNewDialogOpen(false);
    const savedFormName = formName;
    setFormName('');
    setFormDescription('');
    setFormCategory('other');
    setActiveDiagram(id);
    // Set initial data for the new diagram
    excalidrawDataRef.current = newDiagramData;
    setInitialData(newDiagramData);
    setHasUnsavedChanges(false);
    setViewMode('editor');
    toast.success('Diagram Created', `Created "${savedFormName}"`);
  };

  // Handle opening a diagram for editing
  const handleOpenDiagram = (diagram: Diagram) => {
    setActiveDiagram(diagram.id);
    const data = diagram.data || { elements: [], appState: {}, files: {} };
    excalidrawDataRef.current = {
      elements: data.elements || [],
      appState: data.appState || {},
      files: data.files || {},
    };
    // Set initial data for Excalidraw component
    setInitialData({
      elements: data.elements || [],
      appState: data.appState || {},
      files: data.files || {},
    });
    setHasUnsavedChanges(false);
    setViewMode('editor');
  };

  // Handle saving the current diagram
  const handleSaveDiagram = useCallback(async () => {
    if (!activeDiagramId) return;

    const { elements, appState, files } = excalidrawDataRef.current;

    try {
      // Generate thumbnail
      let thumbnail: string | undefined;
      if (elements.length > 0) {
        try {
          const blob = await exportToBlob({
            elements: elements,
            appState: { ...appState, exportBackground: true },
            files: files,
            getDimensions: () => ({ width: 300, height: 200, scale: 1 }),
          });
          thumbnail = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('Failed to generate thumbnail:', e);
        }
      }

      updateDiagram(activeDiagramId, {
        data: {
          elements: elements,
          appState: appState,
          files: files,
        },
        thumbnail,
      });
      setHasUnsavedChanges(false);
      toast.success('Saved', 'Diagram saved successfully');
    } catch (error) {
      toast.error('Error', 'Failed to save diagram');
    }
  }, [activeDiagramId, updateDiagram, toast]);

  // Handle Excalidraw changes - store in ref to avoid re-render loops
  const handleExcalidrawChange = useCallback((
    elements: readonly any[],
    appState: any,
    files: any
  ) => {
    // Store data in ref (doesn't trigger re-render)
    excalidrawDataRef.current = {
      elements: [...elements],
      appState: appState,
      files: files,
    };
    // Only update hasUnsavedChanges state if it's not already true
    setHasUnsavedChanges((prev) => prev || elements.length > 0);
  }, []);

  // Handle back to gallery
  const handleBackToGallery = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    setViewMode('gallery');
    setActiveDiagram(null);
    setHasUnsavedChanges(false);
    setInitialData(null); // Clear initial data so it's fresh when opening another diagram
    excalidrawDataRef.current = { elements: [], appState: {}, files: {} };
  };

  // Handle edit diagram metadata
  const handleEditMetadata = (diagram: Diagram) => {
    setSelectedDiagram(diagram);
    setFormName(diagram.name);
    setFormDescription(diagram.description || '');
    setFormCategory(diagram.category);
    setIsEditDialogOpen(true);
  };

  const handleUpdateMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiagram) return;
    updateDiagram(selectedDiagram.id, {
      name: formName,
      description: formDescription,
      category: formCategory,
    });
    setIsEditDialogOpen(false);
    setSelectedDiagram(null);
    toast.success('Updated', 'Diagram details updated');
  };

  // Handle delete
  const handleDeleteDiagram = () => {
    if (!selectedDiagram) return;
    deleteDiagram(selectedDiagram.id);
    setIsDeleteDialogOpen(false);
    setSelectedDiagram(null);
    toast.success('Deleted', 'Diagram deleted');
  };

  // Handle adding inventory item to diagram
  const handleAddInventoryItem = useCallback((item: InventoryItem) => {
    if (!excalidrawAPIRef.current) {
      toast.info('Loading', 'Diagram editor is loading...');
      return;
    }

    const api = excalidrawAPIRef.current;
    const { width, height } = api.getAppState();
    
    // Create a group of elements for the inventory item
    const groupId = generateId();
    const baseX = (width || 800) / 2 - 75;
    const baseY = (height || 600) / 2 - 40;

    // Create rectangle background
    const rectElement = {
      id: generateId(),
      type: 'rectangle',
      x: baseX,
      y: baseY,
      width: 150,
      height: 80,
      angle: 0,
      strokeColor: '#1e88e5',
      backgroundColor: '#e3f2fd',
      fillStyle: 'solid',
      strokeWidth: 2,
      roughness: 0,
      opacity: 100,
      groupIds: [groupId],
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      isDeleted: false,
      boundElements: null,
      link: null,
      locked: false,
      // Store inventory reference as custom data
      customData: {
        inventoryId: item.id,
        inventoryName: item.name,
        inventoryCategory: item.category,
      },
    };

    // Create text label for item name
    const textElement = {
      id: generateId(),
      type: 'text',
      x: baseX + 10,
      y: baseY + 15,
      width: 130,
      height: 25,
      angle: 0,
      strokeColor: '#1565c0',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      roughness: 0,
      opacity: 100,
      groupIds: [groupId],
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      isDeleted: false,
      boundElements: null,
      link: null,
      locked: false,
      text: item.name,
      fontSize: 14,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      baseline: 18,
      containerId: null,
      originalText: item.name,
    };

    // Create smaller text for category/brand
    const subTextElement = {
      id: generateId(),
      type: 'text',
      x: baseX + 10,
      y: baseY + 45,
      width: 130,
      height: 20,
      angle: 0,
      strokeColor: '#64b5f6',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      roughness: 0,
      opacity: 100,
      groupIds: [groupId],
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      isDeleted: false,
      boundElements: null,
      link: null,
      locked: false,
      text: item.brand || item.category,
      fontSize: 11,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      baseline: 14,
      containerId: null,
      originalText: item.brand || item.category,
    };

    // Get current elements and add new ones
    const currentElements = api.getSceneElements();
    const newElements = [...currentElements, rectElement, textElement, subTextElement];
    
    // Update the scene
    api.updateScene({ elements: newElements });
    
    // Store in ref for saving
    excalidrawDataRef.current.elements = newElements;
    setHasUnsavedChanges(true);
    
    toast.success('Added', `"${item.name}" added to diagram`);
  }, [toast]);

  // Handle export
  const handleExport = async (diagram: Diagram) => {
    if (!diagram.data || !diagram.data.elements) {
      toast.error('Error', 'No diagram data to export');
      return;
    }
    try {
      const blob = await exportToBlob({
        elements: diagram.data.elements,
        appState: { ...diagram.data.appState, exportBackground: true },
        files: diagram.data.files || {},
        getDimensions: () => ({ width: 1920, height: 1080, scale: 2 }),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${diagram.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported', 'Diagram exported as PNG');
    } catch (error) {
      toast.error('Error', 'Failed to export diagram');
    }
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasUnsavedChanges || !activeDiagramId) return;
    const timer = setTimeout(() => {
      handleSaveDiagram();
    }, 30000);
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, activeDiagramId, handleSaveDiagram]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && viewMode === 'editor') {
        e.preventDefault();
        handleSaveDiagram();
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, handleSaveDiagram, isFullscreen]);

  const activeDiagram = activeDiagramId ? getDiagram(activeDiagramId) : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-muted/20 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Editor View
  if (viewMode === 'editor' && activeDiagram) {
    return (
      <div className={cn(
        "flex flex-col",
        isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-8rem)]"
      )}>
        {/* Editor Header */}
        <div className="flex items-center justify-between p-3 bg-card border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBackToGallery}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h2 className="font-semibold text-foreground">{activeDiagram.name}</h2>
              <p className="text-xs text-muted-foreground">
                {DIAGRAM_CATEGORIES.find(c => c.value === activeDiagram.category)?.label}
                {hasUnsavedChanges && ' • Unsaved changes'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={isInventoryPanelOpen ? "default" : "outline"} 
              size="sm" 
              onClick={() => setIsInventoryPanelOpen(!isInventoryPanelOpen)}
              title="Add inventory items to diagram"
            >
              <Package className="w-4 h-4 mr-2" />
              Inventory
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleEditMetadata(activeDiagram)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Details
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport(activeDiagram)}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={handleSaveDiagram} disabled={!hasUnsavedChanges}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Excalidraw Canvas with Inventory Panel */}
        <div 
          className="flex-1 bg-white relative excalidraw-container" 
          style={{ minHeight: '500px', height: 'calc(100vh - 200px)' }}
        >
          {initialData !== null ? (
            <Excalidraw
              excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
              initialData={initialData}
              onChange={handleExcalidrawChange}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  export: false,
                  saveToActiveFile: false,
                },
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Loading diagram editor...</p>
            </div>
          )}
          
          {/* Inventory Panel Overlay */}
          <DiagramInventoryPanel
            isOpen={isInventoryPanelOpen}
            onClose={() => setIsInventoryPanelOpen(false)}
            onAddItemToDiagram={handleAddInventoryItem}
          />
        </div>
      </div>
    );
  }


  // Gallery View
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Diagrams</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Create and manage home diagrams
          </p>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Diagram
        </Button>
      </div>

      {/* Category Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm transition-all",
            categoryFilter === 'all'
              ? "bg-primary text-primary-foreground"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
          )}
        >
          All ({diagrams.length})
        </button>
        {DIAGRAM_CATEGORIES.map((cat) => {
          const count = diagrams.filter((d) => d.category === cat.value).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm transition-all",
                categoryFilter === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search and View Toggle */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search diagrams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex border border-input rounded-md overflow-hidden">
          <button
            onClick={() => setDisplayMode('grid')}
            className={cn(
              "px-3 py-2 transition-colors",
              displayMode === 'grid' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDisplayMode('list')}
            className={cn(
              "px-3 py-2 transition-colors",
              displayMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Diagrams Grid/List */}
      {filteredDiagrams.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center">
            <Grid3X3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium text-foreground mb-2">No diagrams yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first diagram to visualize your home systems
            </p>
            <Button onClick={() => setIsNewDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Diagram
            </Button>
          </CardContent>
        </Card>
      ) : displayMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDiagrams.map((diagram) => {
            const category = DIAGRAM_CATEGORIES.find((c) => c.value === diagram.category);
            return (
              <Card
                key={diagram.id}
                className="group overflow-hidden hover:shadow-lg transition-all cursor-pointer bg-card/80 border-border/50"
                onClick={() => handleOpenDiagram(diagram)}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-muted/20 relative overflow-hidden">
                  {diagram.thumbnail ? (
                    <img
                      src={diagram.thumbnail}
                      alt={diagram.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {category?.icon || '📋'}
                    </div>
                  )}
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenDiagram(diagram); }}>
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); handleExport(diagram); }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground truncate">{diagram.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {category?.icon} {category?.label}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditMetadata(diagram); }}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedDiagram(diagram); setIsDeleteDialogOpen(true); }}
                        className="p-1 hover:bg-destructive/20 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                  {diagram.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{diagram.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Updated {new Date(diagram.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDiagrams.map((diagram) => {
            const category = DIAGRAM_CATEGORIES.find((c) => c.value === diagram.category);
            return (
              <div
                key={diagram.id}
                className="flex items-center gap-4 p-3 bg-card/80 rounded-lg border border-border/50 hover:bg-card transition-all cursor-pointer"
                onClick={() => handleOpenDiagram(diagram)}
              >
                <div className="w-16 h-12 bg-muted/20 rounded flex items-center justify-center text-2xl flex-shrink-0">
                  {diagram.thumbnail ? (
                    <img src={diagram.thumbnail} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    category?.icon || '📋'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{diagram.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {category?.label} • Updated {new Date(diagram.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleExport(diagram); }}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditMetadata(diagram); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedDiagram(diagram); setIsDeleteDialogOpen(true); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Diagram Dialog */}
      <Dialog
        open={isNewDialogOpen}
        onClose={() => setIsNewDialogOpen(false)}
        title="Create New Diagram"
        description="Start with a blank canvas"
        maxWidth="md"
      >
        <form onSubmit={handleCreateDiagram}>
          <div className="space-y-4">
            <Input
              label="Diagram Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Network Diagram"
              required
            />
            <Select
              label="Category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as Diagram['category'])}
              options={DIAGRAM_CATEGORIES.map((c) => ({
                value: c.value,
                label: `${c.icon} ${c.label}`,
              }))}
            />
            <Textarea
              label="Description (optional)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What does this diagram show?"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsNewDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Diagram Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => { setIsEditDialogOpen(false); setSelectedDiagram(null); }}
        title="Edit Diagram Details"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateMetadata}>
          <div className="space-y-4">
            <Input
              label="Diagram Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <Select
              label="Category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as Diagram['category'])}
              options={DIAGRAM_CATEGORIES.map((c) => ({
                value: c.value,
                label: `${c.icon} ${c.label}`,
              }))}
            />
            <Textarea
              label="Description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedDiagram(null); }}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedDiagram(null); }}
        title="Delete Diagram?"
        maxWidth="sm"
      >
        <p className="text-muted-foreground mb-4">
          Are you sure you want to delete "{selectedDiagram?.name}"? This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedDiagram(null); }}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteDiagram}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

