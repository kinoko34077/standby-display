export const DEFAULT_SETTINGS = Object.freeze({
  clock: {
    showSeconds: true,
    hourFormat: "24",
    font: "d7",
    timeSystem: "civil",
    uppercaseDigits: false,
    fastBlink: false,
    sizePercent: 100,
    letterSpacingEm: 0,
  },
  calendar: {
    yearSystem: "wareki",
    characterStyle: "new",
  },
  typography: {
    writingMode: "horizontal",
    font: "noto-sans",
  },
  visibility: {
    weather: true,
    moon: true,
    rokuyo: true,
  },
  colors: {
    background: "#050505",
    text: "#f1ede4",
    clock: "#70b8ff",
  },
  randomColors: {
    enabled: false,
    background: false,
    revision: 0,
    clock: {
      hueMin: 190,
      hueMax: 220,
      lightnessMin: 62,
      lightnessMax: 82,
    },
    text: {
      hueMin: 28,
      hueMax: 58,
      lightnessMin: 82,
      lightnessMax: 96,
    },
    backgroundRange: {
      hueMin: 205,
      hueMax: 245,
      lightnessMin: 3,
      lightnessMax: 9,
    },
  },
});

export const DEFAULT_SUPPLEMENTAL_DATA = Object.freeze({
  weatherText: "⛅--℃",
  moonEmoji: "◐",
  rokuyoText: "未取得",
});

export const CLOCK_SYNC_INTERVAL_MS = 60 * 60 * 1000;
export const DATA_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
export const LOCATION_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
export const API_REQUEST_TIMEOUT_MS = 8000;
export const WEATHER_CACHE_LOCATION_TOLERANCE = 0.01;
export const WEATHER_CACHE_KEY = "standby-display:weather-cache";
export const SETTINGS_STORAGE_KEY = "standby-display:settings";
export const STATUS_MESSAGE_TIMEOUT_MS = 2200;

export const CLOCK_SIZE_CONTROL = Object.freeze({
  min: 60,
  max: 140,
  step: 1,
});

export const CLOCK_LETTER_SPACING_CONTROL = Object.freeze({
  min: -0.25,
  max: 0.25,
  step: 0.01,
});

export const WEATHER_ICON_MAP = Object.freeze({
  Clear: "☀",
  Clouds: "☁",
  Rain: "🌧",
  Snow: "❄",
  Thunderstorm: "⛈",
  Drizzle: "🌦",
  Mist: "🌫",
});

export const MOON_PHASE_EMOJIS = Object.freeze([
  { maxAge: 1.5, value: "🌑" },
  { maxAge: 6.5, value: "🌒" },
  { maxAge: 8.5, value: "🌓" },
  { maxAge: 13.5, value: "🌔" },
  { maxAge: 15.5, value: "🌕" },
  { maxAge: 21.5, value: "🌖" },
  { maxAge: 23.5, value: "🌗" },
  { maxAge: 28, value: "🌘" },
]);

export const CLOCK_FONT_OPTIONS = Object.freeze([
  // Normalization basis: the accepted segmented-clock reference box.
  // The legacy id "d7" is retained for persisted settings/URL compatibility,
  // but now resolves to the openly licensed DSEG7 Modern family.
  {
    id: "d7",
    label: "DSEG7 Modern",
    family: "\"DSEG7-Modern\", \"DSEG7-Classic-MINI\", \"Rajdhani\", sans-serif",
    weight: 400,
    normalization: Object.freeze({
      sizeScale: 0.655,
      trackingEm: -0.081,
      secondaryTrackingEm: 0,
      prefixShiftEm: 0.015,
    }),
  },
  {
    id: "dseg7-classic-mini-bold",
    label: "DSEG7 Classic Mini Bold",
    family: "\"DSEG7-Classic-MINI\", \"Rajdhani\", sans-serif",
    weight: 700,
    normalization: Object.freeze({
      sizeScale: 0.655,
      trackingEm: -0.081,
      secondaryTrackingEm: 0,
      prefixShiftEm: 0.015,
    }),
  },
  {
    id: "rajdhani",
    label: "Rajdhani",
    family: "\"Rajdhani\", sans-serif",
    weight: 500,
    normalization: Object.freeze({
      sizeScale: 1.018,
      trackingEm: -0.07,
      prefixShiftEm: 0.11,
    }),
  },
  {
    id: "mono",
    label: "Monospace",
    family: "\"IBM Plex Mono\", Consolas, monospace",
    weight: 400,
    normalization: Object.freeze({
      sizeScale: 0.907,
      trackingEm: -0.183,
      prefixShiftEm: 0.27,
    }),
  },
]);

export const TEXT_FONT_OPTIONS = Object.freeze([
  {
    id: "noto-sans",
    label: "Noto Sans JP",
    family: "\"Noto Sans JP\", \"Hiragino Sans\", \"Yu Gothic\", sans-serif",
  },
  {
    id: "biz-ud",
    label: "BIZ UD Gothic",
    family: "\"BIZ UDPGothic\", \"Yu Gothic\", sans-serif",
  },
  {
    id: "serif",
    label: "和文明朝",
    family: "\"Yu Mincho\", \"Hiragino Mincho ProN\", serif",
  },
]);

export const ERA_YEAR_OFFSET = 2018;
export const ERA_NAME = "令和";

export const JAPANESE_MONTHS = Object.freeze([
  "睦月",
  "如月",
  "弥生",
  "卯月",
  "皐月",
  "水無月",
  "文月",
  "葉月",
  "長月",
  "神無月",
  "霜月",
  "師走",
]);

export const JAPANESE_WEEKDAYS = Object.freeze([
  "日",
  "月",
  "火",
  "水",
  "木",
  "金",
  "土",
]);

export const KANJI_DIGITS = Object.freeze([
  "〇",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
]);

export const SEIKOKU_NAMES = Object.freeze([
  "夜九",
  "暁八",
  "暁七",
  "明六",
  "朝五",
  "朝四",
  "昼九",
  "昼八",
  "暮七",
  "暮六",
  "夜五",
  "夜四",
]);

export const JISHIN_NAMES = Object.freeze([
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
]);
