import { useState, useMemo } from 'react';
import { useInventoryStore, InventoryItem } from '../store/inventoryStore';
import { useOptionsStore } from '../store/optionsStore';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import {
  Search,
  Package,
  MapPin,
  Tag,
  Check,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ItemLinkSelectorProps {
  selectedItemId: string | null;
  onSelect: (item: InventoryItem | null) => void;
  excludeItemIds?: string[];
  showConfirmButton?: boolean;
  onConfirm?: () => void;
  confirmText?: string;
}

export function ItemLinkSelector({
  selectedItemId,
  onSelect,
  excludeItemIds = [],
  showConfirmButton = false,
  onConfirm,
  confirmText = 'Link Item',
}: ItemLinkSelectorProps) {
  const { getActiveItems } = useInventoryStore();
  const { getOptions } = useOptionsStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const activeItems = getActiveItems();
  const categories = getOptions('inventoryCategories');

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return activeItems.filter(item => {
      // Exclude specified items
      if (excludeItemIds.includes(item.id)) return false;
      
      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query) ||
          item.modelNumber?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [activeItems, excludeItemIds, categoryFilter, searchQuery]);

  // Group items by category for better organization
  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const selectedItem = selectedItemId 
    ? activeItems.find(i => i.id === selectedItemId) 
    : null;

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-40"
          options={[
            { value: 'all', label: 'All Categories' },
            ...categories.map(c => ({ value: c, label: c }))
          ]}
        />
      </div>

      {/* Items List */}
      <div className="max-h-64 overflow-y-auto border border-border rounded-lg divide-y divide-border">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items found</p>
            {searchQuery && (
              <p className="text-xs mt-1">Try a different search term</p>
            )}
          </div>
        ) : categoryFilter === 'all' ? (
          // Grouped view when showing all categories
          Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <div className="px-3 py-1.5 bg-muted/30 text-xs font-medium text-muted-foreground sticky top-0">
                {category} ({items.length})
              </div>
              {items.map(item => (
                <ItemRow 
                  key={item.id}
                  item={item}
                  isSelected={selectedItemId === item.id}
                  onSelect={() => onSelect(selectedItemId === item.id ? null : item)}
                />
              ))}
            </div>
          ))
        ) : (
          // Flat list when filtering by category
          filteredItems.map(item => (
            <ItemRow 
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              onSelect={() => onSelect(selectedItemId === item.id ? null : item)}
            />
          ))
        )}
      </div>

      {/* Selected Item Preview */}
      {selectedItem && (
        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{selectedItem.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedItem.category} • {selectedItem.location}
              </p>
            </div>
            <Check className="w-5 h-5 text-primary" />
          </div>
        </div>
      )}

      {/* Confirm Button */}
      {showConfirmButton && onConfirm && (
        <Button 
          onClick={onConfirm} 
          disabled={!selectedItemId}
          className="w-full"
        >
          {confirmText}
        </Button>
      )}
    </div>
  );
}

// Individual item row component
function ItemRow({ 
  item, 
  isSelected, 
  onSelect 
}: { 
  item: InventoryItem; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-primary/10"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        isSelected ? "bg-primary text-primary-foreground" : "bg-muted/50"
      )}>
        {isSelected ? (
          <Check className="w-4 h-4" />
        ) : (
          <Package className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium truncate",
          isSelected ? "text-primary" : "text-foreground"
        )}>
          {item.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.brand && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {item.brand}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {item.location}
          </span>
        </div>
      </div>
    </button>
  );
}
