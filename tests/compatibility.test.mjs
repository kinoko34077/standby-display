import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { parse } from "acorn";
import { formatDate, getSeikoku, getJishin } from "../scripts/formatters.mjs";
import { createKanjiConversionService } from "../scripts/kanji-conversion.mjs";
const root = new URL("../", import.meta.url);
const read = file => readFile(new URL(file, root), "utf8");
const bootstrap = await read("bootstrap.js");
const legacy = await read("legacy/clock.js");
const config = await read("shared/config.js");

test("all files executed by iOS 9 parse as ES5", async () => {
  for (const file of ["bootstrap.js", "shared/config.js", "legacy/clock.js"]) {
    assert.doesNotThrow(() => parse(file === "bootstrap.js" ? bootstrap : file === "shared/config.js" ? config : legacy, { ecmaVersion: 5 }));
  }
  const html = await read("legacy/index.html");
  assert.doesNotMatch(html, /type=["']module/);
});

function boot({ old = false, loading = false, css = true, search = "", base = "https://example.com/standby-display/index.html", api = {} } = {}) {
  let redirect;
  let appended;
  const timers = new Map();
  const attrs = {};
  const listeners = {};
  const window = {
    fetch() {}, Promise, Map, Set, URL, URLSearchParams, PointerEvent() {},
    requestAnimationFrame() {}, CSS: { supports: () => css },
    setTimeout(fn) { timers.set(1, fn); return 1; }, clearTimeout(id) { timers.delete(id); },
    location: { search, hash: "#clock", replace(url) { redirect = new URL(url, base).href; } },
    ...api,
  };
  const document = {
    readyState: loading ? "loading" : "complete",
    addEventListener(name, fn) { listeners[name] = fn; },
    createElement: () => old ? {} : { noModule: false },
    head: { appendChild(script) { appended = script; } },
    documentElement: { setAttribute(key, value) { attrs[key] = value; } },
  };
  vm.runInNewContext(bootstrap, { window, document });
  return { window, timers, attrs, listeners, get script() { return appended; }, get redirect() { return redirect; } };
}
test("old devices redirect in head while modern startup waits for DOM", () => {
  const old = boot({ old: true, loading: true });
  assert.match(old.redirect, /\/legacy\//);
  const modern = boot({ loading: true });
  assert.equal(modern.script, undefined);
  modern.listeners.DOMContentLoaded();
  assert.equal(modern.script.type, "module");
});
test("iOS 9-like missing modules selects legacy before loading modern code", () => {
  const state = boot({ old: true, search: "?sec=0&bg=112233" });
  assert.equal(state.redirect, "https://example.com/standby-display/legacy/?sec=0&bg=112233#clock");
  assert.equal(state.script, undefined);
});
test("missing required CSS or runtime APIs selects legacy", () => {
  assert.match(boot({ css: false }).redirect, /\/legacy\//);
  assert.match(boot({ api: { fetch: undefined } }).redirect, /\/legacy\//);
  assert.match(boot({ api: { PointerEvent: undefined } }).redirect, /\/legacy\//);
});
test("healthy modern renderer cancels fallback even while APIs are pending", () => {
  const state = boot();
  assert.equal(state.script.type, "module");
  state.window.StandbyBoot.moduleParsed = true;
  state.script.onload();
  state.window.StandbyBoot.ready();
  assert.equal(state.attrs["data-clock-mode"], "modern");
  assert.equal(state.timers.size, 0);
  state.script.onerror();
  assert.equal(state.redirect, undefined);
});
test("module parse failure, download failure and stalled startup fall back", () => {
  const syntax = boot(); syntax.script.onload(); assert.match(syntax.redirect, /\/legacy\//);
  const network = boot(); network.script.onerror(); assert.match(network.redirect, /\/legacy\//);
  const stalled = boot(); stalled.timers.get(1)(); assert.match(stalled.redirect, /\/legacy\//);
});
test("manual modes preserve settings and fallback does not force a redirect loop", () => {
  assert.match(boot({ search: "?mode=legacy&sec=0" }).redirect, /legacy\/\?sec=0#clock$/);
  const state = boot({ old: true, search: "?sec=0&mode=modern&bg=112233" });
  assert.equal(state.redirect, undefined);
  state.script.onerror();
  assert.match(state.redirect, /legacy\/\?sec=0&bg=112233#clock$/);
});

function legacyPage({ search = "", storage = "{}", blockedStorage = false, when = new Date(2026, 8, 7, 13, 5, 9), locate = false } = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent: "", style: {}, href: "" });
    return elements.get(id);
  };
  const requests = [];
  const intervals = [];
  let current = when;
  class ClockDate extends Date { constructor(value) { super(arguments.length ? value : current); } }
  function XHR() { requests.push(this); }
  XHR.prototype.open = function (method, url) { this.url = url; };
  XHR.prototype.send = function () {};
  const window = { XMLHttpRequest: XHR, location: { search, hash: "#clock" },
    localStorage: { getItem() { if (blockedStorage) throw Error("blocked"); return storage; } },
    setInterval(fn, ms) { intervals.push({ fn, ms }); } };
  const document = { getElementById: element, querySelector: element, body: element("body") };
  const navigator = locate ? { geolocation: { getCurrentPosition(success) { success({ coords: { latitude: 35.6812, longitude: 139.7671 } }); } } } : {};
  const context = vm.createContext({ window, document, navigator, Date: ClockDate });
  vm.runInContext(config, context);
  vm.runInContext(legacy, context);
  function respond(request, payload, status = 200) { request.status = status; request.responseText = JSON.stringify(payload); request.onload(); }
  return { element, requests, intervals, respond, tick(date) { current = date; intervals.find(x => x.ms === 1000).fn(); } };
}
test("legacy current date and traditional time match the modern formatter", () => {
  const when = new Date(2026, 8, 7, 13, 5, 9);
  const state = legacyPage({ when, blockedStorage: true });
  assert.equal(state.element("hour").textContent, "13");
  assert.equal(state.element("minute").textContent, "05");
  assert.equal(state.element("wareki-line1").textContent, formatDate(when, { yearSystem: "wareki", characterStyle: "new" }).line1Text);
  assert.equal(state.element("seikoku").textContent, getSeikoku(13));
  assert.equal(state.element("jishin").textContent, getJishin(13, 5));
  assert.equal(state.element("wareki-line2").textContent, "長月七日 月");
});
test("shared URL options override stored settings in the legacy page", () => {
  const state = legacyPage({ search: "?hour=12&sec=0&cal=western&weather=0&moon=0&rokuyo=0&bg=112233&text=abcdef&clock=123456",
    storage: JSON.stringify({ clock: { showSeconds: true }, colors: { background: "#ffffff" } }) });
  assert.equal(state.element("hour").textContent, "01");
  assert.equal(state.element("wareki-line1").textContent, "2026年");
  assert.equal(state.element("seconds").style.display, "none");
  assert.equal(state.element("body").style.backgroundColor, "#112233");
  assert.equal(state.element("body").style.color, "#abcdef");
  assert.equal(state.element(".clock-block").style.color, "#123456");
  assert.equal(state.requests.length, 1); // Time sync only; hidden APIs do not run.
});
test("API failures leave the legacy clock running; good responses fill supplemental fields", () => {
  const state = legacyPage({ locate: true });
  const rokuyo = state.requests.find(x => x.url.includes("calendar/rokuyo"));
  const weather = state.requests.find(x => x.url.includes("api.kinotch.workers.dev/v1/weather"));
  const moon = state.requests.find(x => x.url.includes("astronomy/moon"));
  state.respond(rokuyo, [{ rokuyo: "友引" }]);
  state.respond(weather, { temp: 24.4, weather: "Rain" });
  state.respond(moon, { result: [{ age: 15 }] });
  assert.equal(state.element("rokuyo").textContent, "友引");
  assert.equal(state.element("weather").textContent, "🌧24℃");
  assert.equal(state.element("moon").textContent, "🌕");
  state.respond(weather, { error: "offline" }, 503);
  state.tick(new Date(2026, 8, 7, 13, 5, 10));
  assert.equal(state.element("seconds").textContent, ":10");
});
test("midnight replaces yesterday's rokuyo and ignores late stale responses", () => {
  const state = legacyPage({ when: new Date(2026, 8, 7, 23, 59, 59) });
  const yesterday = state.requests.find(x => x.url.includes("calendar/rokuyo"));
  state.tick(new Date(2026, 8, 8, 0, 0, 0));
  state.respond(yesterday, [{ rokuyo: "昨日" }]);
  assert.equal(state.element("rokuyo").textContent, "未取得");
  assert.match(state.requests.at(-1).url, /date=2026-09-08/);
});
test("legacy return link keeps options but clears forced legacy", () => {
  const state = legacyPage({ search: "?mode=legacy&sec=0" });
  assert.equal(state.element("automatic-mode").href, "../?sec=0#clock");
});
test("normal entry is gated and PWA precaches both branches", async () => {
  const html = await read("index.html");
  assert.match(html, /src="\.\/bootstrap.js"><\/script>/);
  assert.doesNotMatch(html, /type="module" src="\.\/app.mjs"/);
  const worker = await read("service-worker.js");
  for (const file of ["bootstrap.js", "modern-entry.mjs", "shared/config.js", "legacy/clock.js", "legacy/style.css", "legacy/index.html"]) assert.ok(worker.includes(file));
});

test("modern kanji conversion adopts the API map and keeps local fallback", async () => {
  let requestedUrl;
  const service = createKanjiConversionService(async (url, init) => {
    requestedUrl = url;
    assert.equal(init.method, "POST");
    const request = JSON.parse(init.body);
    assert.deepEqual(request.profile, [
      "legacy-kanji",
      "general-character-replacements",
    ]);
    return {
      ok: true,
      status: 200,
      async json() {
        return { text: "亞佛會體價圓寫效國圖聲變學實對歸廣當惡舊晝曉曆歷氣澤濱瀧縣畫眞邊鐵讀假壽與螢覺說齊樣龜臺" };
      },
    };
  }, "https://api.example.test");

  assert.equal(service.convertNewToOld("亜仏"), "亞佛");
  assert.equal(await service.initialize(), true);
  assert.equal(requestedUrl, "https://api.example.test/v1/transform");
  assert.equal(service.convertNewToOld("国と亀"), "國と龜");

  const offlineService = createKanjiConversionService(
    async () => {
      throw new Error("offline");
    },
    "https://api.example.test",
  );
  assert.equal(await offlineService.initialize(), false);
  assert.equal(offlineService.convertNewToOld("学校"), "學校");
});
