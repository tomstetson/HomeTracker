import { useState, useEffect, useCallback, useRef } from 'react';
import { Tldraw, Editor, exportToBlob } from 'tldraw';
import 'tldraw/tldraw.css';
import { useDiagramStore, Diagram, DIAGRAM_CATEGORIES } from '../store/diagramStore';
import { useInventoryStore } from '../store/inventoryStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import {
  DIAGRAM_SHAPES,
  DIAGRAM_TEMPLATES,
  SHAPE_CATEGORIES,
  getShapesByCategory,
  DiagramShape,
  DiagramTemplate,
} from '../lib/diagramShapes';
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
  ChevronRight,
  Shapes,
  FileText,
  Layers,
} from 'lucide-react';
import { cn } from '../lib/utils';

type ViewMode = 'gallery' | 'editor';
type EditorPanel = 'shapes' | 'templates' | 'inventory' | null;

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
  const { items: inventoryItems } = useInventoryStore();
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
  
  // Editor state
  const [activePanel, setActivePanel] = useState<EditorPanel>('shapes');
  const [selectedShapeCategory, setSelectedShapeCategory] = useState('basic');
  const [shapeSearchQuery, setShapeSearchQuery] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('');

  // Tldraw editor reference
  const editorRef = useRef<Editor | null>(null);

  // Form state
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

  // Filter shapes
  const filteredShapes = getShapesByCategory(selectedShapeCategory).filter(
    (shape) => shape.name.toLowerCase().includes(shapeSearchQuery.toLowerCase())
  );

  // Filter inventory
  const filteredInventory = inventoryItems.filter((item) => {
    if (item.status !== 'active') return false;
    return item.name.toLowerCase().includes(inventoryFilter.toLowerCase());
  });

  // Handle creating a new diagram
  const handleCreateDiagram = (e: React.FormEvent) => {
    e.preventDefault();
    const id = addDiagram({
      name: formName,
      description: formDescription,
      category: formCategory,
      data: null,
    });
    setIsNewDialogOpen(false);
    const savedFormName = formName;
    setFormName('');
    setFormDescription('');
    setFormCategory('other');
    setActiveDiagram(id);
    setHasUnsavedChanges(false);
    setViewMode('editor');
    toast.success('Diagram Created', `Created "${savedFormName}"`);
  };

  // Handle creating from template
  const handleCreateFromTemplate = (template: DiagramTemplate) => {
    const id = addDiagram({
      name: template.name,
      description: template.description,
      category: template.category as Diagram['category'],
      data: null,
    });
    setActiveDiagram(id);
    setHasUnsavedChanges(false);
    setViewMode('editor');
    
    // Apply template shapes after editor loads
    setTimeout(() => {
      if (editorRef.current) {
        applyTemplate(template);
      }
    }, 500);
    
    toast.success('Template Applied', `Created "${template.name}"`);
  };

  // Apply template to canvas
  const applyTemplate = (template: DiagramTemplate) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    
    template.shapes.forEach((shape, index) => {
      if (shape.type === 'rect') {
        editor.createShape({
          type: 'geo',
          x: shape.x,
          y: shape.y,
          props: {
            geo: 'rectangle',
            w: shape.width || 100,
            h: shape.height || 60,
            text: shape.text || '',
            fill: 'solid',
            color: 'light-blue',
          },
        });
      } else if (shape.type === 'text') {
        editor.createShape({
          type: 'text',
          x: shape.x,
          y: shape.y,
          props: {
            text: shape.text || '',
            size: shape.props?.size || 'm',
          },
        });
      } else if (shape.type === 'ellipse') {
        editor.createShape({
          type: 'geo',
          x: shape.x,
          y: shape.y,
          props: {
            geo: 'ellipse',
            w: shape.width || 60,
            h: shape.height || 60,
            text: shape.text || '',
            fill: 'solid',
          },
        });
      }
    });
    
    setHasUnsavedChanges(true);
  };

  // Handle opening a diagram
  const handleOpenDiagram = (diagram: Diagram) => {
    setActiveDiagram(diagram.id);
    setHasUnsavedChanges(false);
    setViewMode('editor');
  };

  // Handle saving
  const handleSaveDiagram = useCallback(async () => {
    if (!activeDiagramId || !editorRef.current) return;

    try {
      const editor = editorRef.current;
      const snapshot = editor.store.getSnapshot();
      
      let thumbnail: string | undefined;
      try {
        const shapeIds = editor.getCurrentPageShapeIds();
        if (shapeIds.size > 0) {
          const blob = await exportToBlob({
            editor,
            format: 'png',
            ids: [...shapeIds],
          });
          thumbnail = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn('Failed to generate thumbnail:', e);
      }

      updateDiagram(activeDiagramId, { data: snapshot, thumbnail });
      setHasUnsavedChanges(false);
      toast.success('Saved', 'Diagram saved successfully');
    } catch (error) {
      toast.error('Error', 'Failed to save diagram');
    }
  }, [activeDiagramId, updateDiagram, toast]);

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
    editorRef.current = null;
  };

  // Add shape to canvas
  const handleAddShape = (shape: DiagramShape) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const { x, y } = editor.getViewportScreenCenter();
    
    editor.createShape({
      type: 'geo',
      x: x - shape.width / 2,
      y: y - shape.height / 2,
      props: {
        geo: 'rectangle',
        w: shape.width,
        h: shape.height,
        text: `${shape.emoji} ${shape.name}`,
        fill: 'solid',
        color: 'light-blue',
        size: 's',
      },
    });
    
    setHasUnsavedChanges(true);
    toast.success('Added', `${shape.name} added to diagram`);
  };

  // Add inventory item to canvas
  const handleAddInventoryItem = (item: any) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const { x, y } = editor.getViewportScreenCenter();
    
    editor.createShape({
      type: 'geo',
      x: x - 75,
      y: y - 40,
      props: {
        geo: 'rectangle',
        w: 150,
        h: 80,
        text: `📦 ${item.name}\n${item.brand || item.category}`,
        fill: 'solid',
        color: 'light-blue',
        size: 's',
      },
    });
    
    setHasUnsavedChanges(true);
    toast.success('Added', `"${item.name}" added`);
  };

  // Handle edit metadata
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

  // Handle export
  const handleExport = async (diagram: Diagram) => {
    if (!editorRef.current || activeDiagramId !== diagram.id) {
      toast.info('Note', 'Open the diagram first to export');
      return;
    }
    try {
      const editor = editorRef.current;
      const shapeIds = editor.getCurrentPageShapeIds();
      if (shapeIds.size === 0) {
        toast.error('Error', 'No shapes to export');
        return;
      }
      const blob = await exportToBlob({ editor, format: 'png', ids: [...shapeIds] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${diagram.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported', 'Diagram exported as PNG');
    } catch (error) {
      toast.error('Error', 'Failed to export');
    }
  };

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
        <div className="flex items-center justify-between p-2 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToGallery}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="h-5 w-px bg-border" />
            <div>
              <h2 className="font-semibold text-foreground text-sm">{activeDiagram.name}</h2>
              <p className="text-[10px] text-muted-foreground">
                {DIAGRAM_CATEGORIES.find(c => c.value === activeDiagram.category)?.label}
                {hasUnsavedChanges && ' • Unsaved'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => handleEditMetadata(activeDiagram)}>
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport(activeDiagram)}>
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
            <Button size="sm" onClick={handleSaveDiagram} disabled={!hasUnsavedChanges}>
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-12 bg-card border-r border-border flex flex-col items-center py-2 gap-1 shrink-0">
            <button
              onClick={() => setActivePanel(activePanel === 'shapes' ? null : 'shapes')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                activePanel === 'shapes' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              title="Shapes"
            >
              <Shapes className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActivePanel(activePanel === 'templates' ? null : 'templates')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                activePanel === 'templates' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              title="Templates"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActivePanel(activePanel === 'inventory' ? null : 'inventory')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                activePanel === 'inventory' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              title="Inventory"
            >
              <Package className="w-5 h-5" />
            </button>
          </div>

          {/* Left Panel */}
          {activePanel && (
            <div className="w-64 bg-card border-r border-border flex flex-col shrink-0 overflow-hidden">
              {/* Shapes Panel */}
              {activePanel === 'shapes' && (
                <>
                  <div className="p-2 border-b border-border">
                    <h3 className="font-medium text-sm mb-2">Shapes</h3>
                    <input
                      type="text"
                      placeholder="Search shapes..."
                      value={shapeSearchQuery}
                      onChange={(e) => setShapeSearchQuery(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-background border border-input rounded"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 p-2 border-b border-border">
                    {SHAPE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedShapeCategory(cat.id)}
                        className={cn(
                          "px-2 py-1 text-[10px] rounded transition-colors",
                          selectedShapeCategory === cat.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted"
                        )}
                      >
                        {cat.icon}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="grid grid-cols-2 gap-1">
                      {filteredShapes.map((shape) => (
                        <button
                          key={shape.id}
                          onClick={() => handleAddShape(shape)}
                          className="p-2 text-center rounded border border-border hover:border-primary hover:bg-primary/5 transition-all"
                        >
                          <span className="text-xl block">{shape.emoji}</span>
                          <span className="text-[10px] text-muted-foreground line-clamp-1">{shape.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Templates Panel */}
              {activePanel === 'templates' && (
                <>
                  <div className="p-2 border-b border-border">
                    <h3 className="font-medium text-sm">Templates</h3>
                    <p className="text-[10px] text-muted-foreground">Click to apply</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {DIAGRAM_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleCreateFromTemplate(template)}
                        className="w-full p-2 text-left rounded border border-border hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{template.thumbnail}</span>
                          <div>
                            <p className="text-xs font-medium">{template.name}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{template.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Inventory Panel */}
              {activePanel === 'inventory' && (
                <>
                  <div className="p-2 border-b border-border">
                    <h3 className="font-medium text-sm mb-2">Inventory</h3>
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={inventoryFilter}
                      onChange={(e) => setInventoryFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-background border border-input rounded"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {filteredInventory.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No items</p>
                    ) : (
                      <div className="space-y-1">
                        {filteredInventory.slice(0, 50).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleAddInventoryItem(item)}
                            className="w-full p-2 text-left rounded hover:bg-muted transition-colors"
                          >
                            <p className="text-xs font-medium truncate">📦 {item.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{item.category}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 relative bg-white">
            <Tldraw
              onMount={(editor) => {
                editorRef.current = editor;
                if (activeDiagram.data) {
                  try {
                    editor.store.loadSnapshot(activeDiagram.data);
                  } catch (e) {
                    console.warn('Failed to load diagram:', e);
                  }
                }
                editor.store.listen(() => setHasUnsavedChanges(true), { scope: 'document' });
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Gallery View
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Diagrams</h1>
          <p className="text-sm text-muted-foreground">Create and manage home diagrams</p>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Diagram
        </Button>
      </div>

      {/* Quick Templates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {DIAGRAM_TEMPLATES.slice(0, 8).map((template) => (
          <button
            key={template.id}
            onClick={() => handleCreateFromTemplate(template)}
            className="p-3 text-center rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
          >
            <span className="text-2xl block mb-1">{template.thumbnail}</span>
            <span className="text-[10px] text-muted-foreground line-clamp-1">{template.name}</span>
          </button>
        ))}
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm transition-all",
            categoryFilter === 'all' ? "bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-muted/50"
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
                categoryFilter === cat.value ? "bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-muted/50"
              )}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search diagrams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex border border-input rounded-md overflow-hidden">
          <button
            onClick={() => setDisplayMode('grid')}
            className={cn("px-3 py-2", displayMode === 'grid' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50")}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDisplayMode('list')}
            className={cn("px-3 py-2", displayMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted/50")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Diagrams */}
      {filteredDiagrams.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center">
            <Shapes className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No diagrams yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first diagram or use a template</p>
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
                className="group overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => handleOpenDiagram(diagram)}
              >
                <div className="aspect-video bg-muted/20 relative overflow-hidden">
                  {diagram.thumbnail ? (
                    <img src={diagram.thumbnail} alt={diagram.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">{category?.icon || '📋'}</div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary">Open</Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium truncate">{diagram.name}</h3>
                  <p className="text-xs text-muted-foreground">{category?.icon} {category?.label}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(diagram.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleEditMetadata(diagram); }} className="p-1 hover:bg-muted rounded">
                        <Edit className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedDiagram(diagram); setIsDeleteDialogOpen(true); }} className="p-1 hover:bg-destructive/20 rounded">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </div>
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
                className="flex items-center gap-4 p-3 bg-card rounded-lg border hover:bg-card/80 cursor-pointer"
                onClick={() => handleOpenDiagram(diagram)}
              >
                <div className="w-16 h-12 bg-muted/20 rounded flex items-center justify-center text-2xl">
                  {diagram.thumbnail ? <img src={diagram.thumbnail} alt="" className="w-full h-full object-cover rounded" /> : category?.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{diagram.name}</h3>
                  <p className="text-xs text-muted-foreground">{category?.label} • {new Date(diagram.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditMetadata(diagram); }}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedDiagram(diagram); setIsDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Diagram Dialog */}
      <Dialog open={isNewDialogOpen} onClose={() => setIsNewDialogOpen(false)} title="Create New Diagram" maxWidth="md">
        <form onSubmit={handleCreateDiagram}>
          <div className="space-y-4">
            <Input label="Diagram Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Home Network" required />
            <Select
              label="Category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as Diagram['category'])}
              options={DIAGRAM_CATEGORIES.map((c) => ({ value: c.value, label: `${c.icon} ${c.label}` }))}
            />
            <Textarea label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="What does this diagram show?" rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsNewDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!formName.trim()}><Plus className="w-4 h-4 mr-2" />Create</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => { setIsEditDialogOpen(false); setSelectedDiagram(null); }} title="Edit Diagram" maxWidth="md">
        <form onSubmit={handleUpdateMetadata}>
          <div className="space-y-4">
            <Input label="Diagram Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            <Select
              label="Category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as Diagram['category'])}
              options={DIAGRAM_CATEGORIES.map((c) => ({ value: c.value, label: `${c.icon} ${c.label}` }))}
            />
            <Textarea label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedDiagram(null); }}>Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => { setIsDeleteDialogOpen(false); setSelectedDiagram(null); }} title="Delete Diagram?" maxWidth="sm">
        <p className="text-muted-foreground mb-4">Delete "{selectedDiagram?.name}"? This cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedDiagram(null); }}>Cancel</Button>
          <Button variant="destructive" onClick={handleDeleteDiagram}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
