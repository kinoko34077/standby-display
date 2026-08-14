export const DEFAULT_SETTINGS = Object.freeze({
  clock: {
    showSeconds: true,
    hourFormat: "24",
    font: "d7",
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
});

export const DEFAULT_SUPPLEMENTAL_DATA = Object.freeze({
  weatherText: "⛅--℃",
  moonEmoji: "◐",
  rokuyoText: "未取得",
});

export const CLOCK_SYNC_INTERVAL_MS = 60 * 60 * 1000;
export const DATA_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
export const WEATHER_CACHE_KEY = "standby-display:weather-cache";
export const SETTINGS_STORAGE_KEY = "standby-display:settings";
export const STATUS_MESSAGE_TIMEOUT_MS = 2200;

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
  {
    id: "d7",
    label: "Digital-7",
    family: "\"D7\", \"Rajdhani\", sans-serif",
  },
  {
    id: "rajdhani",
    label: "Rajdhani",
    family: "\"Rajdhani\", sans-serif",
  },
  {
    id: "mono",
    label: "Monospace",
    family: "\"IBM Plex Mono\", Consolas, monospace",
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
