// Service Worker — SW_VERSION js/version.js SAHSI_ASSET_VERSION ile aynı olmalı
const DEBUG = false; // Set to true for development
const SW_VERSION = '79.08';
const CACHE_PREFIX = 'sahsi-hesap-v';
const CACHE_NAME = `${CACHE_PREFIX}${SW_VERSION}`;
const APP_SCOPE_URL = self.registration.scope;
const scopedUrl = (relativePath) => new URL(relativePath, APP_SCOPE_URL).toString();
const APP_SHELL_URL = scopedUrl('index.html');
const OFFLINE_URL = scopedUrl('offline.html');
const API_BYPASS_FILES = new Set(['load.php', 'get_data.php', 'save.php', 'write_data.php', 'kd_load.php', 'kd_save.php']);
const urlsToCache = [
    'index.html',
    'kasa.html',
    'offline.html',
    'js/version.js?v=79.08',
    'storage.js?v=1.0',
    'js/utils.js?v=79.08',
    'js/report-exports.js?v=79.08',
    'js/FileSaver.min.js',
    'js/xlsx.bundle.min.js',
    'style.css?v=79.08',
    'app.js?v=79.08',
    'kasa.css?v=79.08',
    'kasa.js?v=79.08',
    'manifest.json?v=20260719e',
    'manifest.json',
    'favicon.ico?v=20260719e',
    'apple-touch-icon.png?v=20260719e',
    'og-image.png?v=20260719e',
    // PWA Icons (referenced in manifest.json)
    'icons/android-chrome-192x192.png?v=20260719e',
    'icons/android-chrome-512x512.png?v=20260719e',
    'icons/maskable-512x512.png?v=20260719e',
    'icons/favicon-32x32.png?v=20260719e',
    'icons/favicon-16x16.png?v=20260719e'
].map(scopedUrl);

function isVersionedUrl(url) {
    return url.search.includes('v=');
}

function isVersionedStyleOrScript(url) {
    return isVersionedUrl(url) && /\.(css|js)$/i.test(url.pathname);
}

async function networkFirstVersioned(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request);
        if (response && response.ok) {
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
    }
}

// Install Event: çekirdek dosyalar eksikse yeni worker aktive edilmez; sağlam eski cache korunur.
self.addEventListener('install', (event) => {
    DEBUG && console.log('[SW] Installing... v' + SW_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                DEBUG && console.log('[SW] Pre-caching scoped app assets');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    DEBUG && console.log('[SW] Activating... v' + SW_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
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
    const requestedFile = url.pathname.split('/').pop() || '';

    // Skip external CDN requests (always fetch fresh)
    if (url.origin !== location.origin) {
        event.respondWith(fetch(request));
        return;
    }

    // Never cache write requests or backend API endpoints
    if (request.method !== 'GET' || API_BYPASS_FILES.has(requestedFile) || url.pathname.endsWith('.php')) {
        event.respondWith(fetch(request));
        return;
    }

    // HTML files: Network-first (updates visible faster)
    if (request.headers.get('Accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.open(CACHE_NAME).then(async (cache) => {
                        const cachedResponse = await cache.match(request, { ignoreSearch: true });
                        if (cachedResponse) return cachedResponse;

                        const appShell = await cache.match(APP_SHELL_URL);
                        if (appShell) return appShell;

                        return cache.match(OFFLINE_URL);
                    });
                })
        );
        return;
    }

    // Versioned CSS/JS: network-first so ?v= bumps always reach clients
    if (isVersionedStyleOrScript(url)) {
        event.respondWith(networkFirstVersioned(request, CACHE_NAME));
        return;
    }

    // Other static assets (images, fonts): cache-first
    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const exactMatch = await cache.match(request);
            const versionedAsset = isVersionedUrl(url);
            const cachedResponse = exactMatch || (
                !versionedAsset ? await cache.match(request, { ignoreSearch: true }) : null
            );

            if (cachedResponse) {
                fetch(request).then((response) => {
                    if (!response || response.status !== 200) return;
                    cache.put(request, response.clone());
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(request).then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    cache.put(request, responseClone);
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
            caches.keys().then((cacheNames) => Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX))
                    .map((cacheName) => caches.delete(cacheName))
            ))
        );
    }
});

// Background Sync: Sync data when connection is restored
self.addEventListener('sync', (event) => {
    DEBUG && console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'kasa-sync') {
        event.waitUntil(syncPendingKasaData());
    }
});

async function syncPendingKasaData() {
    const db = await openDatabase();
    const syncQueue = await getFromObjectStore(db, 'syncQueue');
    const itemsToSync = syncQueue.filter(item => item.tag === 'kasa-sync');

    // To prevent multiple syncs for the same data, we only sync the latest item
    const latestItem = itemsToSync.sort((a, b) => b.timestamp - a.timestamp)[0];
    
    if (!latestItem) return;

    try {
        const response = await fetch(latestItem.url, {
            method: latestItem.method,
            headers: latestItem.headers,
            body: latestItem.body
        });

        if (response.ok) {
            // Clear all kasa-sync items from the queue after successful sync
            const idsToDelete = itemsToSync.map(item => item.id);
            const tx = db.transaction('syncQueue', 'readwrite');
            const store = tx.objectStore('syncQueue');
            for (const id of idsToDelete) {
                store.delete(id);
            }
            await new Promise(r => tx.oncomplete = r);
            console.log('Kasa sync successful, cleared queue.');
        } else {
            console.error('Kasa sync failed with status:', response.status);
        }
    } catch (error) {
        console.error('Kasa sync fetch failed:', error);
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
