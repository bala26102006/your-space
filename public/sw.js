const CACHE_NAME = 'yourspace-pwa-v1';
const SHARE_CACHE_NAME = 'share-target-cache';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass service worker entirely on localhost/dev to prevent stale caching & HMR conflicts
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1') {
    return;
  }

  // 1. Intercept Web Share Target POST request
  if (
    event.request.method === 'POST' &&
    url.searchParams.get('share-target') === 'true'
  ) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const imageFile = formData.get('image');
        if (imageFile) {
          const cache = await caches.open(SHARE_CACHE_NAME);
          await cache.put(
            '/shared-image-temp',
            new Response(imageFile, {
              headers: {
                'content-type': imageFile.type || 'image/png',
                'x-shared-name': imageFile.name || 'Shared Image'
              }
            })
          );
        }
      } catch (err) {
        console.error('Service worker failed to process shared image:', err);
      }
      // Redirect to main app with shared-sketch flag
      return Response.redirect('./?shared-sketch=true', 303);
    })());
    return;
  }

  // 2. Standard caching for offline support
  if (event.request.method === 'GET') {
    // Only cache static assets, never API or dev server modules
    if (
      url.pathname.includes('/assets/') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.webmanifest')
    ) {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response && response.status === 200 && url.origin === location.origin) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          });
        })
      );
    }
  }
});
