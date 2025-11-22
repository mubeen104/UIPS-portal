/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const CACHE_NAME = 'hr-system-v1';
const OFFLINE_PAGE = '/offline.html';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Failed to cache some assets:', err);
        // Continue even if some assets fail
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement offline-first strategy
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // For API requests, try network first with cache fallback
  if (request.url.includes('/api/') || request.url.includes('/functions/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request).then((cached) => {
            return (
              cached ||
              new Response(
                JSON.stringify({
                  error: 'Network unavailable',
                  cached: true,
                  message: 'You are offline. Cached data is being shown.',
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({
                    'Content-Type': 'application/json',
                  }),
                }
              )
            );
          });
        })
    );
    return;
  }

  // For static assets (CSS, JS, images), use cache-first strategy
  if (
    request.url.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/i)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response.ok) {
                const cache = caches.open(CACHE_NAME);
                cache.then((c) => c.put(request, response.clone()));
              }
              return response;
            })
            .catch(() => {
              // Return 404 for missing assets
              return new Response('Asset not found', { status: 404 });
            })
        );
      })
    );
    return;
  }

  // For HTML pages, use network-first with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return cached or offline page
          return (
            caches.match(request).then((cached) => cached) ||
            caches.match(OFFLINE_PAGE)
          );
        })
    );
    return;
  }

  // Default: network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request) || new Response('Offline', { status: 503 });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

export {};
