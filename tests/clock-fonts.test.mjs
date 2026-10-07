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
    "dseg7-classic-mini-bold": {
      sizeScale: 0.655,
      trackingEm: -0.081,
      secondaryTrackingEm: 0,
    },
    rajdhani: { sizeScale: 1.018, trackingEm: -0.07 },
    mono: { sizeScale: 0.907, trackingEm: -0.183 },
  });
});

test("normalized source metrics stay close to the Digital-7 reference", () => {
  const sourceMetrics = {
    d7: { height: 0.654545, digitAdvance: 0.472727, colonAdvance: 0.163636 },
    "dseg7-classic-mini-bold": { height: 1, digitAdvance: 0.816, colonAdvance: 0.2 },
    rajdhani: { height: 0.643, digitAdvance: 0.526, colonAdvance: 0.194 },
    mono: { height: 0.722, digitAdvance: 0.6, colonAdvance: 0.6 },
  };
  const reference = sourceMetrics.d7;
  const referenceHeight = reference.height;
  const referenceWidth = 4 * reference.digitAdvance + reference.colonAdvance;

  for (const option of CLOCK_FONT_OPTIONS) {
    const source = sourceMetrics[option.id];
    const normalizedHeight = source.height * option.normalization.sizeScale;
    const normalizedWidth = (
      4 * source.digitAdvance +
      source.colonAdvance +
      4 * option.normalization.trackingEm
    ) * option.normalization.sizeScale;

    assert.ok(
      Math.abs(normalizedHeight - referenceHeight) <= 0.001,
      `${option.id} normalized height drifted`,
    );
    assert.ok(
      Math.abs(normalizedWidth - referenceWidth) <= 0.005,
      `${option.id} normalized 88:88 width drifted`,
    );
  }
});

test("DSEG7 Classic Mini Bold remains a selectable bundled clock font", async () => {
  const option = CLOCK_FONT_OPTIONS.find(
    (candidate) => candidate.id === "dseg7-classic-mini-bold",
  );
  assert.equal(option?.label, "DSEG7 Classic Mini Bold");
  assert.match(option?.family ?? "", /DSEG7-Classic-MINI/);
  assert.equal(option?.weight, 700);

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
  assert.match(worker, /assets\/fonts\/ibm-plex-mono-latin-400-normal\.woff2/);

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
    weight: 700,
    sizeScale: 0.786,
    letterSpacingEm: -0.051,
    secondaryLetterSpacingEm: 0.03,
  });
});

test("settings UI exposes immediate clock size and tracking sliders", async () => {
  const plexFont = await readFile(
    new URL("assets/fonts/ibm-plex-mono-latin-400-normal.woff2", root),
  );
  assert.equal(plexFont.subarray(0, 4).toString("ascii"), "wOF2");

  const plexLicense = await readFile(
    new URL("assets/fonts/IBM-PLEX-MONO-LICENSE.txt", root),
    "utf8",
  );
  assert.match(plexLicense, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(plexLicense, /Reserved Font Name "Plex"/);

  const [html, ui, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("scripts/settings-ui.mjs", root), "utf8"),
    readFile(new URL("style.css", root), "utf8"),
  ]);

  assert.match(html, /id="setting-clock-size" type="range"/);
  assert.match(html, /id="setting-clock-letter-spacing" type="range"/);
  assert.match(ui, /key: "sizePercent"/);
  assert.match(ui, /key: "letterSpacingEm"/);
  assert.match(css, /font-family: "IBM Plex Mono"/);
  assert.match(css, /assets\/fonts\/ibm-plex-mono-latin-400-normal\.woff2/);
  assert.match(css, /--app-clock-size-scale/);
  assert.match(css, /--app-clock-letter-spacing/);
  assert.match(css, /--app-clock-secondary-letter-spacing/);
  assert.match(css, /\.clock-prefix\[hidden\]\s*\{[\s\S]*?display:\s*none/);
  assert.match(css, /\.clock-prefix\[hidden\]\s*\{[\s\S]*?min-width:\s*0/);
  assert.match(
    css,
    /body\[data-clock-font="dseg7-classic-mini-bold"\] \.seconds\s*\{[\s\S]*?top:\s*100%/,
  );
  assert.match(
    css,
    /body\[data-clock-font="dseg7-classic-mini-bold"\] \.seconds\s*\{[\s\S]*?right:\s*0/,
  );
  assert.match(
    css,
    /body\[data-clock-font="dseg7-classic-mini-bold"\] \.seconds\s*\{[\s\S]*?bottom:\s*auto/,
  );
  assert.match(css, /--app-clock-secondary-letter-spacing/);
  assert.match(css, /transform: scale\(var\(--app-clock-size-scale\)\)/);
});


test("DSEG secondary seconds use a below-right region without shifting the primary clock", async () => {
  const [renderer, css] = await Promise.all([
    readFile(new URL("scripts/render.mjs", root), "utf8"),
    readFile(new URL("style.css", root), "utf8"),
  ]);

  assert.match(renderer, /dataset\.clockFont = settings\.clock\.font/);
  assert.match(
    css,
    /body\[data-clock-font="dseg7-classic-mini-bold"\] \.seconds\s*\{[\s\S]*?left:\s*auto;[\s\S]*?right:\s*0;[\s\S]*?top:\s*100%;[\s\S]*?bottom:\s*auto;/,
  );
  assert.doesNotMatch(
    css,
    /body\[data-clock-font="dseg7-classic-mini-bold"\] \.seconds\s*\{[\s\S]*?left:\s*calc\(100%/,
  );
});

test("DSEG secondary seconds avoid the main negative tracking compression", () => {
  const defaults = sanitizeSettings({
    clock: {
      font: "dseg7-classic-mini-bold",
      letterSpacingEm: 0,
    },
  });
  const typography = resolveClockTypography(defaults);
  assert.equal(typography.letterSpacingEm, -0.081);
  assert.equal(typography.secondaryLetterSpacingEm, 0);
});
