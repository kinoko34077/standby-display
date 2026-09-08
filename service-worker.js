const CACHE_NAME = "wafu-clock-compat-v2";
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
  "./vendor/text-transform.mjs",
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

  const isNetworkFirst = event.request.mode === "navigate" ||
    ["document", "script", "style"].includes(event.request.destination) ||
    /\.(?:html?|css|m?js)$/i.test(requestUrl.pathname);
  const matchOptions = { ignoreSearch: event.request.mode === "navigate" };
  const cacheNetworkResponse = (networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      const cacheUpdate = caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
      if (typeof event.waitUntil === "function") {
        event.waitUntil(cacheUpdate);
      }
    }
    return networkResponse;
  };

  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then(cacheNetworkResponse)
        .catch(() => caches.match(event.request, matchOptions).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          throw new Error("Network unavailable and no cached response");
        })),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, matchOptions).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(cacheNetworkResponse);
    }),
  );
});
