import { cn } from '../../lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'outside' | 'none';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
  showLabel = false,
  labelPosition = 'outside',
  size = 'md',
  variant = 'default',
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && labelPosition === 'outside' && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          "w-full bg-muted/50 rounded-full overflow-hidden",
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            variantClasses[variant],
            indicatorClassName
          )}
          style={{ width: `${percentage}%` }}
        >
          {showLabel && labelPosition === 'inside' && size === 'lg' && (
            <span className="px-2 text-xs text-white font-medium">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProgressStepsProps {
  current: number;
  total: number;
  className?: string;
  showNumbers?: boolean;
  labels?: string[];
}

export function ProgressSteps({
  current,
  total,
  className,
  showNumbers = true,
  labels,
}: ProgressStepsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Array.from({ length: total }).map((_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < current;
        const isCurrent = stepNumber === current;

        return (
          <div key={index} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center rounded-full transition-colors",
                showNumbers ? "w-8 h-8 text-sm font-medium" : "w-3 h-3",
                isCompleted && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {showNumbers && stepNumber}
            </div>
            {labels && labels[index] && (
              <span className={cn(
                "ml-2 text-sm",
                isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {labels[index]}
              </span>
            )}
            {index < total - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface AIProgressProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed: number;
  total: number;
  currentItem?: string;
  error?: string;
  className?: string;
}

export function AIProgress({
  status,
  processed,
  total,
  currentItem,
  error,
  className,
}: AIProgressProps) {
  const percentage = total > 0 ? (processed / total) * 100 : 0;

  const statusConfig = {
    pending: { label: 'Waiting...', variant: 'default' as const },
    processing: { label: 'Processing...', variant: 'default' as const },
    completed: { label: 'Completed', variant: 'success' as const },
    failed: { label: 'Failed', variant: 'danger' as const },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className={cn(
          "font-medium",
          status === 'completed' && "text-green-600",
          status === 'failed' && "text-red-600"
        )}>
          {config.label}
        </span>
        <span className="text-muted-foreground">
          {processed} / {total}
        </span>
      </div>
      
      <Progress 
        value={percentage} 
        variant={config.variant}
        size="md"
      />
      
      {currentItem && status === 'processing' && (
        <p className="text-xs text-muted-foreground truncate">
          Processing: {currentItem}
        </p>
      )}
      
      {error && status === 'failed' && (
        <p className="text-xs text-red-600">
          Error: {error}
        </p>
      )}
    </div>
  );
}
