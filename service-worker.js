const CACHE_NAME = 'pvi-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/tasks.html',
    '/styles/header.css',
    '/styles/navigation.css',
    '/styles/table.css',
    '/styles/studentsMain.css',
    '/styles/modal.css',
    '/scripts/header.js',
    '/scripts/navigation.js',
    '/scripts/validation.js',
    '/scripts/studentsMain.js',
    '/source/icon-man144.png',
    '/source/icon-man192.png',
    '/source/icon-man512.png',
    '/source/screenshot1.jpg',
    '/source/screenshot2.jpg',
    '/source/bell.png',
    '/source/user.png',
    '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// Install event - caches assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});