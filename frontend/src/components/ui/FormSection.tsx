import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  hasData?: boolean;
  icon?: ReactNode;
  badge?: string;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  hasData = false,
  icon,
  badge,
  className,
}: FormSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded || hasData);
  
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;
  
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  return (
    <div className={cn("border border-border/50 rounded-lg overflow-hidden", className)}>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
          "hover:bg-muted/50",
          isExpanded ? "bg-muted/30 border-b border-border/50" : "bg-transparent"
        )}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="text-muted-foreground">{icon}</span>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{title}</span>
              {badge && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {badge}
                </span>
              )}
              {hasData && !isExpanded && (
                <span className="w-2 h-2 rounded-full bg-primary" title="Has data" />
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <span className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </span>
      </button>
      
      <div
        className={cn(
          "transition-all duration-200 ease-in-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        <div className="p-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

interface FormSectionGroupProps {
  children: ReactNode;
  className?: string;
}

export function FormSectionGroup({ children, className }: FormSectionGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {children}
    </div>
  );
}
