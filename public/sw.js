/* Bogey Club service worker — serves the cached shell instantly on launch
   (stale-while-revalidate) and refreshes it in the background, so a new
   deploy lands on the next launch. __BUILD_ID__ is replaced at build time
   (sw-build-id plugin in vite.config.ts) with a digest of the app shell,
   so each deploy invalidates the cache without manual bumps. */
const CACHE = 'bogey-club-__BUILD_ID__'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon-180x180.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.flatMap(k => (k !== CACHE ? [caches.delete(k)] : []))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Only handle same-origin requests; let Convex (other origins) pass through.
  if (url.origin !== self.location.origin) return

  // SPA navigations: stale-while-revalidate. Serve the cached shell at once
  // (instant first paint when launching the PWA) and refresh it from the
  // network in the background — a new deploy shows up on the next launch.
  if (request.mode === 'navigate') {
    const refresh = fetch(request).then(response => {
      const copy = response.clone()
      return caches
        .open(CACHE)
        .then(cache => cache.put('/index.html', copy))
        .then(() => response)
    })
    event.respondWith(
      caches.match('/index.html').then(cached => {
        if (cached) {
          // Keep the SW alive until the background refresh settles.
          event.waitUntil(refresh.catch(() => {}))
          return cached
        }
        return refresh.catch(() => caches.match('/'))
      }),
    )
    return
  }

  // Hashed static assets are immutable: cache-first, then network (and cache it).
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
