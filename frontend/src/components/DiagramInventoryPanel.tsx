import { useState, useMemo } from 'react';
import { useInventoryStore, InventoryItem } from '../store/inventoryStore';
import { Button } from './ui/Button';
import {
  Package,
  Search,
  ChevronDown,
  ChevronRight,
  Zap,
  Sofa,
  Wrench,
  Lightbulb,
  Thermometer,
  Tv,
  X,
  GripVertical,
} from 'lucide-react';
import { cn } from '../lib/utils';

// Category icons for inventory items
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Kitchen Appliances': <Thermometer className="w-4 h-4" />,
  'Laundry': <Package className="w-4 h-4" />,
  'HVAC': <Thermometer className="w-4 h-4" />,
  'Electronics': <Tv className="w-4 h-4" />,
  'Furniture': <Sofa className="w-4 h-4" />,
  'Tools': <Wrench className="w-4 h-4" />,
  'Outdoor Equipment': <Package className="w-4 h-4" />,
  'Smart Home Devices': <Zap className="w-4 h-4" />,
  'Plumbing Fixtures': <Package className="w-4 h-4" />,
  'Lighting': <Lightbulb className="w-4 h-4" />,
  'Decor': <Sofa className="w-4 h-4" />,
  'Other': <Package className="w-4 h-4" />,
};

interface DiagramInventoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItemToDiagram: (item: InventoryItem) => void;
}

export function DiagramInventoryPanel({
  isOpen,
  onClose,
  onAddItemToDiagram,
}: DiagramInventoryPanelProps) {
  const { items } = useInventoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, InventoryItem[]> = {};
    items.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [items]);

  // Filter items by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return itemsByCategory;
    }
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, InventoryItem[]> = {};
    Object.entries(itemsByCategory).forEach(([category, categoryItems]) => {
      const matchingItems = categoryItems.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
      );
      if (matchingItems.length > 0) {
        filtered[category] = matchingItems;
      }
    });
    return filtered;
  }, [itemsByCategory, searchQuery]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, item: InventoryItem) => {
    // Set drag data with item info
    const dragData = {
      type: 'inventory-item',
      item: {
        id: item.id,
        name: item.name,
        category: item.category,
        brand: item.brand,
        location: item.location,
      },
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-card border-l border-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Inventory Assets</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="px-3 py-2 bg-primary/10 border-b border-border">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-primary">Drag & drop</span> items onto your diagram, or click to add at center
        </p>
      </div>

      {/* Categories and Items */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(filteredCategories).length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {searchQuery ? 'No matching inventory items' : 'No inventory items yet'}
          </div>
        ) : (
          Object.entries(filteredCategories).map(([category, categoryItems]) => (
            <div key={category} className="border-b border-border/50">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-muted-foreground">
                  {CATEGORY_ICONS[category] || <Package className="w-4 h-4" />}
                </span>
                <span className="text-sm font-medium text-foreground flex-1 text-left">
                  {category}
                </span>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  {categoryItems.length}
                </span>
              </button>

              {/* Category Items */}
              {expandedCategories.has(category) && (
                <div className="pb-2" role="list" aria-label={`${category} items`}>
                  {categoryItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onClick={() => onAddItemToDiagram(item)}
                      aria-label={`Add ${item.name} to diagram`}
                      className={cn(
                        "w-full text-left mx-2 mb-1 p-2 rounded-md border border-transparent",
                        "bg-muted/20 hover:bg-muted/40 hover:border-primary/30",
                        "cursor-grab active:cursor-grabbing",
                        "transition-all duration-150",
                        "group flex items-center gap-2"
                      )}
                      style={{ width: 'calc(100% - 1rem)' }}
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.brand && `${item.brand} • `}
                          {item.location || 'No location'}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-3 py-2 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground">
          {items.length} total items • {Object.keys(filteredCategories).length} categories
        </p>
      </div>
    </div>
  );
}

export default DiagramInventoryPanel;

