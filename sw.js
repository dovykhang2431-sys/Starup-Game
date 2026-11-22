const CACHE_NAME = 'starup-pwa-v9.8';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/starup.css',
  './js/config.js',
  './js/audio.js',
  './js/avatars.js',
  './js/finance.js',
  './js/marketing.js',
  './js/empire.js',
  './js/quests.js',
  './js/pwa.js',
  './js/engine.js',
  './assets/office_day.jpg',
  './assets/office_night.jpg',
  './assets/office_tokyo.jpg',
  './assets/office_ny.jpg',
  './assets/tokens/ceo.png',
  './assets/tokens/tech.png',
  './assets/tokens/marketing.png',
  './assets/tokens/support.png',
  './assets/tokens/client.png',
  './assets/tokens/vip.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
