import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSettingsSearch,
  mergeSettings,
  parseSettingsFromSearch,
  sanitizeSettings,
} from "../scripts/settings.mjs";

test("partial URL settings override only explicitly supplied stored fields", () => {
  const stored = sanitizeSettings({
    clock: {
      showSeconds: true,
      font: "mono",
      sizePercent: 123,
    },
    colors: {
      background: "#112233",
      text: "#abcdef",
      clock: "#123456",
    },
  });
  const fromUrl = parseSettingsFromSearch("?sec=0");

  assert.deepEqual(fromUrl, {
    clock: {
      showSeconds: false,
    },
  });

  const merged = sanitizeSettings(mergeSettings(stored, fromUrl));
  assert.equal(merged.clock.showSeconds, false);
  assert.equal(merged.clock.font, "mono");
  assert.equal(merged.clock.sizePercent, 123);
  assert.equal(merged.colors.background, "#112233");
  assert.equal(merged.colors.text, "#abcdef");
  assert.equal(merged.colors.clock, "#123456");
});

test("full generated share settings still round-trip completely", () => {
  const original = sanitizeSettings({
    clock: {
      showSeconds: false,
      hourFormat: "12",
      font: "mono",
      timeSystem: "hex-day",
      uppercaseDigits: true,
      fastBlink: true,
      sizePercent: 118,
      letterSpacingEm: -0.08,
    },
    calendar: {
      yearSystem: "western",
      characterStyle: "old",
    },
    typography: {
      writingMode: "vertical",
      font: "serif",
    },
    visibility: {
      weather: false,
      moon: false,
      rokuyo: true,
    },
    colors: {
      background: "#112233",
      text: "#abcdef",
      clock: "#123456",
    },
    randomColors: {
      enabled: true,
      background: true,
      revision: 7,
      clock: {
        hueMin: 10,
        hueMax: 20,
        lightnessMin: 30,
        lightnessMax: 40,
      },
      text: {
        hueMin: 50,
        hueMax: 60,
        lightnessMin: 70,
        lightnessMax: 80,
      },
      backgroundRange: {
        hueMin: 90,
        hueMax: 100,
        lightnessMin: 5,
        lightnessMax: 15,
      },
    },
  });

  const restored = parseSettingsFromSearch(`?${buildSettingsSearch(original)}`);
  assert.deepEqual(restored, original);
});

test("invalid values stay sanitized without materializing unrelated fields", () => {
  const parsed = parseSettingsFromSearch(
    "?clockfont=not-a-font&clocksize=9999&bg=not-a-color",
  );

  assert.deepEqual(Object.keys(parsed).sort(), ["clock", "colors"]);
  assert.equal(parsed.clock.font, "d7");
  assert.equal(parsed.clock.sizePercent, 140);
  assert.equal(parsed.colors.background, "#050505");
  assert.equal(parsed.clock.showSeconds, undefined);
  assert.equal(parsed.colors.text, undefined);
});
