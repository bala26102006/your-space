import React, { useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

export default function FocusModeToggle() {
  const { focusMode, setFocusMode } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        setFocusMode(!focusMode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, setFocusMode]);

  return (
    <button
      onClick={() => setFocusMode(!focusMode)}
      title={focusMode ? 'Exit Focus Mode (Ctrl+.)' : 'Enter Focus Mode (Ctrl+.)'}
      className="p-1.5 rounded-button hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
    >
      {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
    </button>
  );
}
