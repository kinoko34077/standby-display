import {
  CLOCK_FONT_OPTIONS,
  CLOCK_LETTER_SPACING_CONTROL,
  CLOCK_SIZE_CONTROL,
  TEXT_FONT_OPTIONS,
} from "./constants.mjs";
import {
  CLOCK_SYSTEM_OPTIONS,
  clockSystemSupportsLetterCase,
  clockSystemUsesHourFormat,
} from "./time-systems.mjs";
import {
  createColorPickers,
  createRandomColorControls,
  renderColorPickers,
  renderRandomColorControls,
} from "./color-controls.mjs";

export const SETTINGS_CATEGORIES = ["clock", "notation", "display", "color", "system"];
const SETTINGS_NARROW_QUERY = "(max-width: 800px)";

export function createSettingsUi(documentObject, callbacks, colorPickerLibrary = globalThis.iro) {
  const overlay = documentObject.getElementById("settings-overlay");
  const triggerLayer = documentObject.querySelector(".settings-trigger-layer");
  const triggerButton = documentObject.getElementById("settings-open");
  const closeButton = documentObject.getElementById("settings-close");
  const copyUrlButton = documentObject.getElementById("settings-copy-url");
  const resetButton = documentObject.getElementById("settings-reset");
  const statusElement = documentObject.getElementById("settings-status");
  const locationStatusElement = documentObject.getElementById("location-status");
  const locationRetryButton = documentObject.getElementById("location-retry");
  const hourFormatHelp = documentObject.getElementById("hour-format-help");
  const uppercaseHelp = documentObject.getElementById("uppercase-help");
  const settingsContent = documentObject.getElementById("settings-content");
  const categoryButtons = Array.from(
    documentObject.querySelectorAll("[data-settings-category]"),
  );
  const categoryPanes = Array.from(
    documentObject.querySelectorAll("[data-settings-pane]"),
  );
  const mainLayout = documentObject.querySelector(".main-layout");
  const rootElement = documentObject.body;
  const narrowMedia = documentObject.defaultView?.matchMedia?.(
    SETTINGS_NARROW_QUERY,
  );

  const controls = {
    showSeconds: documentObject.getElementById("setting-clock-seconds"),
    timeSystem: documentObject.getElementById("setting-clock-system"),
    uppercaseDigits: documentObject.getElementById("setting-clock-uppercase"),
    fastBlink: documentObject.getElementById("setting-clock-fast-blink"),
    clockFont: documentObject.getElementById("setting-clock-font"),
    clockSize: documentObject.getElementById("setting-clock-size"),
    clockSizeValue: documentObject.getElementById("setting-clock-size-value"),
    clockLetterSpacing: documentObject.getElementById("setting-clock-letter-spacing"),
    clockLetterSpacingValue: documentObject.getElementById("setting-clock-letter-spacing-value"),
    textFont: documentObject.getElementById("setting-text-font"),
    weather: documentObject.getElementById("setting-visibility-weather"),
    moon: documentObject.getElementById("setting-visibility-moon"),
    rokuyo: documentObject.getElementById("setting-visibility-rokuyo"),
    backgroundColor: documentObject.getElementById("setting-color-background"),
    backgroundColorValue: documentObject.getElementById(
      "setting-color-background-value",
    ),
    textColor: documentObject.getElementById("setting-color-text"),
    textColorValue: documentObject.getElementById("setting-color-text-value"),
    clockColor: documentObject.getElementById("setting-color-clock"),
    clockColorValue: documentObject.getElementById("setting-color-clock-value"),
    dailyRandomColors: documentObject.getElementById("setting-random-colors"),
    randomBackground: documentObject.getElementById("setting-random-background"),
  };

  const randomControls = createRandomColorControls(documentObject);
  const colorPickers = createColorPickers(documentObject, colorPickerLibrary, {
    background: controls.backgroundColor,
    text: controls.textColor,
    clock: controls.clockColor,
  }, callbacks);

  populateFontSelect(controls.timeSystem, CLOCK_SYSTEM_OPTIONS);
  populateFontSelect(controls.clockFont, CLOCK_FONT_OPTIONS);
  populateFontSelect(controls.textFont, TEXT_FONT_OPTIONS);
  const numericBindings = [
    bindNumericRangeControl(controls.clockSize, controls.clockSizeValue, CLOCK_SIZE_CONTROL, 100, value =>
      callbacks.onSettingChange({ group: "clock", key: "sizePercent", value })),
    bindNumericRangeControl(controls.clockLetterSpacing, controls.clockLetterSpacingValue,
      CLOCK_LETTER_SPACING_CONTROL, 0, value =>
        callbacks.onSettingChange({ group: "clock", key: "letterSpacingEm", value })),
  ];

  const confirmReset = () => {
    const confirmFunction = documentObject.defaultView?.confirm;
    if (typeof confirmFunction !== "function") {
      return false;
    }
    return confirmFunction.call(
      documentObject.defaultView,
      "設定を初期化して既定値へ戻します。よろしいですか？",
    );
  };

  triggerButton.addEventListener("click", callbacks.onOpen);
  copyUrlButton.addEventListener("click", callbacks.onCopyUrl);
  resetButton.addEventListener("click", () => {
    if (confirmReset()) {
      callbacks.onReset();
    }
  });
  locationRetryButton?.addEventListener("click", callbacks.onRetryLocation);

  let settingsOpen = false;
  let activeCategory = SETTINGS_CATEGORIES[0];
  const categoryScrollPositions = new Map();

  function syncCategoryPresentation({ restoreScroll = false } = {}) {
    for (const button of categoryButtons) {
      const isActive = button.dataset.settingsCategory === activeCategory;
      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    }

    for (const pane of categoryPanes) {
      pane.hidden = pane.dataset.settingsPane !== activeCategory;
    }

    if (restoreScroll && settingsContent) {
      settingsContent.scrollTop =
        categoryScrollPositions.get(activeCategory) ?? 0;
    }
  }

  function rememberCurrentScroll() {
    if (settingsContent) {
      categoryScrollPositions.set(activeCategory, settingsContent.scrollTop);
    }
  }

  function selectCategory(nextCategory) {
    if (!SETTINGS_CATEGORIES.includes(nextCategory)) {
      return;
    }

    rememberCurrentScroll();
    activeCategory = nextCategory;
    syncCategoryPresentation({ restoreScroll: true });
  }

  function requestClose() {
    rememberCurrentScroll();
    callbacks.onClose();
  }

  for (const button of categoryButtons) {
    button.addEventListener("click", () => {
      selectCategory(button.dataset.settingsCategory);
    });
  }

  closeButton.addEventListener("click", requestClose);

  documentObject.addEventListener("keydown", (event) => {
    if (settingsOpen && event.key === "Escape") {
      requestClose();
    }
  });

  function syncBackgroundInteractivity() {
    const narrow = Boolean(narrowMedia?.matches);
    rootElement.dataset.settingsLayout = narrow ? "narrow" : "wide";

    if (mainLayout) {
      const focusWasInMain = mainLayout.contains(documentObject.activeElement);
      mainLayout.inert = settingsOpen && narrow;
      if (settingsOpen && narrow && focusWasInMain) {
        closeButton.focus();
      }
    }
  }

  narrowMedia?.addEventListener?.("change", syncBackgroundInteractivity);
  syncCategoryPresentation();

  controls.showSeconds.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "clock",
      key: "showSeconds",
      value: event.target.checked,
    });
  });

  controls.timeSystem.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "clock",
      key: "timeSystem",
      value: event.target.value,
    });
  });

  controls.uppercaseDigits.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "clock",
      key: "uppercaseDigits",
      value: event.target.checked,
    });
  });

  controls.fastBlink.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "clock",
      key: "fastBlink",
      value: event.target.checked,
    });
  });

  controls.clockFont.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "clock",
      key: "font",
      value: event.target.value,
    });
  });

  controls.textFont.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "typography",
      key: "font",
      value: event.target.value,
    });
  });

  controls.weather.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "visibility",
      key: "weather",
      value: event.target.checked,
    });
  });

  controls.moon.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "visibility",
      key: "moon",
      value: event.target.checked,
    });
  });

  controls.rokuyo.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "visibility",
      key: "rokuyo",
      value: event.target.checked,
    });
  });

  bindRadioGroup(documentObject, "hour-format", (value) => {
    callbacks.onSettingChange({ group: "clock", key: "hourFormat", value });
  });
  bindRadioGroup(documentObject, "year-system", (value) => {
    callbacks.onSettingChange({ group: "calendar", key: "yearSystem", value });
  });
  bindRadioGroup(documentObject, "character-style", (value) => {
    callbacks.onSettingChange({
      group: "calendar",
      key: "characterStyle",
      value,
    });
  });
  bindRadioGroup(documentObject, "writing-mode", (value) => {
    callbacks.onSettingChange({
      group: "typography",
      key: "writingMode",
      value,
    });
  });

  controls.dailyRandomColors.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "randomColors",
      key: "enabled",
      value: event.target.checked,
    });
  });

  controls.randomBackground.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "randomColors",
      key: "background",
      value: event.target.checked,
    });
  });

  for (const [target, fields] of Object.entries(randomControls)) {
    for (const [field, input] of Object.entries(fields)) {
      input.addEventListener("input", (event) => {
        callbacks.onSettingChange({
          group: "randomColors",
          key: target,
          field,
          value: Number(event.target.value),
        });
      });
    }
  }

  let wasOpen = false;

  function render(settings, uiState) {
    settingsOpen = uiState.settingsOpen;
    overlay.hidden = !settingsOpen;
    const shouldShowTrigger = !settingsOpen && uiState.triggerVisible;
    triggerLayer.hidden = !shouldShowTrigger;
    triggerLayer.setAttribute("aria-hidden", shouldShowTrigger ? "false" : "true");
    rootElement.dataset.settingsOpen = settingsOpen ? "true" : "false";
    syncBackgroundInteractivity();
    statusElement.textContent = uiState.statusMessage;

    if (locationStatusElement) {
      locationStatusElement.textContent = uiState.locationStatusMessage ?? "";
      locationStatusElement.dataset.status = uiState.locationStatus ?? "idle";
    }
    if (locationRetryButton) {
      locationRetryButton.hidden = uiState.locationStatus !== "error";
      locationRetryButton.disabled = uiState.locationStatus === "loading";
    }

    controls.showSeconds.checked = settings.clock.showSeconds;
    controls.timeSystem.value = settings.clock.timeSystem;
    controls.uppercaseDigits.checked = settings.clock.uppercaseDigits;
    controls.fastBlink.checked = settings.clock.fastBlink;
    const uppercaseDisabled =
      !clockSystemSupportsLetterCase(settings.clock.timeSystem);
    controls.uppercaseDigits.disabled = uppercaseDisabled;
    controls.uppercaseDigits
      .closest(".control-row")
      ?.classList.toggle("is-disabled", uppercaseDisabled);
    if (uppercaseHelp) {
      uppercaseHelp.hidden = !uppercaseDisabled;
    }
    controls.clockFont.value = settings.clock.font;
    numericBindings[0].render(settings.clock.sizePercent, documentObject.activeElement);
    numericBindings[1].render(settings.clock.letterSpacingEm, documentObject.activeElement);
    controls.textFont.value = settings.typography.font;
    controls.weather.checked = settings.visibility.weather;
    controls.moon.checked = settings.visibility.moon;
    controls.rokuyo.checked = settings.visibility.rokuyo;
    controls.backgroundColor.value = settings.colors.background;
    controls.textColor.value = settings.colors.text;
    controls.clockColor.value = settings.colors.clock;
    controls.backgroundColorValue.textContent = settings.colors.background;
    controls.textColorValue.textContent = settings.colors.text;
    controls.clockColorValue.textContent = settings.colors.clock;
    controls.dailyRandomColors.checked = settings.randomColors.enabled;
    controls.randomBackground.checked = settings.randomColors.background;

    renderColorPickers(colorPickers, settings.colors);
    renderRandomColorControls(randomControls, settings.randomColors, documentObject);

    setRadioValue(documentObject, "hour-format", settings.clock.hourFormat);
    const hourFormatDisabled =
      !clockSystemUsesHourFormat(settings.clock.timeSystem);
    for (const input of documentObject.querySelectorAll('input[name="hour-format"]')) {
      input.disabled = hourFormatDisabled;
    }
    if (hourFormatHelp) {
      hourFormatHelp.hidden = !hourFormatDisabled;
    }
    setRadioValue(documentObject, "year-system", settings.calendar.yearSystem);
    setRadioValue(
      documentObject,
      "character-style",
      settings.calendar.characterStyle,
    );
    setRadioValue(
      documentObject,
      "writing-mode",
      settings.typography.writingMode,
    );

    if (settingsOpen && !wasOpen) {
      syncCategoryPresentation({ restoreScroll: true });
      closeButton.focus();
    } else if (!settingsOpen && wasOpen) {
      triggerButton.focus();
    }

    wasOpen = settingsOpen;
  }

  return { render };
}

