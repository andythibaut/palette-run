const CACHE_NAME = 'palette-run-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', (e) => {
  // Pass through — pas de cache agressif pour une app dynamique
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)))
})
