/* SafetyTopic offline service worker. Cache-first for precached assets
   (revalidate in background so updates land on the next online visit);
   navigation requests fall back to the cached index.
   PWA_CACHE_VERSION lives HERE on purpose: the browser reinstalls only
   when sw.js's own bytes change, so bumping this constant (whenever any
   precached file changes) always propagates; the activation step below
   then deletes the previous cache. Registration uses updateViaCache:
   'none' so this file's importScripts() is never served from the HTTP
   cache when an update is checked. */
importScripts('./pwa-assets.js');
const PWA_CACHE_VERSION = 1;
const CACHE_NAME = 'safetytopic-v' + PWA_CACHE_VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PWA_PRECACHE_ASSETS); // a 404 here fails install: old SW stays; never silent
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = (await cache.match(req)) || (await cache.match('./index.html'));
        if (cached) { // stale-while-revalidate for navigations
          event.waitUntil(cache.add(req).catch(() => {}));
          return cached;
        }
        return fetch(req);
      })(),
    );
    return;
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) {
        event.waitUntil(cache.add(req).catch(() => {}));
        return cached;
      }
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    })(),
  );
});
