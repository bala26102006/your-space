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

  // 1. Intercept Web Share Target POST request
  if (
    event.request.method === 'POST' &&
    url.pathname === '/' &&
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
      return Response.redirect('/?shared-sketch=true', 303);
    })());
    return;
  }

  // 2. Standard caching for offline support
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (
            response &&
            response.status === 200 &&
            url.origin === location.origin &&
            (url.pathname.startsWith('/assets/') ||
              url.pathname.endsWith('.svg') ||
              url.pathname.endsWith('.webmanifest'))
          ) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
    );
  }
});
