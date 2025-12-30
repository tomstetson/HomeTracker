import { useRef, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: 'red' | 'blue' | 'green' | 'amber';
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
  threshold?: number; // Minimum swipe distance to trigger action
}

const colorClasses = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
};

export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  className,
  threshold = 80,
}: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const diff = e.touches[0].clientX - startX;
    
    // Limit swipe distance
    const maxSwipe = 120;
    const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    
    // Only allow swipe if there are actions in that direction
    if (diff > 0 && leftActions.length === 0) return;
    if (diff < 0 && rightActions.length === 0) return;
    
    setCurrentX(limitedDiff);
  }, [isDragging, startX, leftActions.length, rightActions.length]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    // Check if swipe exceeded threshold
    if (currentX > threshold && leftActions.length > 0) {
      leftActions[0].onClick();
    } else if (currentX < -threshold && rightActions.length > 0) {
      rightActions[0].onClick();
    }
    
    // Reset position
    setCurrentX(0);
  }, [currentX, threshold, leftActions, rightActions]);

  const showLeftActions = currentX > 20;
  const showRightActions = currentX < -20;

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-hidden touch-pan-y', className)}
    >
      {/* Left action background */}
      {leftActions.length > 0 && (
        <div 
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start pl-4',
            colorClasses[leftActions[0].color],
            'transition-opacity',
            showLeftActions ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: Math.abs(currentX) }}
        >
          <div className="text-white flex items-center gap-2">
            {leftActions[0].icon}
            {currentX > threshold && (
              <span className="text-sm font-medium">{leftActions[0].label}</span>
            )}
          </div>
        </div>
      )}

      {/* Right action background */}
      {rightActions.length > 0 && (
        <div 
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end pr-4',
            colorClasses[rightActions[0].color],
            'transition-opacity',
            showRightActions ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: Math.abs(currentX) }}
        >
          <div className="text-white flex items-center gap-2">
            {currentX < -threshold && (
              <span className="text-sm font-medium">{rightActions[0].label}</span>
            )}
            {rightActions[0].icon}
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          'relative bg-card transition-transform',
          !isDragging && 'transition-transform duration-200'
        )}
        style={{ transform: `translateX(${currentX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
