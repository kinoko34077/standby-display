import {
  CLOCK_FONT_OPTIONS,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  TEXT_FONT_OPTIONS,
} from "./constants.mjs";

const CLOCK_FONT_IDS = new Set(CLOCK_FONT_OPTIONS.map((option) => option.id));
const TEXT_FONT_IDS = new Set(TEXT_FONT_OPTIONS.map((option) => option.id));

export function cloneSettings(settings = DEFAULT_SETTINGS) {
  return JSON.parse(JSON.stringify(settings));
}

export function createDefaultUiState() {
  return {
    settingsOpen: false,
    settingsView: "fullscreen",
    triggerVisible: true,
    statusMessage: "",
  };
}

export function loadStoredSettings(storage) {
  try {
    const rawSettings = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return null;
    }
    return sanitizeSettings(JSON.parse(rawSettings));
  } catch (error) {
    console.warn("Settings load failed", error);
    return null;
  }
}

export function saveSettings(storage, settings) {
  try {
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(sanitizeSettings(settings)),
    );
  } catch (error) {
    console.warn("Settings save failed", error);
  }
}

export function parseSettingsFromSearch(search) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const partialSettings = {};

  if (params.has("sec")) {
    assign(partialSettings, "clock", "showSeconds", params.get("sec") === "1");
  }

  if (params.has("hour")) {
    assign(partialSettings, "clock", "hourFormat", params.get("hour"));
  }

  if (params.has("clockfont")) {
    assign(partialSettings, "clock", "font", params.get("clockfont"));
  }

  if (params.has("cal")) {
    assign(partialSettings, "calendar", "yearSystem", params.get("cal"));
  }

  if (params.has("char")) {
    assign(partialSettings, "calendar", "characterStyle", params.get("char"));
  }

  if (params.has("write")) {
    assign(
      partialSettings,
      "typography",
      "writingMode",
      params.get("write") === "v" ? "vertical" : "horizontal",
    );
  }

  if (params.has("font")) {
    assign(partialSettings, "typography", "font", params.get("font"));
  }

  if (params.has("weather")) {
    assign(
      partialSettings,
      "visibility",
      "weather",
      params.get("weather") === "1",
    );
  }

  if (params.has("moon")) {
    assign(partialSettings, "visibility", "moon", params.get("moon") === "1");
  }

  if (params.has("rokuyo")) {
    assign(
      partialSettings,
      "visibility",
      "rokuyo",
      params.get("rokuyo") === "1",
    );
  }

  if (params.has("bg")) {
    assign(partialSettings, "colors", "background", `#${params.get("bg")}`);
  }

  if (params.has("text")) {
    assign(partialSettings, "colors", "text", `#${params.get("text")}`);
  }

  if (params.has("clock")) {
    assign(partialSettings, "colors", "clock", `#${params.get("clock")}`);
  }

  if (Object.keys(partialSettings).length === 0) {
    return null;
  }

  return sanitizeSettings(partialSettings);
}

export function buildSettingsSearch(settings) {
  const current = sanitizeSettings(settings);
  const params = new URLSearchParams();

  appendSetting(params, "sec", current.clock.showSeconds, (value) => (value ? "1" : "0"));
  appendSetting(params, "hour", current.clock.hourFormat, String);
  appendSetting(params, "clockfont", current.clock.font, String);
  appendSetting(params, "cal", current.calendar.yearSystem, String);
  appendSetting(params, "char", current.calendar.characterStyle, String);
  appendSetting(
    params,
    "write",
    current.typography.writingMode,
    (value) => (value === "vertical" ? "v" : "h"),
  );
  appendSetting(params, "font", current.typography.font, String);
  appendSetting(params, "weather", current.visibility.weather, (value) => (value ? "1" : "0"));
  appendSetting(params, "moon", current.visibility.moon, (value) => (value ? "1" : "0"));
  appendSetting(params, "rokuyo", current.visibility.rokuyo, (value) => (value ? "1" : "0"));
  appendSetting(params, "bg", current.colors.background, stripHash);
  appendSetting(params, "text", current.colors.text, stripHash);
  appendSetting(params, "clock", current.colors.clock, stripHash);

  return params.toString();
}

export function buildShareUrl(settings, locationObject) {
  const shareUrl = new URL(locationObject.href);
  shareUrl.search = buildSettingsSearch(settings);
  return shareUrl.toString();
}

export function sanitizeSettings(partialSettings) {
  const merged = cloneSettings(DEFAULT_SETTINGS);
  mergeInto(merged, partialSettings);

  return {
    clock: {
      showSeconds: Boolean(merged.clock.showSeconds),
      hourFormat: merged.clock.hourFormat === "12" ? "12" : "24",
      font: CLOCK_FONT_IDS.has(merged.clock.font) ? merged.clock.font : DEFAULT_SETTINGS.clock.font,
    },
    calendar: {
      yearSystem:
        merged.calendar.yearSystem === "western" ? "western" : "wareki",
      characterStyle:
        merged.calendar.characterStyle === "old" ? "old" : "new",
    },
    typography: {
      writingMode:
        merged.typography.writingMode === "vertical"
          ? "vertical"
          : "horizontal",
      font: TEXT_FONT_IDS.has(merged.typography.font)
        ? merged.typography.font
        : DEFAULT_SETTINGS.typography.font,
    },
    visibility: {
      weather: Boolean(merged.visibility.weather),
      moon: Boolean(merged.visibility.moon),
      rokuyo: Boolean(merged.visibility.rokuyo),
    },
    colors: {
      background: normalizeColor(
        merged.colors.background,
        DEFAULT_SETTINGS.colors.background,
      ),
      text: normalizeColor(merged.colors.text, DEFAULT_SETTINGS.colors.text),
      clock: normalizeColor(merged.colors.clock, DEFAULT_SETTINGS.colors.clock),
    },
  };
}

function assign(target, group, key, value) {
  if (!target[group]) {
    target[group] = {};
  }
  target[group][key] = value;
}

function appendSetting(params, key, currentValue, formatValue) {
  params.set(key, formatValue(currentValue));
}

function mergeInto(target, source) {
  if (!source || typeof source !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      mergeInto(target[key], value);
      continue;
    }

    target[key] = value;
  }
}

function normalizeColor(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  const sixDigitHex = normalized.match(/^#?([0-9a-fA-F]{6})$/);
  if (sixDigitHex) {
    return `#${sixDigitHex[1].toLowerCase()}`;
  }

  const threeDigitHex = normalized.match(/^#?([0-9a-fA-F]{3})$/);
  if (threeDigitHex) {
    return `#${threeDigitHex[1]
      .split("")
      .map((digit) => digit + digit)
      .join("")
      .toLowerCase()}`;
  }

  return fallback;
}

function stripHash(value) {
  return value.replace(/^#/, "");
}
