import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatRadixInteger } from "../scripts/radix.mjs";
import {
  CLOCK_SYSTEM_OPTIONS,
  clockSystemSupportsLetterCase,
  clockSystemUsesHourFormat,
  formatClockTime,
  getClockNextTickDelayMs,
} from "../scripts/time-systems.mjs";
import {
  buildSettingsSearch,
  parseSettingsFromSearch,
  sanitizeSettings,
} from "../scripts/settings.mjs";

const root = new URL("../", import.meta.url);

function clock(
  timeSystem,
  showSeconds = true,
  hourFormat = "24",
  uppercaseDigits = false,
  blinkDoubleSpeed = false,
) {
  return {
    timeSystem,
    showSeconds,
    hourFormat,
    uppercaseDigits,
    blinkDoubleSpeed,
  };
}

test("radix formatter supports bases 2 through 16 and uses lowercase digits", () => {
  assert.equal(formatRadixInteger(10, 12), "a");
  assert.equal(formatRadixInteger(11, 12), "b");
  assert.equal(formatRadixInteger(15, 16), "f");
  assert.equal(formatRadixInteger(255, 16), "ff");
  assert.equal(formatRadixInteger(10, 2), "1010");
  assert.equal(formatRadixInteger(5, 16, { minWidth: 4 }), "0005");
  assert.equal(formatRadixInteger(171, 16, { uppercase: true }), "AB");
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
  assert.equal(`${view.hourText}${view.separatorText}${view.minuteText}`, "0b:4b");
  assert.equal(view.secondText, ":4b");

  const uppercase = formatClockTime(now, clock("civil-base12", true, "24", true));
  assert.equal(
    `${uppercase.hourText}${uppercase.separatorText}${uppercase.minuteText}`,
    "0B:4B",
  );
});

test("complete duodecimal day divides the day as 12 x 12 x 12", () => {
  const midnight = formatClockTime(new Date(2026, 0, 1, 0, 0, 0, 0), clock("duodecimal"));
  const noon = formatClockTime(new Date(2026, 0, 1, 12, 0, 0, 0), clock("duodecimal"));
  const end = formatClockTime(new Date(2026, 0, 1, 23, 59, 59, 999), clock("duodecimal"));
  assert.equal(`${midnight.hourText}:${midnight.minuteText}${midnight.secondText}`, "0:0:0");
  assert.equal(`${noon.hourText}:${noon.minuteText}${noon.secondText}`, "6:0:0");
  assert.equal(`${end.hourText}:${end.minuteText}${end.secondText}`, "b:b:b");
  const upperEnd = formatClockTime(
    new Date(2026, 0, 1, 23, 59, 59, 999),
    clock("duodecimal", true, "24", true),
  );
  assert.equal(
    `${upperEnd.hourText}:${upperEnd.minuteText}${upperEnd.secondText}`,
    "B:B:B",
  );
});

test("French decimal time uses 10 hours, 100 minutes and 100 seconds", () => {
  const noon = formatClockTime(new Date(2026, 0, 1, 12, 0, 0, 0), clock("decimal-time"));
  assert.equal(`${noon.hourText}:${noon.minuteText}${noon.secondText}`, "5:00:00");
  assert.equal(
    getClockNextTickDelayMs(
      new Date(2026, 0, 1, 0, 0, 0, 0),
      clock("decimal-time"),
    ),
    864,
  );
});

test("civil base-16 keeps civil units and renders lowercase a-f", () => {
  const now = new Date(2026, 0, 1, 10, 5, 15, 0);
  const view = formatClockTime(now, clock("civil-base16"));
  assert.equal(`${view.hourText}:${view.minuteText}${view.secondText}`, "0a:05:0f");

  const uppercase = formatClockTime(now, clock("civil-base16", true, "24", true));
  assert.equal(
    `${uppercase.hourText}:${uppercase.minuteText}${uppercase.secondText}`,
    "0A:05:0F",
  );
});

