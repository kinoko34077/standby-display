import { CLOCK_FONT_OPTIONS, TEXT_FONT_OPTIONS } from "./constants.mjs";

export function createSettingsUi(documentObject, callbacks, colorPickerLibrary = globalThis.iro) {
  const overlay = documentObject.getElementById("settings-overlay");
  const triggerLayer = documentObject.querySelector(".settings-trigger-layer");
  const triggerButton = documentObject.getElementById("settings-open");
  const closeButton = documentObject.getElementById("settings-close");
  const viewToggleButton = documentObject.getElementById("settings-view-toggle");
  const copyUrlButton = documentObject.getElementById("settings-copy-url");
  const resetButton = documentObject.getElementById("settings-reset");
  const statusElement = documentObject.getElementById("settings-status");
  const rootElement = documentObject.body;

  const controls = {
    showSeconds: documentObject.getElementById("setting-clock-seconds"),
    clockFont: documentObject.getElementById("setting-clock-font"),
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

  populateFontSelect(controls.clockFont, CLOCK_FONT_OPTIONS);
  populateFontSelect(controls.textFont, TEXT_FONT_OPTIONS);

  triggerButton.addEventListener("click", callbacks.onOpen);
  closeButton.addEventListener("click", callbacks.onClose);
  viewToggleButton.addEventListener("click", callbacks.onToggleView);
  copyUrlButton.addEventListener("click", callbacks.onCopyUrl);
  resetButton.addEventListener("click", callbacks.onReset);

  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      callbacks.onClose();
      return;
    }

    if (event.key === "Tab") {
      trapFocus(event, overlay);
    }
  });

  controls.showSeconds.addEventListener("change", (event) => {
    callbacks.onSettingChange({
      group: "clock",
      key: "showSeconds",
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
    overlay.hidden = !uiState.settingsOpen;
    overlay.dataset.view = uiState.settingsView;
    const shouldShowTrigger = !uiState.settingsOpen && uiState.triggerVisible;
    triggerLayer.hidden = !shouldShowTrigger;
    triggerLayer.setAttribute("aria-hidden", shouldShowTrigger ? "false" : "true");
    rootElement.dataset.settingsOpen = uiState.settingsOpen ? "true" : "false";
    viewToggleButton.textContent =
      uiState.settingsView === "fullscreen" ? "部分" : "全画面";
    viewToggleButton.setAttribute(
      "aria-label",
      uiState.settingsView === "fullscreen" ? "部分表示へ切替" : "全画面表示へ切替",
    );
    statusElement.textContent = uiState.statusMessage;

    controls.showSeconds.checked = settings.clock.showSeconds;
    controls.clockFont.value = settings.clock.font;
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

    if (uiState.settingsOpen && !wasOpen) {
      closeButton.focus();
    } else if (!uiState.settingsOpen && wasOpen) {
      triggerButton.focus();
    }

    wasOpen = uiState.settingsOpen;
  }

  return { render };
}

function createRandomColorControls(documentObject) {
  const createTarget = (prefix) => ({
    hueMin: documentObject.getElementById(`setting-random-${prefix}-hue-min`),
    hueMax: documentObject.getElementById(`setting-random-${prefix}-hue-max`),
    lightnessMin: documentObject.getElementById(
      `setting-random-${prefix}-lightness-min`,
    ),
    lightnessMax: documentObject.getElementById(
      `setting-random-${prefix}-lightness-max`,
    ),
  });

  return {
    clock: createTarget("clock"),
    text: createTarget("text"),
    backgroundRange: createTarget("background"),
  };
}

function renderRandomColorControls(controls, settings, documentObject) {
  for (const [target, fields] of Object.entries(controls)) {
    const range = settings[target];
    for (const [field, input] of Object.entries(fields)) {
      input.value = range[field];
    }

    const prefix = target === "backgroundRange" ? "background" : target;
    documentObject.getElementById(`setting-random-${prefix}-hue-value`).textContent =
      `${range.hueMin}°〜${range.hueMax}°`;
    documentObject.getElementById(
      `setting-random-${prefix}-lightness-value`,
    ).textContent = `${range.lightnessMin}%〜${range.lightnessMax}%`;
  }
}

function createColorPickers(documentObject, colorPickerLibrary, inputs, callbacks) {
  const bindings = {};

  for (const [target, input] of Object.entries(inputs)) {
    const pickerContainer = documentObject.getElementById(`color-picker-${target}`);
    const onChange = (value) => {
      callbacks.onSettingChange({
        group: "colors",
        key: target,
        value,
      });
    };

    if (!colorPickerLibrary?.ColorPicker || !pickerContainer) {
      if (pickerContainer) {
        pickerContainer.hidden = true;
      }
      bindColorControl(input, onChange);
      bindings[target] = { input, picker: null };
      continue;
    }

    try {
      const picker = new colorPickerLibrary.ColorPicker(pickerContainer, {
        width: 136,
        color: input.value,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
        padding: 5,
        handleRadius: 8,
        layout: [
          { component: colorPickerLibrary.ui.Wheel },
          {
            component: colorPickerLibrary.ui.Slider,
            options: { sliderType: "value" },
          },
        ],
      });
      input.hidden = true;
      picker.on("color:change", (color) => {
        const nextValue = color.hexString.toLowerCase();
        input.value = nextValue;
        onChange(nextValue);
      });
      bindings[target] = { input, picker };
    } catch (error) {
      console.warn("Color picker setup failed", error);
      pickerContainer.hidden = true;
      bindColorControl(input, onChange);
      bindings[target] = { input, picker: null };
    }
  }

  return bindings;
}

function renderColorPickers(bindings, colors) {
  for (const [target, binding] of Object.entries(bindings)) {
    const nextValue = colors[target];
    binding.input.value = nextValue;
    if (binding.picker && binding.picker.color.hexString.toLowerCase() !== nextValue) {
      binding.picker.color.hexString = nextValue;
    }
  }
}

function bindColorControl(element, onChange) {
  const handler = (event) => {
    onChange(event.target.value);
  };
  element.addEventListener("input", handler);
  element.addEventListener("change", handler);
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

function trapFocus(event, rootElement) {
  const focusableElements = Array.from(
    rootElement.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hidden);

  if (focusableElements.length === 0) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = rootElement.ownerDocument.activeElement;

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}
