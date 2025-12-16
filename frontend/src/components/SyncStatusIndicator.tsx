/**
 * Sync Status Indicator
 * Shows real-time sync status in the header
 */

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useRealtimeSync } from '../lib/realtimeSync';

export function SyncStatusIndicator() {
  const { status, syncNow } = useRealtimeSync();
  const [showTooltip, setShowTooltip] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  // Show success animation after sync
  useEffect(() => {
    if (status.lastSyncStatus === 'success') {
      setJustSynced(true);
      const timer = setTimeout(() => setJustSynced(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status.lastSyncTime]);

  const getStatusIcon = () => {
    if (status.isSyncing) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (justSynced) {
      return <Check className="w-4 h-4 text-emerald-500" />;
    }
    if (!status.isOnline) {
      return <CloudOff className="w-4 h-4 text-amber-500" />;
    }
    if (status.lastSyncStatus === 'failed') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (status.pendingChanges > 0) {
      return <RefreshCw className="w-4 h-4 text-amber-500" />;
    }
    return <Cloud className="w-4 h-4 text-emerald-500" />;
  };

  const getStatusText = () => {
    if (status.isSyncing) return 'Syncing...';
    if (justSynced) return 'Synced';
    if (!status.isOnline) return 'Offline';
    if (status.lastSyncStatus === 'failed') return 'Sync failed';
    if (status.pendingChanges > 0) return `${status.pendingChanges} pending`;
    return 'Synced';
  };

  const getStatusColor = () => {
    if (status.isSyncing) return 'text-blue-500';
    if (justSynced) return 'text-emerald-500';
    if (!status.isOnline) return 'text-amber-500';
    if (status.lastSyncStatus === 'failed') return 'text-red-500';
    if (status.pendingChanges > 0) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const formatLastSync = () => {
    if (!status.lastSyncTime) return 'Never';
    
    const date = new Date(status.lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => status.pendingChanges > 0 || !status.isOnline ? syncNow() : setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
          "hover:bg-muted/50 text-sm",
          getStatusColor()
        )}
        title="Click to sync now"
      >
        {getStatusIcon()}
        <span className="hidden lg:inline text-xs font-medium">{getStatusText()}</span>
      </button>

      {/* Tooltip with details */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Sync Status</span>
              <span className={cn("text-xs px-1.5 py-0.5 rounded", 
                status.isOnline ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
              )}>
                {status.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Last sync:</span>
                <span className="text-foreground">{formatLastSync()}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending changes:</span>
                <span className="text-foreground">{status.pendingChanges}</span>
              </div>
              <div className="flex justify-between">
                <span>Server version:</span>
                <span className="text-foreground">{status.serverVersion || 'Unknown'}</span>
              </div>
            </div>

            {(status.pendingChanges > 0 || status.lastSyncStatus === 'failed') && (
              <button
                onClick={syncNow}
                className="w-full mt-2 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Sync Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SyncStatusIndicator;