test("complete hexadecimal day uses .hhhh day fraction", () => {
  const midnight = formatClockTime(new Date(2026, 0, 1, 0, 0, 0, 0), clock("hex-day"));
  const noon = formatClockTime(new Date(2026, 0, 1, 12, 0, 0, 0), clock("hex-day"));
  const compact = formatClockTime(new Date(2026, 0, 1, 12, 0, 0, 0), clock("hex-day", false));
  assert.equal(midnight.prefixText + midnight.hourText + midnight.minuteText, ".0000");
  assert.equal(noon.prefixText + noon.hourText + noon.minuteText, ".8000");
  const lettersLower = formatClockTime(
    new Date(2026, 0, 1, 16, 0, 0, 0),
    clock("hex-day"),
  );
  const lettersUpper = formatClockTime(
    new Date(2026, 0, 1, 16, 0, 0, 0),
    clock("hex-day", true, "24", true),
  );
  assert.equal(
    lettersUpper.hourText + lettersUpper.minuteText,
    (lettersLower.hourText + lettersLower.minuteText).toUpperCase(),
  );
  assert.equal(compact.prefixText + compact.hourText + compact.minuteText, ".80");
  assert.equal(noon.separatorText, "");
  assert.equal(noon.showSeconds, false);
  assert.equal(
    getClockNextTickDelayMs(
      new Date(2026, 0, 1, 0, 0, 0, 0),
      clock("hex-day"),
    ),
    1000,
  );
  assert.equal(midnight.showPrefix, true);
});

test("clock scheduling follows visible time-system boundaries", () => {
  const midnight = new Date(2026, 0, 1, 0, 0, 0, 0);
  const midSecond = new Date(2026, 0, 1, 0, 0, 0, 250);

  assert.equal(getClockNextTickDelayMs(midSecond, clock("civil")), 750);
  assert.equal(getClockNextTickDelayMs(midSecond, clock("duodecimal")), 750);
  assert.equal(
    getClockNextTickDelayMs(
      midSecond,
      clock("civil", true, "24", false, true),
    ),
    250,
  );

  // A French decimal second is exactly 864 ms.
  assert.equal(getClockNextTickDelayMs(midnight, clock("decimal-time")), 864);
  // Exact decimal boundaries must advance directly to the next unit, not emit a 1 ms retrigger.
  assert.equal(
    getClockNextTickDelayMs(
      new Date(2026, 0, 1, 0, 0, 6, 48),
      clock("decimal-time"),
    ),
    864,
  );
  // With decimal seconds hidden, the civil colon blink is the earliest visible event.
  assert.equal(
    getClockNextTickDelayMs(midnight, clock("decimal-time", false)),
    1000,
  );

  // A full hexadecimal day digit step is 86400000 / 65536 = 1318.359375 ms.
  assert.equal(getClockNextTickDelayMs(midnight, clock("hex-day")), 1319);
  // Compact .hh changes every 337500 ms, but its blinking prefix wakes earlier.
  assert.equal(
    getClockNextTickDelayMs(midnight, clock("hex-day", false)),
    1000,
  );
  assert.equal(
    getClockNextTickDelayMs(
      midnight,
      clock("hex-day", false, "24", false, true),
    ),
    500,
  );

  const atDecimalBoundary = formatClockTime(
    new Date(2026, 0, 1, 0, 0, 6, 48),
    clock("decimal-time"),
  );
  assert.equal(atDecimalBoundary.secondText, ":07");

  const beforeHexBoundary = new Date(2026, 0, 1, 0, 0, 1, 318);
  assert.equal(
    getClockNextTickDelayMs(beforeHexBoundary, clock("hex-day")),
    1,
  );
});

test("blink speed applies to colon clocks and complete-hex prefix", () => {
  const start = new Date(2026, 0, 1, 0, 0, 0, 0);
  const half = new Date(2026, 0, 1, 0, 0, 0, 500);
  const oneSecond = new Date(2026, 0, 1, 0, 0, 1, 0);

  const civilNormalStart = formatClockTime(start, clock("civil"));
  const civilNormalHalf = formatClockTime(half, clock("civil"));
  const civilNormalOne = formatClockTime(oneSecond, clock("civil"));
  assert.equal(civilNormalStart.showColon, civilNormalHalf.showColon);
  assert.notEqual(civilNormalStart.showColon, civilNormalOne.showColon);

  const civilFastStart = formatClockTime(
    start,
    clock("civil", true, "24", false, true),
  );
  const civilFastHalf = formatClockTime(
    half,
    clock("civil", true, "24", false, true),
  );
  assert.notEqual(civilFastStart.showColon, civilFastHalf.showColon);

  const hexNormalStart = formatClockTime(start, clock("hex-day"));
  const hexNormalHalf = formatClockTime(half, clock("hex-day"));
  const hexFastHalf = formatClockTime(
    half,
    clock("hex-day", true, "24", false, true),
  );
  assert.equal(hexNormalStart.prefixVisible, hexNormalHalf.prefixVisible);
  assert.notEqual(hexNormalStart.prefixVisible, hexFastHalf.prefixVisible);
});

