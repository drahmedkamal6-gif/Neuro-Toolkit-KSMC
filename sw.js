// KSMC Neurology Clinical Tools — Service Worker
// Bump CACHE_VERSION whenever index.html (or any precached file) changes,
// so returning users get the update instead of a stale cached copy.
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'ksmc-neuro-tools-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('ksmc-neuro-tools-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests; let everything else (if any) pass through untouched.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // App shell (the toolkit itself, manifest, icons): cache-first, since
    // these only change when a new version is deployed and the cache is
    // versioned above.
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        });
      }).catch(() => caches.match('./index.html'))
    );
  } else {
    // Cross-origin (Google Fonts, etc.): network-first so styling stays
    // current, falling back to a cached copy if offline and previously seen.
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      }).catch(() => caches.match(req))
    );
  }
});
