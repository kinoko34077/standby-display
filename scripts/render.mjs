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
  return {
    family: option.family,
    weight: option.weight,
    sizeScale: roundMetric(option.normalization.sizeScale * userScale, 4),
    letterSpacingEm: roundMetric(
      option.normalization.trackingEm + settings.clock.letterSpacingEm,
      3,
    ),
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
    rootElement.style.setProperty(
      "--app-text-font",
      TEXT_FONT_MAP.get(settings.typography.font) || TEXT_FONT_MAP.get("noto-sans"),
    );
    rootElement.dataset.writingMode = settings.typography.writingMode;
  }

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