test("uppercase digit support is enabled only for radix modes", () => {
  assert.equal(clockSystemSupportsLetterCase("civil"), false);
  assert.equal(clockSystemSupportsLetterCase("decimal-time"), false);
  for (const id of ["civil-base12", "duodecimal", "civil-base16", "hex-day"]) {
    assert.equal(clockSystemSupportsLetterCase(id), true);
  }
});

test("only the current civil preset uses the 12/24-hour option", () => {
  assert.equal(clockSystemUsesHourFormat("civil"), true);
  for (const id of ["civil-base12", "duodecimal", "decimal-time", "civil-base16", "hex-day"]) {
    assert.equal(clockSystemUsesHourFormat(id), false);
  }
});

test("time system persists through settings and URL while old settings stay civil", () => {
  const parsed = parseSettingsFromSearch(
    "?timesys=civil-base16&radixcase=upper&blink2x=1",
  );
  assert.equal(parsed.clock.timeSystem, "civil-base16");
  assert.equal(parsed.clock.uppercaseDigits, true);
  assert.equal(parsed.clock.blinkDoubleSpeed, true);
  const search = buildSettingsSearch(parsed);
  const restored = parseSettingsFromSearch(`?${search}`);
  assert.equal(restored.clock.timeSystem, "civil-base16");
  assert.equal(restored.clock.uppercaseDigits, true);
  assert.equal(restored.clock.blinkDoubleSpeed, true);

  const oldSettings = sanitizeSettings({ clock: { font: "d7" } });
  assert.equal(oldSettings.clock.timeSystem, "civil");
  assert.equal(oldSettings.clock.uppercaseDigits, false);
  assert.equal(oldSettings.clock.blinkDoubleSpeed, false);
  assert.equal(sanitizeSettings({ clock: { timeSystem: "base36" } }).clock.timeSystem, "civil");
});

test("UI and PWA wire the clock-system modules", async () => {
  const [html, ui, renderer, worker, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("scripts/settings-ui.mjs", root), "utf8"),
    readFile(new URL("scripts/render.mjs", root), "utf8"),
    readFile(new URL("service-worker.js", root), "utf8"),
    readFile(new URL("scripts/clock-app.mjs", root), "utf8"),
  ]);
  assert.match(html, /id="setting-clock-system"/);
  assert.match(html, /id="setting-clock-uppercase"/);
  assert.match(html, /id="setting-clock-blink-double"/);
  assert.match(html, /id="clock-prefix"/);
  assert.match(ui, /key: "timeSystem"/);
  assert.match(ui, /key: "uppercaseDigits"/);
  assert.match(ui, /key: "blinkDoubleSpeed"/);
  assert.match(ui, /clockSystemSupportsLetterCase/);
  assert.match(ui, /classList\.toggle\("is-disabled"/);
  assert.match(ui, /clockSystemUsesHourFormat/);
  assert.match(renderer, /timeView\.separatorText/);
  assert.match(renderer, /timeView\.prefixText/);
  assert.match(renderer, /prefix\.style\.visibility/);
  assert.match(worker, /scripts\/radix\.mjs/);
  assert.match(worker, /scripts\/time-systems\.mjs/);
  assert.match(app, /scheduleNextClockTick/);
  assert.match(app, /getClockNextTickDelayMs/);
  assert.doesNotMatch(app, /setInterval\(handleClockTick/);
  assert.match(app, /key === "showSeconds"/);
  assert.match(app, /key === "blinkDoubleSpeed"/);
});
