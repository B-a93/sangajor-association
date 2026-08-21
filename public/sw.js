// Bump this when replacing assets at an existing public URL so active clients
// discard stale responses (including executive portraits) during activation.
const CACHE = 'mysangajor-v6';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/mysangajor-icon.svg',
  '/sangajorr-association-logo.png.jpeg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(async (response) => {
      // Clone synchronously, before either branch can consume the response body.
      const copy = response.clone();
      await caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
      return response;
    }).catch(async () => (await caches.match('/index.html')) || caches.match('/offline.html')));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then(async (response) => {
    // Never hand the original response to a body consumer before making the cache copy.
    const copy = response.ok ? response.clone() : null;
    if (copy) await caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  })));
});
