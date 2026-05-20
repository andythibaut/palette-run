const CACHE_NAME = 'palette-run-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)))
})

// ─── Push notifications ────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-72.png',
      data:    data.data || {},
      vibrate: [200, 100, 200],
    })
  )
})

// ─── Clic sur notification → ouvre la bonne page ──────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close()

  const notifData = e.notification.data || {}
  const type      = notifData.type || ''

  // Types destinés au chauffeur → onglet Achats (/app?tab=pickups)
  const driverTypes = [
    'transaction_authorized',
    'transaction_confirmed',
    'auction_won',
    'auction_outbid',
    'auction_leader',
    'listing_cancelled',
  ]

  // Types destinés au commerçant → onglet Acheteurs (/company?tab=acheteurs)
  const companyTypes = [
    'auction_new_bid',
    'auction_closed',
    'auction_no_winner',
  ]

  let targetUrl = '/'
  if (driverTypes.includes(type)) {
    targetUrl = '/app?tab=pickups'
  } else if (companyTypes.includes(type)) {
    targetUrl = '/company?tab=acheteurs'
  }

  const fullUrl = self.location.origin + targetUrl

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Si l'app est déjà ouverte, on la focus et on navigue
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url: targetUrl })
          return client.focus()
        }
      }
      // Sinon on ouvre la bonne URL
      return clients.openWindow(fullUrl)
    })
  )
})
