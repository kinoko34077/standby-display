import { CLOCK_FONT_OPTIONS, TEXT_FONT_OPTIONS } from "./constants.mjs";

const CLOCK_FONT_MAP = new Map(
  CLOCK_FONT_OPTIONS.map((option) => [option.id, option.family]),
);
const TEXT_FONT_MAP = new Map(
  TEXT_FONT_OPTIONS.map((option) => [option.id, option.family]),
);

export function createRenderer(documentObject) {
  const rootElement = documentObject.body;
  const elements = {
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
    rootElement.style.setProperty(
      "--app-clock-font",
      CLOCK_FONT_MAP.get(settings.clock.font) || CLOCK_FONT_MAP.get("d7"),
    );
    rootElement.style.setProperty(
      "--app-text-font",
      TEXT_FONT_MAP.get(settings.typography.font) || TEXT_FONT_MAP.get("noto-sans"),
    );
    rootElement.dataset.writingMode = settings.typography.writingMode;
  }

  function renderTime(timeView) {
    setText(elements.hour, timeView.hourText);
    setText(elements.minute, timeView.minuteText);
    setText(elements.seconds, timeView.secondText);

    if (elements.seconds) {
      elements.seconds.hidden = !timeView.showSeconds;
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
