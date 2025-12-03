import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  label?: string;
  maxTags?: number;
  className?: string;
}

export function TagInput({
  tags,
  onChange,
  placeholder = 'Add a tag...',
  suggestions = [],
  label,
  maxTags = 10,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestion, setFocusedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input and exclude already selected tags
  const filteredSuggestions = suggestions.filter(
    (s) => 
      s.toLowerCase().includes(inputValue.toLowerCase()) && 
      !tags.includes(s)
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onChange([...tags, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
      setFocusedSuggestion(-1);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedSuggestion >= 0 && filteredSuggestions[focusedSuggestion]) {
        addTag(filteredSuggestions[focusedSuggestion]);
      } else if (inputValue) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestion((prev) => 
        Math.min(prev + 1, filteredSuggestions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestion((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedSuggestion(-1);
    } else if (e.key === ',' || e.key === 'Tab') {
      if (inputValue) {
        e.preventDefault();
        addTag(inputValue);
      }
    }
  };

  return (
    <div ref={containerRef} className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div
          className={cn(
            'flex flex-wrap gap-2 p-2 min-h-[42px] rounded-md border border-input bg-background',
            'focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent',
            'transition-colors'
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Existing Tags */}
          {tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md',
                'bg-primary/20 text-primary text-sm font-medium',
                'animate-in fade-in zoom-in-95 duration-200'
              )}
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          
          {/* Input */}
          {tags.length < maxTags && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
                setFocusedSuggestion(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder={tags.length === 0 ? placeholder : ''}
              className={cn(
                'flex-1 min-w-[100px] bg-transparent outline-none text-sm',
                'placeholder:text-muted-foreground'
              )}
            />
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className={cn(
            'absolute z-50 w-full mt-1 py-1 rounded-md border border-border',
            'bg-card shadow-lg max-h-48 overflow-y-auto',
            'animate-in fade-in-0 zoom-in-95 duration-200'
          )}>
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  focusedSuggestion === index && 'bg-accent text-accent-foreground'
                )}
              >
                <Plus className="w-3 h-3 inline mr-2 opacity-50" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="mt-1.5 text-xs text-muted-foreground">
        Press Enter or comma to add. {tags.length}/{maxTags} tags.
      </p>
    </div>
  );
}

// Predefined tag suggestions for different categories
export const PROJECT_TAG_SUGGESTIONS = [
  'urgent',
  'outdoor',
  'indoor',
  'kitchen',
  'bathroom',
  'bedroom',
  'living room',
  'garage',
  'basement',
  'attic',
  'electrical',
  'plumbing',
  'hvac',
  'landscaping',
  'painting',
  'flooring',
  'roofing',
  'maintenance',
  'renovation',
  'repair',
  'upgrade',
  'diy',
  'contractor',
  'permits',
  'inspection',
  'energy',
  'safety',
  'aesthetic',
  'structural',
];


