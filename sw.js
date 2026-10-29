const CACHE_NAME = 'otro-pwa-v11';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css?v=2.6',
  './js/firebase-config.js',
  './js/geo.js',
  './js/data.js',
  './js/storage.js',
  './js/auth.js',
  './js/notifications.js',
  './js/chat.js',
  './js/pwa.js',
  './js/app.js',
  './manifest.json',
  './assets/logo.svg',
  './assets/logo.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network first, falling back to cache
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

/* -------------------------------------------------------------
   WEB PUSH & NOTIFICATION CLICKS (Service Worker)
   ------------------------------------------------------------- */
self.addEventListener('push', (event) => {
  let data = { title: 'OTRO', body: 'Tenés una nueva novedad en tu zona.' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'OTRO', {
      body: data.body || '',
      icon: './assets/logo.svg',
      badge: './assets/logo.svg',
      vibrate: [200, 100, 200],
      data: data
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});
