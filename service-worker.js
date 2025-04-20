const CACHE_NAME = 'wafu-clock-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/wakelock.js',
  '/manifest.json',
  '/icon-192.png',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP&display=swap',
  'https://fonts.gstatic.com/s/rajdhani/v17/LDI1apCSOBg7S-QT7pasEcOs.woff2',
  'https://fonts.gstatic.com/s/notosansjp/v52/-F61fjptAgt5VM-kVkqdyU8n1Q.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
