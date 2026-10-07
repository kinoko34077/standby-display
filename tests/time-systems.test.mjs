import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatRadixInteger } from "../scripts/radix.mjs";
import {
  CLOCK_SYSTEM_OPTIONS,
  clockSystemUsesHourFormat,
  formatClockTime,
  getClockTickIntervalMs,
} from "../scripts/time-systems.mjs";
import {
  buildSettingsSearch,
  parseSettingsFromSearch,
  sanitizeSettings,
} from "../scripts/settings.mjs";

const root = new URL("../", import.meta.url);

function clock(timeSystem, showSeconds = true, hourFormat = "24") {
  return { timeSystem, showSeconds, hourFormat };
}

test("radix formatter supports bases 2 through 16 and uses lowercase digits", () => {
  assert.equal(formatRadixInteger(10, 12), "a");
  assert.equal(formatRadixInteger(11, 12), "b");
  assert.equal(formatRadixInteger(15, 16), "f");
  assert.equal(formatRadixInteger(255, 16), "ff");
  assert.equal(formatRadixInteger(10, 2), "1010");
  assert.equal(formatRadixInteger(5, 16, { minWidth: 4 }), "0005");
  assert.throws(() => formatRadixInteger(1, 1), RangeError);
  assert.throws(() => formatRadixInteger(1, 17), RangeError);
});

test("six requested clock presets are registered", () => {
  assert.deepEqual(CLOCK_SYSTEM_OPTIONS.map((option) => option.id), [
    "civil",
    "civil-base12",
    "duodecimal",
    "decimal-time",
    "civil-base16",
    "hex-day",
  ]);
});

test("current civil clock preserves existing behavior", () => {
  const now = new Date(2026, 0, 1, 23, 59, 59, 0);
  assert.deepEqual(formatClockTime(now, clock("civil")), {
    hourText: "23",
    minuteText: "59",
    secondText: ":59",
    separatorText: ":",
    showSeconds: true,
    showColon: false,
  });
  assert.equal(formatClockTime(now, clock("civil", true, "12")).hourText, "11");
});

test("civil base-12 keeps 24/60/60 units and converts only numerals", () => {
  const now = new Date(2026, 0, 1, 11, 59, 59, 0);
  const view = formatClockTime(now, clock("civil-base12"));
  assert.equal(`${view.hourText}${view.separatorText}${view.minuteText}`, "b:4b");
  assert.equal(view.secondText, ":4b");
});

test("complete duodecimal day divides the day as 12 x 12 x 12", () => {
  const midnight = formatClockTime(new Date(2026, 0, 1, 0, 0, 0, 0), clock("duodecimal"));
  const noon = formatClockTime(new Date(2026, 0, 1, 12, 0, 0, 0), clock("duodecimal"));
  const end = formatClockTime(new Date(2026, 0, 1, 23, 59, 59, 999), clock("duodecimal"));
  assert.equal(`${midnight.hourText}:${midnight.minuteText}${midnight.secondText}`, "0:0:0");
  assert.equal(`${noon.hourText}:${noon.minuteText}${noon.secondText}`, "6:0:0");
  assert.equal(`${end.hourText}:${end.minuteText}${end.secondText}`, "b:b:b");
});

test("French decimal time uses 10 hours, 100 minutes and 100 seconds", () => {
  const noon = formatClockTime(new Date(2026, 0, 1, 12, 0, 0, 0), clock("decimal-time"));
  assert.equal(`${noon.hourText}:${noon.minuteText}${noon.secondText}`, "5:00:00");
  assert.equal(getClockTickIntervalMs(clock("decimal-time")), 250);
});

test("civil base-16 keeps civil units and renders lowercase a-f", () => {
  const now = new Date(2026, 0, 1, 23, 59, 59, 0);
  const view = formatClockTime(now, clock("civil-base16"));
  assert.equal(`${view.hourText}:${view.minuteText}${view.secondText}`, "17:3b:3b");
});

test("complete hexadecimal day uses .hhhh day fraction", () => {
  const midnight = formatClockTime(new Date(2026, 0, 1, 0, 0, 0, 0), clock("hex-day"));
  const noon = formatClockTime(new Date(2026, 0, 1, 12, 0, 0, 0), clock("hex-day"));
  const compact = formatClockTime(new Date(2026, 0, 1, 12, 0, 0, 0), clock("hex-day", false));
  assert.equal(midnight.hourText + midnight.minuteText, ".0000");
  assert.equal(noon.hourText + noon.minuteText, ".8000");
  assert.equal(compact.hourText + compact.minuteText, ".80");
  assert.equal(noon.separatorText, "");
  assert.equal(noon.showSeconds, false);
  assert.equal(getClockTickIntervalMs(clock("hex-day")), 500);
});

test("only the current civil preset uses the 12/24-hour option", () => {
  assert.equal(clockSystemUsesHourFormat("civil"), true);
  for (const id of ["civil-base12", "duodecimal", "decimal-time", "civil-base16", "hex-day"]) {
    assert.equal(clockSystemUsesHourFormat(id), false);
  }
});

test("time system persists through settings and URL while old settings stay civil", () => {
  const parsed = parseSettingsFromSearch("?timesys=civil-base16");
  assert.equal(parsed.clock.timeSystem, "civil-base16");
  const search = buildSettingsSearch(parsed);
  assert.equal(parseSettingsFromSearch(`?${search}`).clock.timeSystem, "civil-base16");

  assert.equal(sanitizeSettings({ clock: { font: "d7" } }).clock.timeSystem, "civil");
  assert.equal(sanitizeSettings({ clock: { timeSystem: "base36" } }).clock.timeSystem, "civil");
});

test("UI and PWA wire the clock-system modules", async () => {
  const [html, ui, renderer, worker] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("scripts/settings-ui.mjs", root), "utf8"),
    readFile(new URL("scripts/render.mjs", root), "utf8"),
    readFile(new URL("service-worker.js", root), "utf8"),
  ]);
  assert.match(html, /id="setting-clock-system"/);
  assert.match(ui, /key: "timeSystem"/);
  assert.match(ui, /clockSystemUsesHourFormat/);
  assert.match(renderer, /timeView\.separatorText/);
  assert.match(worker, /scripts\/radix\.mjs/);
  assert.match(worker, /scripts\/time-systems\.mjs/);
});
