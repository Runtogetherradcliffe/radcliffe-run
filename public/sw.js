// radcliffe.run service worker
// Vanilla JS — no build tools required, Turbopack compatible

const CACHE_VERSION = 'rtr-v1';
const OFFLINE_URL = '/offline';

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  OFFLINE_URL,
];

// ── Install: pre-cache the offline page ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategies ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser-extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Supabase API — network only (always fresh data)
  if (url.hostname.includes('supabase.co')) {
    return; // let it fall through to the browser
  }

  // Navigation requests — network first, offline page fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Fonts — cache first (permanent)
  if (url.pathname.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(request, 'rtr-fonts'));
    return;
  }

  // Icons & manifest — cache first
  if (url.pathname.match(/\.(png|svg|ico|json)$/) && url.hostname === location.hostname) {
    event.respondWith(cacheFirst(request, 'rtr-static'));
    return;
  }

  // Route map images — cache first, 30 days
  if (url.pathname.startsWith('/route-maps/')) {
    event.respondWith(cacheFirst(request, 'rtr-route-maps'));
    return;
  }

  // GPX files — stale while revalidate
  if (url.pathname.startsWith('/gpx/')) {
    event.respondWith(staleWhileRevalidate(request, 'rtr-gpx'));
    return;
  }

  // Map tiles (CartoDB) — stale while revalidate
  if (url.hostname.includes('cartocdn.com')) {
    event.respondWith(staleWhileRevalidate(request, 'rtr-tiles'));
    return;
  }

  // Everything else — network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || fetchPromise;
}
