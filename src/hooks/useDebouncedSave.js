import { useRef, useState, useCallback, useEffect } from 'react';
import { pushToCloud } from '../lib/sync/syncEngine';

export function useDebouncedSave(delay = 1000) {
  const [saveStatus, setSaveStatus] = useState(navigator.onLine ? 'saved' : 'offline'); // 'saved' | 'saving' | 'offline'
  const timerRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setSaveStatus('saved');
    const handleOffline = () => setSaveStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSave = useCallback((saveAction) => {
    if (!navigator.onLine) {
      setSaveStatus('offline');
      saveAction();
      return;
    }
    
    setSaveStatus('saving');
    
    // Execute local save immediately (optimistic write)
    saveAction();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      await pushToCloud();
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
    }, delay);
  }, [delay]);

  return { saveStatus, triggerSave, setSaveStatus };
}
