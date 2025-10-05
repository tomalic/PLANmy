// Simple service worker for offline support
const CACHE = 'planmy-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k!==CACHE ? caches.delete(k) : null))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(resp => resp || fetch(request).then(r => {
      // Cache same-origin GET requests
      try {
        const url = new URL(request.url);
        if (url.origin === location.origin) {
          const copy = r.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
      } catch {}
      return r;
    }).catch(() => caches.match('./index.html')))
  );
});
