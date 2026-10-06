import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CLOCK_FONT_OPTIONS,
  DEFAULT_SETTINGS,
} from "../scripts/constants.mjs";
import {
  buildSettingsSearch,
  parseSettingsFromSearch,
  sanitizeSettings,
} from "../scripts/settings.mjs";
import { resolveClockTypography } from "../scripts/render.mjs";

const root = new URL("../", import.meta.url);

test("clock fonts carry Digital-7-relative normalization metadata", () => {
  const metrics = Object.fromEntries(
    CLOCK_FONT_OPTIONS.map((option) => [option.id, option.normalization]),
  );

  assert.deepEqual(metrics, {
    d7: { sizeScale: 1, trackingEm: 0 },
    "dseg7-classic-mini-bold": { sizeScale: 0.655, trackingEm: -0.081 },
    rajdhani: { sizeScale: 1.018, trackingEm: -0.07 },
    mono: { sizeScale: 0.907, trackingEm: -0.183 },
  });
});

test("DSEG7 Classic Mini Bold remains a selectable bundled clock font", async () => {
  const option = CLOCK_FONT_OPTIONS.find(
    (candidate) => candidate.id === "dseg7-classic-mini-bold",
  );
  assert.equal(option?.label, "DSEG7 Classic Mini Bold");
  assert.match(option?.family ?? "", /DSEG7-Classic-MINI/);

  const parsed = parseSettingsFromSearch("?clockfont=dseg7-classic-mini-bold");
  assert.equal(parsed.clock.font, "dseg7-classic-mini-bold");

  const css = await readFile(new URL("style.css", root), "utf8");
  assert.match(css, /font-family: "DSEG7-Classic-MINI"/);
  assert.match(css, /assets\/fonts\/dseg7-classic-mini-bold\.woff2/);
  assert.match(css, /font-weight: 700/);

  const font = await readFile(
    new URL("assets/fonts/dseg7-classic-mini-bold.woff2", root),
  );
  assert.equal(font.subarray(0, 4).toString("ascii"), "wOF2");

  const worker = await readFile(new URL("service-worker.js", root), "utf8");
  assert.match(worker, /assets\/fonts\/dseg7-classic-mini-bold\.woff2/);

  const license = await readFile(
    new URL("assets/fonts/DSEG-LICENSE.txt", root),
    "utf8",
  );
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(license, /Reserved Font Name "DSEG"/);
});

test("clock size and letter-spacing settings round-trip and clamp safely", () => {
  const parsed = parseSettingsFromSearch(
    "?clocksize=123&clockspacing=-0.08&clockfont=rajdhani",
  );
  assert.equal(parsed.clock.sizePercent, 123);
  assert.equal(parsed.clock.letterSpacingEm, -0.08);

  const search = buildSettingsSearch(parsed);
  const restored = parseSettingsFromSearch(`?${search}`);
  assert.equal(restored.clock.sizePercent, 123);
  assert.equal(restored.clock.letterSpacingEm, -0.08);

  const clamped = sanitizeSettings({
    clock: {
      sizePercent: 500,
      letterSpacingEm: -9,
    },
  });
  assert.equal(clamped.clock.sizePercent, 140);
  assert.equal(clamped.clock.letterSpacingEm, -0.25);

  const legacySavedShape = sanitizeSettings({
    clock: {
      font: "d7",
    },
  });
  assert.equal(legacySavedShape.clock.sizePercent, DEFAULT_SETTINGS.clock.sizePercent);
  assert.equal(
    legacySavedShape.clock.letterSpacingEm,
    DEFAULT_SETTINGS.clock.letterSpacingEm,
  );
});

test("font normalization and user adjustment compose in one render calculation", () => {
  const settings = sanitizeSettings({
    clock: {
      font: "dseg7-classic-mini-bold",
      sizePercent: 120,
      letterSpacingEm: 0.03,
    },
  });

  assert.deepEqual(resolveClockTypography(settings), {
    family: "\"DSEG7-Classic-MINI\", \"D7\", \"Rajdhani\", sans-serif",
    sizeScale: 0.786,
    letterSpacingEm: -0.051,
  });
});

test("settings UI exposes immediate clock size and tracking sliders", async () => {
  const [html, ui, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("scripts/settings-ui.mjs", root), "utf8"),
    readFile(new URL("style.css", root), "utf8"),
  ]);

  assert.match(html, /id="setting-clock-size" type="range"/);
  assert.match(html, /id="setting-clock-letter-spacing" type="range"/);
  assert.match(ui, /key: "sizePercent"/);
  assert.match(ui, /key: "letterSpacingEm"/);
  assert.match(css, /--app-clock-size-scale/);
  assert.match(css, /--app-clock-letter-spacing/);
  assert.match(css, /transform: scale\(var\(--app-clock-size-scale\)\)/);
});