function bindRadioGroup(documentObject, name, onChange) {
  const inputs = documentObject.querySelectorAll(`input[name="${name}"]`);
  for (const input of inputs) {
    input.addEventListener("change", (event) => {
      if (event.target.checked) {
        onChange(event.target.value);
      }
    });
  }
}

/**
 * Shared clock numeric field controller: one value for slider and editable
 * number input, with native keyboard access, constrained commit and gentle
 * snapping to the semantic default while dragging.
 */
export function bindNumericRangeControl(slider, field, config, defaultValue, onValue) {
  for (const control of [slider, field]) {
    control.min = String(config.min);
    control.max = String(config.max);
    control.step = String(config.step);
  }
  const digits = Math.max(0, String(config.step).split(".")[1]?.length ?? 0);
  const clamp = value => Math.min(config.max, Math.max(config.min, value));
  const round = value => Number(clamp(value).toFixed(digits));
  let committed = defaultValue;
  let pointerSliding = false;
  slider.addEventListener("pointerdown", () => { pointerSliding = true; });
  slider.addEventListener("pointerup", () => { pointerSliding = false; });
  slider.addEventListener("pointercancel", () => { pointerSliding = false; });
  slider.addEventListener("blur", () => { pointerSliding = false; });
  const publish = value => {
    committed = round(value);
    slider.value = String(committed);
    field.value = String(committed);
    onValue(committed);
  };
  slider.addEventListener("input", () => {
    const value = Number(slider.value);
    // A gentle one-step magnetic target, only while sliding. Direct numeric
    // entry retains all valid values including small nonzero increments.
    const snapped = pointerSliding && Math.abs(value - defaultValue) <= config.step * 1.05
      ? defaultValue : value;
    publish(snapped);
  });
  const commit = () => {
    const trimmed = field.value.trim();
    const parsed = trimmed === "" ? NaN : Number(trimmed);
    publish(Number.isFinite(parsed) ? parsed : committed);
  };
  field.addEventListener("change", commit);
  field.addEventListener("blur", () => {
    if (field.value.trim() === "" || !Number.isFinite(Number(field.value))) commit();
  });
  field.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      commit();
      field.blur();
    } else if (event.key === "Escape") {
      field.value = String(committed);
      field.blur();
    }
  });
  return {
    render(value, activeElement) {
      committed = round(value);
      slider.value = String(committed);
      // Don't rewrite the in-progress partial value under the user's cursor.
      if (activeElement !== field) field.value = String(committed);
    },
  };
}

function populateFontSelect(selectElement, options) {
  selectElement.innerHTML = options
    .map((option) => `<option value="${option.id}">${option.label}</option>`)
    .join("");
}

function setRadioValue(documentObject, name, value) {
  const targetInput = documentObject.querySelector(
    `input[name="${name}"][value="${value}"]`,
  );
  if (targetInput) {
    targetInput.checked = true;
  }
}
