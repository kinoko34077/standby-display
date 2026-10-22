import { CLOCK_FONT_OPTIONS, TEXT_FONT_OPTIONS } from "./constants.mjs";

const CLOCK_FONT_MAP = new Map(
  CLOCK_FONT_OPTIONS.map((option) => [option.id, option]),
);
const TEXT_FONT_MAP = new Map(
  TEXT_FONT_OPTIONS.map((option) => [option.id, option.family]),
);

export function resolveClockTypography(settings) {
  const option = CLOCK_FONT_MAP.get(settings.clock.font) || CLOCK_FONT_MAP.get("d7");
  const userScale = settings.clock.sizePercent / 100;
  const secondaryTracking =
    option.normalization.secondaryTrackingEm ??
    option.normalization.trackingEm;
  const letterSpacingEm = roundMetric(
    option.normalization.trackingEm + settings.clock.letterSpacingEm,
    3,
  );
  return {
    family: option.family,
    weight: option.weight,
    sizeScale: roundMetric(option.normalization.sizeScale * userScale, 4),
    letterSpacingEm,
    secondaryLetterSpacingEm: roundMetric(
      secondaryTracking + settings.clock.letterSpacingEm,
      3,
    ),
  };
}

function roundMetric(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}


const periodInkCache = new Map();

/** Sample the same font's real period in Canvas, avoiding broad outline
 * metrics that include non-painted side bearings on some webfonts. */
function paintedPeriodRight(documentObject, style, glyph, fallbackRight) {
  const key = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily, glyph].join("|");
  if (periodInkCache.has(key)) return periodInkCache.get(key);
  const fontPx = Number.parseFloat(style.fontSize);
  if (!(fontPx > 0)) return fallbackRight;
  const canvas = documentObject.createElement("canvas");
  const extent = Math.max(64, Math.ceil(fontPx * 2.8));
  canvas.width = extent;
  canvas.height = extent;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallbackRight;
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  const origin = Math.round(fontPx * 0.8);
  ctx.fillText(glyph, origin, Math.round(fontPx * 1.5));
  const rgba = ctx.getImageData(0, 0, extent, extent).data;
  let right = -Infinity;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] >= 240) right = Math.max(right, ((i - 3) / 4) % extent);
  }
  const value = Number.isFinite(right) ? right - origin : fallbackRight;
  periodInkCache.set(key, value);
  return value;
}

/**
 * Center actual glyph ink against the viewport, not the CSS line box.
 * A zero-height inline baseline anchor plus Canvas TextMetrics keeps this
 * correction responsive to the browser's REAL loaded font metrics.
 * No OS/font-specific Y magic constants or per-frame screenshot access.
 */
export function centerClockInk(documentObject) {
  const root = documentObject.body;
  const block = documentObject.querySelector(".clock-block");
  const line = documentObject.querySelector(".time-line");
  const baseline = documentObject.querySelector(".clock-baseline-marker");
  const win = documentObject.defaultView;
  if (!root?.style || !block || !line || !baseline || !win) return false;

  // Always start with uncorrected geometry; otherwise each measurement
  // feeds back into its own previous translation.
  root.style.setProperty("--app-clock-ink-shift-x", "0px");
  root.style.setProperty("--app-clock-ink-shift-y", "0px");
  root.style.setProperty("--app-clock-prefix-shift", "0px");

  const style = win.getComputedStyle(block);
  const scale = Number.parseFloat(style.getPropertyValue("--app-clock-size-scale")) || 1;
  const ctx = documentObject.createElement("canvas").getContext("2d");
  if (!ctx) return false;
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.textBaseline = "alphabetic";
  const tracking = Number.parseFloat(style.letterSpacing) || 0;
  const blockRect = block.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();
  const baselineY = (baseline.getBoundingClientRect().top - blockRect.top) / scale;
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;

  // Measure individual glyphs at their DOM inline-span origin: unlike a
  // line-box rect this includes side bearings and font ascent/descent.
  // Character advances include resolved CSS letter-spacing.
  for (const selector of ["#hour", ".colon", "#minute"]) {
    const span = documentObject.querySelector(selector);
    if (!span?.textContent) continue;
    let cursor = (span.getBoundingClientRect().left - blockRect.left) / scale;
    for (const glyph of span.textContent) {
      const m = ctx.measureText(glyph);
      if (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent > 0) {
        left = Math.min(left, cursor - m.actualBoundingBoxLeft);
        right = Math.max(right, cursor + m.actualBoundingBoxRight);
        top = Math.min(top, baselineY - m.actualBoundingBoxAscent);
        bottom = Math.max(bottom, baselineY + m.actualBoundingBoxDescent);
      }
      cursor += m.width + tracking;
    }
  }
  if (!Number.isFinite(left) || !Number.isFinite(top)) return false;
  const shiftX = (blockRect.width / scale) / 2 - (left + right) / 2;
  const shiftY = (blockRect.height / scale) / 2 - (top + bottom) / 2;
  root.style.setProperty("--app-clock-ink-shift-x", `${shiftX.toFixed(3)}px`);
  root.style.setProperty("--app-clock-ink-shift-y", `${shiftY.toFixed(3)}px`);

  // Position ONLY the genuine leading period. Its visible rightmost ink
  // touches the visible left edge of the main digits, irrespective of
  // variable-width font bearings. It never contributes to digit centering.
  const prefix = documentObject.getElementById("clock-prefix");
  if (prefix && !prefix.hidden && prefix.textContent) {
    const period = ctx.measureText(prefix.textContent);
    if (period.actualBoundingBoxAscent + period.actualBoundingBoxDescent > 0) {
      const lineLeft = (lineRect.left - blockRect.left) / scale;
      const visiblePeriodRight = paintedPeriodRight(documentObject, style, prefix.textContent, period.actualBoundingBoxRight);
      const prefixX = left - lineLeft - visiblePeriodRight;
      root.style.setProperty("--app-clock-prefix-shift", `${prefixX.toFixed(3)}px`);
    }
  }
  return true;
}

