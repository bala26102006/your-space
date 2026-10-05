import { useRef, useState, useCallback, useEffect } from 'react';
import { pushToCloud } from '../lib/sync/syncEngine';

export function useDebouncedSave(delay = 1000) {
  const [saveStatus, setSaveStatus] = useState(typeof navigator !== 'undefined' && navigator.onLine ? 'saved' : 'offline'); // 'saved' | 'saving' | 'offline'
  const timerRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setSaveStatus('saved');
    const handleOffline = () => setSaveStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const triggerSave = useCallback((saveAction) => {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSaveStatus('offline');
        if (typeof saveAction === 'function') {
          saveAction();
        }
        return;
      }
      
      setSaveStatus('saving');
      
      // Execute local save immediately (optimistic write)
      if (typeof saveAction === 'function') {
        saveAction();
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(async () => {
        try {
          await pushToCloud();
          setSaveStatus(typeof navigator !== 'undefined' && navigator.onLine ? 'saved' : 'offline');
        } catch (err) {
          console.warn('Debounced save cloud push warning:', err);
          setSaveStatus('saved');
        }
      }, delay);
    } catch (err) {
      console.error('Trigger save error:', err);
    }
  }, [delay]);

  return { saveStatus, triggerSave, setSaveStatus };
}
