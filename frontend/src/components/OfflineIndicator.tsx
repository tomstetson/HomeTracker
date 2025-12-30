import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Hide the "back online" message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Try to fetch health endpoint to verify connection
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-store' 
      });
      if (response.ok) {
        setIsOnline(true);
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    } catch {
      // Still offline
    } finally {
      setIsRetrying(false);
    }
  };

  // Don't render anything if online and not showing reconnected message
  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50',
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        'transition-all duration-300 animate-in slide-in-from-bottom-4',
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-amber-500 text-white'
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">You're offline</p>
            <p className="text-xs opacity-90">Changes will sync when reconnected</p>
          </div>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />
          </button>
        </>
      )}
    </div>
  );
}

// Hook to check online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
