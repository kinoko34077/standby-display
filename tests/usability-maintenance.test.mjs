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

test("runtime settings UI exposes Wake Lock and location diagnostics with retries", async () => {
  const [appSource, uiSource] = await Promise.all([
    read("app.mjs"),
    read("scripts/settings-ui.mjs"),
  ]);

  assert.match(appSource, /wake-lock-status/);
  assert.match(appSource, /wake-lock-retry/);
  assert.match(appSource, /wakeLockController\.retry/);
  assert.match(appSource, /location-status/);
  assert.match(appSource, /location-retry/);
  assert.match(uiSource, /location-status/);
  assert.match(uiSource, /location-retry/);
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


test("settings redesign uses five user-oriented categories without manual layout mode", async () => {
  const [html, uiSource, settingsSource, clockSource] = await Promise.all([
    read("index.html"),
    read("scripts/settings-ui.mjs"),
    read("scripts/settings.mjs"),
    read("scripts/clock-app.mjs"),
  ]);

  assert.match(html, /aria-label="設定カテゴリ"/);
  assert.equal((html.match(/data-settings-category=/g) ?? []).length, 5);
  assert.equal((html.match(/data-settings-pane=/g) ?? []).length, 5);
  assert.doesNotMatch(html, /settings-view-toggle/);
  assert.doesNotMatch(uiSource, /settings-view-toggle|onToggleView|trapFocus/);
  assert.doesNotMatch(settingsSource, /settingsView/);
  assert.doesNotMatch(clockSource, /toggleSettingsView|settingsView/);
});

test("settings shell adapts from a wide inspector to a narrow fullscreen surface", async () => {
  const css = await read("style.css");

  assert.match(css, /\.settings-overlay\s*\{[\s\S]*?pointer-events:\s*none/);
  assert.match(
    css,
    /\.settings-shell\s*\{[\s\S]*?width:\s*clamp\(420px,\s*34vw,\s*520px\)/,
  );
  assert.match(css, /\.settings-body\s*\{[\s\S]*?grid-template-columns:\s*116px/);
  assert.match(css, /@media \(max-width:\s*800px\)/);
  assert.match(
    css,
    /@media \(max-width:\s*800px\)[\s\S]*?\.settings-overlay\s*\{[\s\S]*?pointer-events:\s*auto/,
  );
  assert.match(
    css,
    /@media \(max-width:\s*800px\)[\s\S]*?\.settings-category-nav\s*\{[\s\S]*?flex-direction:\s*row/,
  );
  assert.doesNotMatch(css, /settings-grid|data-view="compact"/);
});

test("settings navigation preserves session context and narrows background interactivity", async () => {
  const source = await read("scripts/settings-ui.mjs");

  assert.match(source, /SETTINGS_CATEGORIES = \["clock", "notation", "display", "color", "system"\]/);
  assert.match(source, /categoryScrollPositions/);
  assert.match(source, /aria-current/);
  assert.match(source, /mainLayout\.inert = settingsOpen && narrow/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /closeButton\.focus\(\)/);
  assert.match(source, /triggerButton\.focus\(\)/);
});

test("advanced color tuning, diagnostics, and destructive reset have separate hierarchy", async () => {
  const html = await read("index.html");
  const displayPane = html.match(
    /data-settings-pane="display"[\s\S]*?data-settings-pane="color"/,
  )?.[0] ?? "";
  const systemPane = html.match(
    /data-settings-pane="system"[\s\S]*?<\/section>\s*<\/div>/,
  )?.[0] ?? "";

  assert.match(html, /<details id="settings-random-advanced"/);
  assert.match(html, /<summary>詳細範囲<\/summary>/);
  assert.match(displayPane, /location-status/);
  assert.match(displayPane, /location-retry/);
  assert.match(systemPane, /wake-lock-status/);
  assert.match(systemPane, /wake-lock-retry/);
  assert.match(systemPane, /settings-danger-zone/);
  assert.match(systemPane, /settings-reset/);
});

test("disabled clock-mode controls expose contextual helper text", async () => {
  const [html, source] = await Promise.all([
    read("index.html"),
    read("scripts/settings-ui.mjs"),
  ]);

  assert.match(html, /id="hour-format-help"/);
  assert.match(html, /id="uppercase-help"/);
  assert.match(source, /hourFormatHelp\.hidden = !hourFormatDisabled/);
  assert.match(source, /uppercaseHelp\.hidden = !uppercaseDisabled/);
});
