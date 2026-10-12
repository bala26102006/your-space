import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.css';

// PERMANENT AUTH REMOVAL: Clear browser cache to force old auth state to be forgotten.
localStorage.clear();
sessionStorage.clear();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA Service Worker Registration
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration note:', err);
    });
  });
}

// Web Share Target Receiver: Handles photos shared from phone gallery into Your Space
if (typeof window !== 'undefined' && 'caches' in window) {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('shared-sketch') === 'true') {
    caches.open('share-target-cache').then(async (cache) => {
      const response = await cache.match('/shared-image-temp');
      if (response) {
        try {
          const blob = await response.blob();
          await cache.delete('/shared-image-temp');
          window.history.replaceState({}, document.title, window.location.pathname);

          const { processImageFile } = await import('./lib/sketch/imageUtils');
          const { createSketchNote } = await import('./lib/services/sketchService');
          const { useUIStore } = await import('./store/uiStore');

          const { src, width, height } = await processImageFile(blob);
          const canvasW = 1200;
          const canvasH = 900;
          const fitScale = Math.min((canvasW - 80) / width, (canvasH - 80) / height, 1);
          const w = Math.round(width * fitScale);
          const h = Math.round(height * fitScale);

          const initialDoc = {
            version: 2,
            preset: 'free',
            width: canvasW,
            height: canvasH,
            background: { id: 'dark', pattern: 'grid', showGuides: true },
            layers: [
              {
                id: `layer_photo_${Date.now()}`,
                name: 'Shared Photo',
                type: 'image',
                visible: true,
                opacity: 1,
                items: [
                  {
                    id: `img_${Date.now()}`,
                    type: 'image',
                    src,
                    x: Math.round((canvasW - w) / 2),
                    y: Math.round((canvasH - h) / 2),
                    width: w,
                    height: h,
                    rotation: 0,
                    flipX: false,
                    flipY: false,
                    opacity: 1
                  }
                ]
              },
              {
                id: `layer_draw_${Date.now()}`,
                name: 'Artwork',
                type: 'drawing',
                visible: true,
                opacity: 1,
                items: []
              }
            ]
          };

          const noteId = await createSketchNote('Shared Photo Sketch', '', initialDoc);
          useUIStore.getState().setActiveWorkspace('sketch');
          useUIStore.getState().setSelectedNoteId(noteId);
        } catch (err) {
          console.error('Failed to import shared photo into sketch:', err);
        }
      }
    });
  }
}

