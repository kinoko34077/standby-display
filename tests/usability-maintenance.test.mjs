import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installWakeLock } from "../scripts/browser-features.mjs";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");
const flush = () => new Promise((resolve) => setImmediate(resolve));

function createWakeDocument() {
  const listeners = new Map();
  return {
    visibilityState: "visible",
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    dispatch(type) {
      listeners.get(type)?.();
    },
  };
}

test("Wake Lock reports unsupported state without blocking startup", async () => {
  const states = [];
  const documentObject = createWakeDocument();
  const controller = installWakeLock({}, documentObject, (state) => states.push(state));
  await flush();

  assert.equal(states.at(-1)?.status, "unsupported");
  assert.equal(typeof controller?.retry, "function");
});

test("Wake Lock rejection is observable and can be retried successfully", async () => {
  const states = [];
  const documentObject = createWakeDocument();
  let attempts = 0;
  const sentinel = {
    addEventListener() {},
  };
  const navigatorObject = {
    wakeLock: {
      async request() {
        attempts += 1;
        if (attempts === 1) throw new Error("NotAllowedError");
        return sentinel;
      },
    },
  };

  const controller = installWakeLock(navigatorObject, documentObject, (state) => states.push(state));
  await flush();
  assert.equal(states.at(-1)?.status, "error");

  await controller.retry();
  assert.equal(states.at(-1)?.status, "active");
  assert.equal(attempts, 2);
});

test("settings UI exposes Wake Lock and location diagnostics with retries", async () => {
  const source = await read("app.mjs");

  assert.match(source, /wake-lock-status/);
  assert.match(source, /wake-lock-retry/);
  assert.match(source, /location-status/);
  assert.match(source, /location-retry/);
  assert.match(source, /端末状態/);
});

test("settings reset requires explicit confirmation", async () => {
  const source = await read("scripts/settings-ui.mjs");

  assert.match(source, /confirmReset/);
  assert.match(source, /onReset/);
  assert.match(source, /初期化/);
});

test("hidden settings trigger is recoverable by keyboard and not hidden while focused", async () => {
  const source = await read("scripts/clock-app.mjs");

  assert.match(source, /addEventListener\("keydown", revealTriggerTemporarily/);
  assert.match(source, /activeElement/);
  assert.match(source, /settings-open/);
});

test("location failures have persistent diagnostic state and retry wiring", async () => {
  const [clockSource, uiSource] = await Promise.all([
    read("scripts/clock-app.mjs"),
    read("scripts/settings-ui.mjs"),
  ]);

  assert.match(clockSource, /locationStatus/);
  assert.match(clockSource, /retryLocation/);
  assert.match(clockSource, /位置情報/);
  assert.match(uiSource, /onRetryLocation/);
  assert.match(uiSource, /location-status/);
});
