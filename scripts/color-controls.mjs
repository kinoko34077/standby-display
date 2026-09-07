const HUE_RANGE_GRADIENT =
  "linear-gradient(90deg, #ff0000 0%, #ffff00 16.7%, #00ff00 33.3%, #00ffff 50%, #0000ff 66.7%, #ff00ff 83.3%, #ff0000 100%)";

export function createRandomColorControls(documentObject) {
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

export function renderRandomColorControls(controls, settings, documentObject) {
  for (const [target, fields] of Object.entries(controls)) {
    const range = settings[target];
    for (const [field, input] of Object.entries(fields)) {
      input.value = range[field];
      input.style.setProperty(
        "--range-track",
        field.startsWith("hue")
          ? HUE_RANGE_GRADIENT
          : createLightnessGradient(range, target),
      );
    }

    const prefix = target === "backgroundRange" ? "background" : target;
    documentObject.getElementById(`setting-random-${prefix}-hue-value`).textContent =
      `${range.hueMin}°〜${range.hueMax}°`;
    documentObject.getElementById(
      `setting-random-${prefix}-lightness-value`,
    ).textContent = `${range.lightnessMin}%〜${range.lightnessMax}%`;
  }
}

export function createColorPickers(
  documentObject,
  colorPickerLibrary,
  inputs,
  callbacks,
) {
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

export function renderColorPickers(bindings, colors) {
  for (const [target, binding] of Object.entries(bindings)) {
    const nextValue = colors[target];
    binding.input.value = nextValue;
    if (
      binding.picker &&
      binding.picker.color.hexString.toLowerCase() !== nextValue
    ) {
      binding.picker.color.hexString = nextValue;
    }
  }
}

function createLightnessGradient(range, target) {
  const hue = Math.round((range.hueMin + range.hueMax) / 2);
  const saturation = target === "backgroundRange" ? 58 : 72;
  return `linear-gradient(90deg, hsl(${hue} ${saturation}% 3%), hsl(${hue} ${saturation}% 50%), hsl(${hue} ${saturation}% 97%))`;
}

function bindColorControl(element, onChange) {
  const handler = (event) => {
    onChange(event.target.value);
  };
  element.addEventListener("input", handler);
  element.addEventListener("change", handler);
}
