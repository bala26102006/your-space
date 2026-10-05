import React from 'react';
import { CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

export default function SavedIndicator({ status = 'saved' }) {
  const { user } = useUIStore();
  
  // If in local mode, there is no cloud, so we never show offline sync warnings.
  const displayStatus = (status === 'offline' && user?.id === 'local-user') ? 'saved' : status;

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-muted transition-opacity duration-200">
      {displayStatus === 'saving' && (
        <>
          <RefreshCw className="w-3 h-3 animate-spin text-text-muted" />
          <span>Saving...</span>
        </>
      )}
      {displayStatus === 'saved' && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 opacity-80" />
          <span className="opacity-80">Saved</span>
        </>
      )}
      {displayStatus === 'offline' && (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-500">Offline — will sync</span>
        </>
      )}
    </div>
  );
}
