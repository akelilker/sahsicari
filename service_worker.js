// Service Worker devre dışı - v78.34
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil( 
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Cache kullanma, her şeyi network'ten al
    event.respondWith(fetch(event.request));
});