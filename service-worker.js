const CACHE_NAME = "wafu-clock-compat-v1";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.mjs",
  "./bootstrap.js",
  "./modern-entry.mjs",
  "./shared/config.js",
  "./legacy/",
  "./legacy/index.html",
  "./legacy/style.css",
  "./legacy/clock.js",
  "./manifest.json",
  "./icon-192.png",
  "./scripts/browser-features.mjs",
  "./scripts/clock-app.mjs",
  "./scripts/constants.mjs",
  "./scripts/formatters.mjs",
  "./scripts/kanji-conversion.mjs",
  "./scripts/text-transform-client.mjs",
  "./scripts/render.mjs",
  "./scripts/random-colors.mjs",
  "./scripts/services.mjs",
  "./scripts/settings.mjs",
  "./scripts/settings-ui.mjs",
  "./scripts/color-controls.mjs",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" })),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("wafu-clock-") && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: event.request.mode === "navigate" }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    }),
  );
});
