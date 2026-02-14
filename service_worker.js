// Service Worker with Smart Caching - v78.34
const CACHE_NAME = 'sahsi-hesap-v78.34';
const urlsToCache = [
    '/',
    '/index.html',
    '/kasa.html',
    '/style.css?v=79.19',
    '/app.js?v=79.19',
    '/kasa.css?v=1.11',
    '/kasa.js?v=1.11',
    '/manifest.json',
    '/favicon.ico',
    '/apple-touch-icon.png'
];

// Install Event: Pre-cache critical assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing... v78.34');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pre-caching assets');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating... v78.34');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Smart caching strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip external CDN requests (always fetch fresh)
    if (url.origin !== location.origin) {
        event.respondWith(fetch(request));
        return;
    }

    // HTML files: Network-first (updates visible faster)
    if (request.headers.get('Accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Update cache with fresh HTML
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Offline: serve from cache
                    return caches.match(request);
                })
        );
        return;
    }

    // Static assets (CSS, JS, images): Cache-first
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Serve from cache, update in background
                    fetch(request).then((response) => {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, response);
                        });
                    }).catch(() => {}); // Ignore fetch errors in background
                    return cachedResponse;
                }

                // Not in cache: fetch and cache
                return fetch(request).then((response) => {
                    // Only cache successful responses
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
    );
});

// Message handler for manual cache refresh
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    if (event.data === 'clearCache') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});
