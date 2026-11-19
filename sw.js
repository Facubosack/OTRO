const CACHE_NAME = 'otro-pwa-v21';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css?v=3.4',
  './js/firebase-config.js',
  './js/geo.js?v=3.4',
  './js/data.js?v=3.4',
  './js/storage.js?v=3.4',
  './js/auth.js?v=3.4',
  './js/notifications.js?v=3.4',
  './js/chat.js?v=3.4',
  './js/pwa.js?v=3.4',
  './js/app.js?v=3.4',
  './manifest.json',
  './assets/logo.svg',
  './assets/logo.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS_TO_CACHE.map((url) =>
          fetch(url, { cache: 'no-cache' }).then((res) => {
            if (res.ok) return cache.put(url, res);
          }).catch(() => {})
        )
      );
    })
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
  // Network first (bypassing stale HTTP disk cache), falling back to SW cache offline
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
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
