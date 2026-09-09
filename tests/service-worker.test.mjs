import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const workerSource = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");

function createWorker({ cached = [], fetchImpl } = {}) {
  const listeners = {};
  const entries = new Map(cached.map(([url, response]) => [url, response]));
  const deletedCaches = [];
  const cache = {
    match(request) {
      return Promise.resolve(entries.get(request.url));
    },
    put(request, response) {
      entries.set(request.url, response);
      return Promise.resolve();
    },
    addAll() {
      return Promise.resolve();
    },
  };
  const caches = {
    match(request) {
      return cache.match(request);
    },
    open() {
      return Promise.resolve(cache);
    },
    keys() {
      return Promise.resolve(["wafu-clock-compat-v1", "wafu-clock-compat-v2"]);
    },
    delete(cacheName) {
      deletedCaches.push(cacheName);
      return Promise.resolve(true);
    },
  };
  const self = {
    location: { origin: "https://example.test" },
    clients: { claim() { return Promise.resolve(); } },
    skipWaiting() { return Promise.resolve(); },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
  };
  vm.runInNewContext(workerSource, {
    self,
    caches,
    fetch: fetchImpl,
    URL,
    Request,
    Promise,
  });
  let lastWaitPromise = null;
  return {
    entries,
    deletedCaches,
    waitForBackground() {
      return lastWaitPromise || Promise.resolve();
    },
    hasBackgroundWork() {
      return lastWaitPromise !== null;
    },
    dispatch(type, request) {
      let responsePromise;
      lastWaitPromise = null;
      listeners[type]({
        request,
        respondWith(value) { responsePromise = Promise.resolve(value); },
        waitUntil(value) { lastWaitPromise = Promise.resolve(value); },
      });
      return responsePromise;
    },
  };
}

function request(path, mode = "no-cors") {
  return new Request(`https://example.test${path}`, { method: "GET", mode });
}

test("network-first refreshes a cached JavaScript response and falls back offline", async () => {
  const oldResponse = new Response("old-js", { status: 200 });
  const newResponse = new Response("new-js", { status: 200 });
  let calls = 0;
  const worker = createWorker({
    cached: [["https://example.test/app.mjs", oldResponse]],
    fetchImpl: async () => {
      calls += 1;
      return newResponse;
    },
  });

  const online = await worker.dispatch("fetch", request("/app.mjs"));
  assert.equal(await online.text(), "new-js");
  assert.equal(calls, 1);

  const offlineWorker = createWorker({
    cached: [["https://example.test/app.mjs", oldResponse]],
    fetchImpl: async () => { throw new Error("offline"); },
  });
  const offline = await offlineWorker.dispatch("fetch", request("/app.mjs"));
  assert.equal(await offline.text(), "old-js");
});

test("network-first waits for refreshed cache writes before the worker can be terminated", async () => {
  let online = true;
  const worker = createWorker({
    cached: [["https://example.test/app.mjs", new Response("old-js", { status: 200 })]],
    fetchImpl: async () => {
      if (!online) throw new Error("offline");
      return new Response("new-js", { status: 200 });
    },
  });

  assert.equal(await (await worker.dispatch("fetch", request("/app.mjs"))).text(), "new-js");
  assert.equal(worker.hasBackgroundWork(), true);
  await worker.waitForBackground();
  online = false;
  assert.equal(await (await worker.dispatch("fetch", request("/app.mjs"))).text(), "new-js");
});

test("same-origin images remain cache-first", async () => {
  const cachedImage = new Response("cached-image", { status: 200 });
  const worker = createWorker({
    cached: [["https://example.test/icon-192.png", cachedImage]],
    fetchImpl: async () => new Response("network-image", { status: 200 }),
  });

  const response = await worker.dispatch("fetch", request("/icon-192.png"));
  assert.equal(await response.text(), "cached-image");
});

test("HTML and CSS refresh cached responses from the network", async () => {
  const requests = [];
  const worker = createWorker({
    cached: [
      ["https://example.test/index.html", new Response("old-html", { status: 200 })],
      ["https://example.test/style.css", new Response("old-css", { status: 200 })],
    ],
    fetchImpl: async (request) => {
      requests.push(request.url);
      return new Response(request.url.endsWith(".html") ? "new-html" : "new-css", { status: 200 });
    },
  });

  assert.equal(await (await worker.dispatch("fetch", request("/index.html"))).text(), "new-html");
  assert.equal(await (await worker.dispatch("fetch", request("/style.css"))).text(), "new-css");
  assert.deepEqual(requests, ["https://example.test/index.html", "https://example.test/style.css"]);
  assert.match(workerSource, /wafu-clock-compat-v2/);
});

test("network-first falls back to a cached asset on HTTP server errors", async () => {
  const worker = createWorker({
    cached: [["https://example.test/app.mjs", new Response("cached-js", { status: 200 })]],
    fetchImpl: async () => new Response("temporary failure", { status: 503 }),
  });

  const response = await worker.dispatch("fetch", request("/app.mjs"));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "cached-js");
});

test("activation removes the previous versioned cache", async () => {
  const worker = createWorker({ fetchImpl: async () => new Response("ok") });

  await worker.dispatch("activate");
  await worker.waitForBackground();

  assert.deepEqual(worker.deletedCaches, ["wafu-clock-compat-v1"]);
});
