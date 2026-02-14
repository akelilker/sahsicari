// Service Worker with Smart Caching - v78.34
const DEBUG = false; // Set to true for development
const CACHE_NAME = 'sahsi-hesap-v78.34';
const urlsToCache = [
    '/',
    '/index.html',
    '/kasa.html',
    '/offline.html',
    '/storage.js?v=1.0',
    '/style.css?v=79.19',
    '/app.js?v=79.19',
    '/kasa.css?v=1.11',
    '/kasa.js?v=1.11',
    '/manifest.json',
    '/favicon.ico',
    '/apple-touch-icon.png'
];

// Install Event: Pre-cache critical assets (tek bir URL hatası tüm install'ı bozmasın)
self.addEventListener('install', (event) => {
    DEBUG && console.log('[SW] Installing... v78.34');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                DEBUG && console.log('[SW] Pre-caching assets');
                return Promise.allSettled(
                    urlsToCache.map((url) =>
                        cache.add(url).catch((err) => {
                            if (DEBUG) console.warn('[SW] Cache skip:', url, err);
                            return null;
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    DEBUG && console.log('[SW] Activating... v78.34');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        DEBUG && console.log('[SW] Deleting old cache:', cacheName);
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
                    return caches.match(request)
                        .then((cachedResponse) => {
                            // If page is cached, serve it
                            if (cachedResponse) return cachedResponse;
                            // Otherwise, serve offline fallback page
                            return caches.match('/offline.html');
                        });
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

// Background Sync: Sync data when connection is restored
self.addEventListener('sync', (event) => {
    DEBUG && console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'sync-data') {
        event.waitUntil(syncPendingData());
    }
});

async function syncPendingData() {
    try {
        // Get pending sync queue from IndexedDB
        const db = await openDatabase();
        const syncQueue = await getFromObjectStore(db, 'syncQueue');

        if (!syncQueue || syncQueue.length === 0) {
            DEBUG && console.log('[SW] No pending sync data');
            return;
        }

        DEBUG && console.log('[SW] Syncing', syncQueue.length, 'pending items');

        // Process each pending item
        for (const item of syncQueue) {
            try {
                const response = await fetch(item.url, {
                    method: item.method,
                    headers: item.headers,
                    body: item.body
                });

                if (response.ok) {
                    // Remove from queue after successful sync
                    await removeFromSyncQueue(db, item.id);
                    DEBUG && console.log('[SW] Synced item:', item.id);
                } else {
                    console.error('[SW] Sync failed for item:', item.id, response.status);
                }
            } catch (error) {
                console.error('[SW] Sync error for item:', item.id, error);
            }
        }

        // Notify app that sync is complete
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                syncedCount: syncQueue.length
            });
        });

    } catch (error) {
        console.error('[SW] Background sync error:', error);
    }
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SahsiHesapDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getFromObjectStore(db, storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function removeFromSyncQueue(db, itemId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('syncQueue', 'readwrite');
        const store = transaction.objectStore('syncQueue');
        const request = store.delete(itemId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