export function createRenderer(documentObject) {
  const rootElement = documentObject.body;
  const elements = {
    prefix: documentObject.getElementById("clock-prefix"),
    hour: documentObject.getElementById("hour"),
    minute: documentObject.getElementById("minute"),
    seconds: documentObject.getElementById("seconds"),
    colon: documentObject.querySelector(".colon"),
    yearLine: documentObject.getElementById("wareki-line1"),
    dateLine: documentObject.getElementById("wareki-line2"),
    seikoku: documentObject.querySelector(".seikoku"),
    jishin: documentObject.querySelector(".jishin"),
    weather: documentObject.getElementById("weather"),
    moonPhase: documentObject.getElementById("moon-phase"),
    rokuyo: documentObject.getElementById("rokuyo"),
  };

  function setText(element, nextValue) {
    if (element && element.textContent !== nextValue) {
      element.textContent = nextValue;
    }
  }

  function setHtml(element, nextValue) {
    if (element && element.innerHTML !== nextValue) {
      element.innerHTML = nextValue;
    }
  }

  function setHidden(element, shouldHide) {
    if (element) {
      element.hidden = shouldHide;
    }
  }

  function applySettings(settings) {
    rootElement.style.setProperty("--app-background", settings.colors.background);
    rootElement.style.setProperty("--app-text", settings.colors.text);
    rootElement.style.setProperty("--app-clock", settings.colors.clock);
    const clockTypography = resolveClockTypography(settings);
    rootElement.style.setProperty("--app-clock-font", clockTypography.family);
    rootElement.style.setProperty(
      "--app-clock-font-weight",
      String(clockTypography.weight),
    );
    rootElement.style.setProperty(
      "--app-clock-size-scale",
      String(clockTypography.sizeScale),
    );
    rootElement.style.setProperty(
      "--app-clock-letter-spacing",
      `${clockTypography.letterSpacingEm}em`,
    );
    rootElement.style.setProperty(
      "--app-clock-secondary-letter-spacing",
      `${clockTypography.secondaryLetterSpacingEm}em`,
    );
    // Ink centering and original-font punctuation placement are measured
    // after the font loads rather than relying on fixed per-font offsets.
    rootElement.style.setProperty(
      "--app-text-font",
      TEXT_FONT_MAP.get(settings.typography.font) || TEXT_FONT_MAP.get("noto-sans"),
    );
    rootElement.dataset.writingMode = settings.typography.writingMode;
    rootElement.dataset.clockFont = settings.clock.font;
  }

  let geometryScheduled = false;
  function scheduleInkCenter() {
    const win = documentObject.defaultView;
    if (!win?.requestAnimationFrame || geometryScheduled) return;
    geometryScheduled = true;
    win.requestAnimationFrame(() => {
      geometryScheduled = false;
      centerClockInk(documentObject);
    });
  }
  documentObject.fonts?.addEventListener?.("loadingdone", () => {
    periodInkCache.clear();
    scheduleInkCenter();
  });
  documentObject.fonts?.ready?.then?.(scheduleInkCenter);
  documentObject.defaultView?.addEventListener?.("resize", scheduleInkCenter);

  function renderTime(timeView) {
    setText(elements.prefix, timeView.prefixText);
    setHidden(elements.prefix, !timeView.prefixText);
    setText(elements.hour, timeView.hourText);
    setText(elements.minute, timeView.minuteText);
    setText(elements.seconds, timeView.secondText);
    setText(elements.colon, timeView.separatorText);

    if (elements.seconds) {
      elements.seconds.hidden = !timeView.showSeconds;
    }

    if (elements.prefix) {
      elements.prefix.style.opacity = timeView.showPrefix ? "1" : "0";
    }

    if (elements.colon) {
      elements.colon.style.opacity = timeView.showColon ? "1" : "0";
    }
    scheduleInkCenter();
  }

  function render(viewModel, settings) {
    applySettings(settings);
    renderTime(viewModel.time);
    setText(elements.yearLine, viewModel.date.line1Text);
    setHtml(elements.dateLine, viewModel.date.line2Html);
    setText(elements.seikoku, viewModel.info.seikokuText);
    setText(elements.jishin, viewModel.info.jishinText);
    setText(elements.weather, viewModel.info.weatherText);
    setText(elements.moonPhase, viewModel.info.moonText);
    setText(elements.rokuyo, viewModel.info.rokuyoText);
    setHidden(elements.weather, !viewModel.info.showWeather);
    setHidden(elements.moonPhase, !viewModel.info.showMoon);
    setHidden(elements.rokuyo, !viewModel.info.showRokuyo);
  }

  return { render, renderTime };
}
