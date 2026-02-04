const CACHE_NAME = 'satfinder-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/satellites.js',
    '/js/calculator.js',
    '/js/location.js',
    '/js/compass.js',
    '/js/ar.js',
    '/js/sound.js',
    '/js/app.js',
    '/manifest.json'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate and clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
