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
  fastBlink = false,
) {
  return { timeSystem, showSeconds, hourFormat, uppercaseDigits, fastBlink };
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
    prefixText: "",
    hourText: "23",
    minuteText: "59",
    secondText: ":59",
    separatorText: ":",
    showSeconds: true,
    showColon: false,
    showPrefix: false,
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
    lettersUpper.prefixText + lettersUpper.hourText + lettersUpper.minuteText,
    (lettersLower.prefixText + lettersLower.hourText + lettersLower.minuteText).toUpperCase(),
  );
  assert.equal(compact.prefixText + compact.hourText + compact.minuteText, ".80");
  assert.equal(noon.separatorText, "");
  assert.equal(noon.showSeconds, false);
  assert.equal(noon.prefixText, ".");
  assert.equal(noon.showPrefix, true);
  assert.equal(
    getClockNextTickDelayMs(
      new Date(2026, 0, 1, 0, 0, 0, 0),
      clock("hex-day"),
    ),
    1000,
  );
});

test("blink cadence is phase-locked to each clock system's own seconds", () => {
  const midnight = new Date(2026, 0, 1, 0, 0, 0, 0);

  for (const id of ["civil", "civil-base12", "civil-base16"]) {
    assert.equal(formatClockTime(midnight, clock(id)).showColon, true, id);
    assert.equal(
      formatClockTime(new Date(2026, 0, 1, 0, 0, 1, 0), clock(id)).showColon,
      false,
      id,
    );
    assert.equal(
      formatClockTime(
        new Date(2026, 0, 1, 0, 0, 0, 500),
        clock(id, true, "24", false, true),
      ).showColon,
      false,
      id,
    );
  }

  // Complete duodecimal second = 86400000 / 1728 = 50000 ms.
  assert.equal(formatClockTime(midnight, clock("duodecimal")).showColon, true);
  assert.equal(
    formatClockTime(
      new Date(2026, 0, 1, 0, 0, 49, 999),
      clock("duodecimal"),
    ).showColon,
    true,
  );
  assert.equal(
    formatClockTime(new Date(2026, 0, 1, 0, 0, 50, 0), clock("duodecimal"))
      .showColon,
    false,
  );
  assert.equal(
    formatClockTime(
      new Date(2026, 0, 1, 0, 0, 25, 0),
      clock("duodecimal", true, "24", false, true),
    ).showColon,
    false,
  );

  // French decimal second = 864 ms.
  assert.equal(formatClockTime(midnight, clock("decimal-time")).showColon, true);
  assert.equal(
    formatClockTime(new Date(2026, 0, 1, 0, 0, 0, 864), clock("decimal-time"))
      .showColon,
    false,
  );
  assert.equal(
    formatClockTime(
      new Date(2026, 0, 1, 0, 0, 0, 432),
      clock("decimal-time", true, "24", false, true),
    ).showColon,
    false,
  );

  // Complete hexadecimal second = 86400000 / 65536 = 1318.359375 ms.
  assert.equal(formatClockTime(midnight, clock("hex-day")).showPrefix, true);
  assert.equal(
    formatClockTime(
      new Date(2026, 0, 1, 0, 0, 1, 319),
      clock("hex-day"),
    ).showPrefix,
    false,
  );
  assert.equal(
    formatClockTime(
      new Date(2026, 0, 1, 0, 0, 0, 660),
      clock("hex-day", true, "24", false, true),
    ).showPrefix,
    false,
  );
});

test("clock scheduling follows visible time-system boundaries", () => {
  const midnight = new Date(2026, 0, 1, 0, 0, 0, 0);
  const midSecond = new Date(2026, 0, 1, 0, 0, 0, 250);

  assert.equal(getClockNextTickDelayMs(midSecond, clock("civil")), 750);
  assert.equal(
    getClockNextTickDelayMs(midnight, clock("duodecimal")),
    50000,
  );
  assert.equal(
    getClockNextTickDelayMs(
      midnight,
      clock("duodecimal", true, "24", false, true),
    ),
    25000,
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
  assert.equal(
    getClockNextTickDelayMs(
      midnight,
      clock("decimal-time", true, "24", false, true),
    ),
    432,
  );
  // With decimal seconds hidden, punctuation still follows decimal seconds.
  assert.equal(
    getClockNextTickDelayMs(midnight, clock("decimal-time", false)),
    864,
  );

  // Complete hex period and least-significant value unit share the same
  // 1/65536-day boundary at normal speed.
  assert.equal(getClockNextTickDelayMs(midnight, clock("hex-day")), 1319);
  assert.equal(
    getClockNextTickDelayMs(new Date(2026, 0, 1, 0, 0, 1, 0), clock("hex-day")),
    319,
  );
  assert.equal(getClockNextTickDelayMs(midnight, clock("hex-day", false)), 1000);
  assert.equal(
    getClockNextTickDelayMs(midnight, clock("hex-day", true, "24", false, true)),
    660,
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
  const parsed = parseSettingsFromSearch("?timesys=civil-base16&radixcase=upper&blinkfast=1");
  assert.equal(parsed.clock.timeSystem, "civil-base16");
  assert.equal(parsed.clock.uppercaseDigits, true);
  assert.equal(parsed.clock.fastBlink, true);
  const search = buildSettingsSearch(parsed);
  const restored = parseSettingsFromSearch(`?${search}`);
  assert.equal(restored.clock.timeSystem, "civil-base16");
  assert.equal(restored.clock.uppercaseDigits, true);
  assert.equal(restored.clock.fastBlink, true);

  const oldSettings = sanitizeSettings({ clock: { font: "d7" } });
  assert.equal(oldSettings.clock.timeSystem, "civil");
  assert.equal(oldSettings.clock.uppercaseDigits, false);
  assert.equal(oldSettings.clock.fastBlink, false);
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
  assert.match(html, /id="setting-clock-fast-blink"/);
  assert.match(html, /id="clock-prefix"/);
  assert.match(ui, /key: "timeSystem"/);
  assert.match(ui, /key: "uppercaseDigits"/);
  assert.match(ui, /key: "fastBlink"/);
  assert.doesNotMatch(ui, /fastBlink\.disabled/);
  assert.match(ui, /clockSystemSupportsLetterCase/);
  assert.match(ui, /classList\.toggle\("is-disabled"/);
  assert.match(ui, /clockSystemUsesHourFormat/);
  assert.match(renderer, /timeView\.separatorText/);
  assert.match(renderer, /timeView\.prefixText/);
  assert.match(renderer, /timeView\.showPrefix/);
  assert.match(worker, /scripts\/radix\.mjs/);
  assert.match(worker, /scripts\/time-systems\.mjs/);
  assert.match(app, /scheduleNextClockTick/);
  assert.match(app, /getClockNextTickDelayMs/);
  assert.doesNotMatch(app, /setInterval\(handleClockTick/);
  assert.match(app, /key === "showSeconds"/);
  assert.match(app, /key === "fastBlink"/);
});
