import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const workerSource = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const styleCss = await readFile(new URL("../style.css", import.meta.url), "utf8");
const REMOTE_DSEG_MODERN =
  "https://unpkg.com/dseg@0.46.0/fonts/DSEG7-Modern/DSEG7Modern-Regular.woff2";

function createWorker({ cached = [], fetchImpl } = {}) {
  const listeners = {};
  const entries = new Map(cached.map(([url, response]) => [url, response]));
  const deletedCaches = [];
  const addedLocal = [];
  let installed = false;
  const cache = {
    match(request) {
      return Promise.resolve(entries.get(request.url));
    },
    put(request, response) {
      entries.set(request.url, response);
      return Promise.resolve();
    },
    addAll(requests) {
      addedLocal.push(...requests.map((request) => request.url));
      return Promise.resolve();
    },
    async add(request) {
      if (!fetchImpl) throw new Error("Optional font unavailable");
      const response = await fetchImpl(request);
      if (!response?.ok) throw new Error("Optional font fetch failed");
      entries.set(request.url, response.clone());
    },
    keys() {
      return Promise.resolve([...entries.keys()].map((url) => new Request(url)));
    },
    delete(request) {
      return Promise.resolve(entries.delete(request.url));
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
    location: { origin: "https://example.test", href: "https://example.test/service-worker.js" },
    clients: { claim() { return Promise.resolve(); } },
    skipWaiting() { installed = true; return Promise.resolve(); },
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
    addedLocal,
    wasInstalled() { return installed; },
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

test("activation evicts removed same-generation assets before network fallback can resurrect them", async () => {
  const removedUrl = "https://example.test/removed-script.js";
  const currentUrl = "https://example.test/app.mjs";
  const worker = createWorker({
    cached: [
      [removedUrl, new Response("obsolete", { status: 200 })],
      [currentUrl, new Response("current", { status: 200 })],
    ],
    fetchImpl: async (request) => {
      if (request.url === removedUrl) return new Response("not found", { status: 404 });
      throw new Error("offline");
    },
  });

  await worker.dispatch("activate");
  await worker.waitForBackground();

  assert.equal(worker.entries.has(removedUrl), false);
  assert.equal(worker.entries.has(currentUrl), true);
  const current = await worker.dispatch("fetch", request("/app.mjs"));
  assert.equal(await current.text(), "current");
  const response = await worker.dispatch("fetch", request("/removed-script.js"));
  assert.equal(response.status, 404);
  assert.equal(await response.text(), "not found");
});


test("runtime-critical same-origin shell assets are represented in the precache", () => {
  const htmlRefs = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => !/^(?:https?:|#|\?)/.test(value))
    .map((value) => value.replace(/^\.\//, ""));
  const cssRefs = [...styleCss.matchAll(/url\(["']?([^"')]+)["']?\)/g)]
    .map((match) => match[1])
    .filter((value) => !/^https?:/.test(value))
    .map((value) => value.replace(/^\.\//, ""));
  const runtimeRefs = [...new Set([...htmlRefs, ...cssRefs])];

  for (const asset of runtimeRefs) {
    assert.equal(
      workerSource.includes(`"./${asset}"`),
      true,
      `missing runtime asset from precache: ${asset}`,
    );
  }

  assert.equal(runtimeRefs.includes("assets/settings-trigger.png"), true);
});

test("external font CDN outage does not block the local PWA install", async () => {
  const worker = createWorker({
    fetchImpl: async () => {
      throw new Error("CDN offline");
    },
  });

  await worker.dispatch("install");
  await worker.waitForBackground();

  assert.equal(worker.wasInstalled(), true);
  assert.equal(worker.addedLocal.includes("https://example.test/index.html"), true);
  assert.equal(worker.addedLocal.includes("https://example.test/assets/settings-trigger.png"), true);
  assert.equal(worker.addedLocal.includes(REMOTE_DSEG_MODERN), false);
});

test("pinned external DSEG Modern font is allowlisted and cache-first", async () => {
  let networkCalls = 0;
  const worker = createWorker({
    fetchImpl: async () => {
      networkCalls += 1;
      return new Response("remote-font", { status: 200 });
    },
  });

  const onlineRequest = new Request(REMOTE_DSEG_MODERN);
  const online = await worker.dispatch("fetch", onlineRequest);
  assert.equal(await online.text(), "remote-font");
  assert.equal(networkCalls, 1);
  await worker.waitForBackground();

  const offlineWorker = createWorker({
    cached: [[REMOTE_DSEG_MODERN, new Response("cached-font", { status: 200 })]],
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });
  const offline = await offlineWorker.dispatch(
    "fetch",
    new Request(REMOTE_DSEG_MODERN),
  );
  assert.equal(await offline.text(), "cached-font");
  assert.match(workerSource, /REMOTE_FONT_URLS/);
  assert.match(workerSource, /DSEG7Modern-Regular\.woff2/);
  assert.doesNotMatch(workerSource, /digital-7\.ttf/);
});
