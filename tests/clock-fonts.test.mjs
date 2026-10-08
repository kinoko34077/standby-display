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

test("clock fonts carry explicit normalization metadata", () => {
  const metrics = Object.fromEntries(
    CLOCK_FONT_OPTIONS.map((option) => [option.id, option.normalization]),
  );

  assert.deepEqual(metrics, {
    d7: {
      sizeScale: 1,
      trackingEm: 0,
      prefixShiftEm: -0.006,
    },
    "dseg7-modern": {
      sizeScale: 0.655,
      trackingEm: -0.081,
      secondaryTrackingEm: 0,
      prefixShiftEm: -0.006,
    },
    "dseg7-classic-mini-bold": {
      sizeScale: 0.655,
      trackingEm: -0.081,
      secondaryTrackingEm: 0,
      prefixShiftEm: -0.006,
    },
    rajdhani: {
      sizeScale: 1.018,
      trackingEm: -0.07,
      prefixShiftEm: -0.041,
    },
    mono: {
      sizeScale: 0.907,
      trackingEm: -0.183,
      prefixShiftEm: -0.047,
    },
  });
});

test("original Digital-7 is externally available as d7, with separate OFL Modern fallback", async () => {
  const original = CLOCK_FONT_OPTIONS.find((candidate) => candidate.id === "d7");
  const modern = CLOCK_FONT_OPTIONS.find((candidate) => candidate.id === "dseg7-modern");
  assert.match(original?.label ?? "", /Digital-7.*Style-7/);
  assert.match(original?.family ?? "", /"Digital-7"/);
  assert.equal(original?.normalization.sizeScale, 1);
  assert.equal(modern?.label, "DSEG7 Modern");
  assert.match(modern?.family ?? "", /"DSEG7-Modern"/);

  const css = await readFile(new URL("style.css", root), "utf8");
  assert.match(css, /@import url\("https:\/\/fonts\.cdnfonts\.com\/css\/digital-7-mono"\)/);
  assert.match(css, /font-family: "DSEG7-Modern"/);
  assert.match(css, /https:\/\/unpkg\.com\/dseg@0\.46\.0\/fonts\/DSEG7-Modern\/DSEG7Modern-Regular\.woff2/);
  assert.doesNotMatch(css, /digital-7\.ttf/);

  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /Digital-7 © Sizenko Alexander \/ Style-7/);
  assert.match(html, /商用・事業用途は別途許諾/);

  const worker = await readFile(new URL("service-worker.js", root), "utf8");
  assert.match(worker, /DSEG7Modern-Regular\.woff2/);
  assert.doesNotMatch(worker, /digital-7\.ttf|digital-7-mono/);
  await assert.rejects(readFile(new URL("assets/fonts/digital-7.ttf", root)), /ENOENT/);

  assert.equal(parseSettingsFromSearch("?clockfont=d7").clock.font, "d7");
  assert.equal(parseSettingsFromSearch("?clockfont=dseg7-modern").clock.font, "dseg7-modern");
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
    family: "\"DSEG7-Classic-MINI\", \"Rajdhani\", sans-serif",
    weight: 700,
    sizeScale: 0.786,
    letterSpacingEm: -0.051,
    centerShiftEm: -0.0255,
    secondaryLetterSpacingEm: 0.03,
    prefixShiftEm: -0.006,
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

  const [rajdhaniLicense, notoLicense] = await Promise.all([
    readFile(new URL("assets/fonts/RAJDHANI-LICENSE.txt", root), "utf8"),
    readFile(new URL("assets/fonts/NOTO-SANS-JP-LICENSE.txt", root), "utf8"),
  ]);
  assert.match(rajdhaniLicense, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(rajdhaniLicense, /Indian Type Foundry/);
  assert.match(notoLicense, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(notoLicense, /Copyright 2014-2021 Adobe/);

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
  assert.match(css, /--app-clock-center-shift/);
  assert.match(css, /--app-clock-prefix-shift/);
  assert.match(
    css,
    /\.clock-prefix\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?right:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?letter-spacing:\s*0;[\s\S]*?transform:\s*translateX\(var\(--app-clock-prefix-shift\)\)/,
  );
  assert.match(css, /\.clock-prefix::after\s*\{[\s\S]*?background:\s*var\(--app-clock\)/);
  assert.match(css, /\.clock-prefix\[hidden\]\s*\{[\s\S]*?display:\s*none/);
  assert.match(css, /\.clock-prefix\[hidden\]\s*\{[\s\S]*?min-width:\s*0/);
  assert.match(css, /\.clock-block\s*\{[\s\S]*?width:\s*max-content/);
  assert.match(
    css,
    /\.clock-block\s*\{[\s\S]*?transform:\s*scale\(var\(--app-clock-size-scale\)\)\s*translateX\(var\(--app-clock-center-shift\)\)/,
  );
  assert.match(css, /\.time-line\s*\{[\s\S]*?position:\s*relative/);
  assert.match(css, /\.time-line\s*\{[\s\S]*?width:\s*max-content/);
  assert.match(css, /\.time-line\s*\{[\s\S]*?text-align:\s*center/);
  assert.match(css, /\.seconds\s*\{[\s\S]*?right:\s*0/);
  assert.match(css, /\.seconds\s*\{[\s\S]*?top:\s*100%/);
  assert.match(css, /\.seconds\s*\{[\s\S]*?text-align:\s*right/);
  assert.match(css, /--app-clock-secondary-letter-spacing/);
  assert.match(
    css,
    /transform:\s*scale\(var\(--app-clock-size-scale\)\)\s*translateX\(var\(--app-clock-center-shift\)\)/,
  );
});


test("portrait clock panel itself is centered in the padded grid", async () => {
  const css = await readFile(new URL("style.css", root), "utf8");

  assert.match(
    css,
    /@media \(max-aspect-ratio: 1 \/ 1\)[\s\S]*?\.clock-panel\s*\{[\s\S]*?align-self:\s*center;[\s\S]*?justify-self:\s*center;/,
  );
  assert.doesNotMatch(
    css,
    /@media \(max-aspect-ratio: 1 \/ 1\)[\s\S]*?\.clock-panel\s*\{[\s\S]*?justify-self:\s*stretch;/,
  );
});

test("secondary seconds align to the centered primary clock without affecting its width", async () => {
  const css = await readFile(new URL("style.css", root), "utf8");

  assert.match(
    css,
    /\.clock-block\s*\{[\s\S]*?width:\s*max-content/,
  );
  assert.match(
    css,
    /\.seconds\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?right:\s*0;[\s\S]*?top:\s*100%;[\s\S]*?bottom:\s*auto;/,
  );
  assert.doesNotMatch(
    css,
    /@media \(max-aspect-ratio: 1 \/ 1\)[\s\S]*?\.seconds\s*\{[\s\S]*?bottom:\s*-8vh/,
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
