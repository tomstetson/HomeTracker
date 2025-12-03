import { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useOptionsStore, CustomOptions } from '../../store/optionsStore';

interface EditableSelectProps {
  label?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  optionKey: keyof CustomOptions;
  placeholder?: string;
  required?: boolean;
  className?: string;
  allowCustom?: boolean; // Whether to allow adding custom options
}

export function EditableSelect({
  label,
  name,
  value,
  onChange,
  optionKey,
  placeholder = 'Select...',
  required = false,
  className,
  allowCustom = true,
}: EditableSelectProps) {
  const { getOptions, addOption, removeOption, isDefault } = useOptionsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newValue, setNewValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = getOptions(optionKey);
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange?.(option);
    setIsOpen(false);
    setSearch('');
  };

  const handleAddNew = () => {
    if (newValue.trim()) {
      addOption(optionKey, newValue.trim());
      onChange?.(newValue.trim());
      setNewValue('');
      setIsAddingNew(false);
      setIsOpen(false);
    }
  };

  const handleRemove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeOption(optionKey, option);
    if (value === option) {
      onChange?.('');
    }
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      {/* Hidden native select for form submission */}
      <input type="hidden" name={name} value={value || ''} />
      
      {/* Custom select trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border",
          "bg-background border-input text-foreground",
          "hover:bg-muted/50 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or type to filter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
          
          {/* Options list */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer",
                    "hover:bg-muted/50 transition-colors",
                    value === option && "bg-primary/10 text-primary"
                  )}
                >
                  <span className="truncate">{option}</span>
                  <div className="flex items-center gap-1">
                    {value === option && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                    {!isDefault(optionKey, option) && (
                      <button
                        onClick={(e) => handleRemove(option, e)}
                        className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                        title="Remove custom option"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Add new option */}
          {allowCustom && (
            <div className="p-2 border-t border-border">
              {isAddingNew ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New option..."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNew();
                      }
                      if (e.key === 'Escape') {
                        setIsAddingNew(false);
                        setNewValue('');
                      }
                    }}
                    className="flex-1 px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddNew}
                    disabled={!newValue.trim()}
                    className="px-2 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewValue('');
                    }}
                    className="px-2 py-1 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add custom option
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

