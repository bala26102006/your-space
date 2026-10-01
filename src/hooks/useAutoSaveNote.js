import { useState, useEffect } from 'react';
import { useDebouncedSave } from './useDebouncedSave';
import { updateNote } from '../lib/services/noteService';

/**
 * A dedicated hook for the editor to instantly save local React state,
 * immediately save to Dexie, and debounce the cloud push.
 */
export function useAutoSaveNote(noteId, initialContent) {
  const { saveStatus, triggerSave, setSaveStatus } = useDebouncedSave(1000);
  const [localContent, setLocalContent] = useState(initialContent);

  // Keep local state in sync if the external initialContent changes
  useEffect(() => {
    setLocalContent(initialContent);
  }, [initialContent]);

  const updateContent = (newContent) => {
    setLocalContent(newContent);
    
    triggerSave(() => {
      // Writes to Dexie immediately (no debounce on local write).
      // Even if user closes the tab immediately, Dexie will have captured it.
      updateNote(noteId, { content: newContent }).catch(err => {
        console.error('Autosave local write failed:', err);
        setSaveStatus('offline'); // Optional fallback visual
      });
    });
  };

  return {
    localContent,
    updateContent,
    saveStatus,
    setSaveStatus
  };
}
