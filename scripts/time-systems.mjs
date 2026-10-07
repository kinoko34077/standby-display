import { formatRadixInteger } from "./radix.mjs";

const NOMINAL_DAY_MS = 24 * 60 * 60 * 1000;

export const CLOCK_SYSTEM_OPTIONS = Object.freeze([
  { id: "civil", label: "現行時計（10進）" },
  { id: "civil-base12", label: "12進数表示時計" },
  { id: "duodecimal", label: "完全12進時計" },
  { id: "decimal-time", label: "フランス十進時法" },
  { id: "civil-base16", label: "16進数表示時計" },
  { id: "hex-day", label: "完全16進時計" },
]);

const CLOCK_SYSTEMS = new Map([
  ["civil", { tickIntervalMs: 1000, usesHourFormat: true, format: formatCivilDecimal }],
  ["civil-base12", { tickIntervalMs: 1000, usesHourFormat: false, format: (now, settings) => formatCivilRadix(now, settings, 12) }],
  ["duodecimal", { tickIntervalMs: 1000, usesHourFormat: false, format: formatDuodecimalDay }],
  ["decimal-time", { tickIntervalMs: 250, usesHourFormat: false, format: formatDecimalTime }],
  ["civil-base16", { tickIntervalMs: 1000, usesHourFormat: false, format: (now, settings) => formatCivilRadix(now, settings, 16) }],
  ["hex-day", { tickIntervalMs: 500, usesHourFormat: false, format: formatHexDay }],
]);

export function formatClockTime(now, clockSettings) {
  return getSystem(clockSettings.timeSystem).format(now, clockSettings);
}

export function getClockTickIntervalMs(clockSettings) {
  return getSystem(clockSettings.timeSystem).tickIntervalMs;
}

export function clockSystemUsesHourFormat(systemId) {
  return getSystem(systemId).usesHourFormat;
}

function getSystem(systemId) {
  return CLOCK_SYSTEMS.get(systemId) || CLOCK_SYSTEMS.get("civil");
}

function formatCivilDecimal(now, settings) {
  const rawHour = now.getHours();
  const hour = settings.hourFormat === "12" ? ((rawHour + 11) % 12) + 1 : rawHour;
  return colonClock({
    hourText: String(hour).padStart(2, "0"),
    minuteText: String(now.getMinutes()).padStart(2, "0"),
    secondText: String(now.getSeconds()).padStart(2, "0"),
    now,
    showSeconds: settings.showSeconds,
  });
}

function formatCivilRadix(now, settings, radix) {
  return colonClock({
    hourText: formatRadixInteger(now.getHours(), radix),
    minuteText: formatRadixInteger(now.getMinutes(), radix),
    secondText: formatRadixInteger(now.getSeconds(), radix),
    now,
    showSeconds: settings.showSeconds,
  });
}

function formatDuodecimalDay(now, settings) {
  const total = partitionNominalDay(now, 12 * 12 * 12);
  return colonClock({
    hourText: formatRadixInteger(Math.floor(total / 144), 12),
    minuteText: formatRadixInteger(Math.floor(total / 12) % 12, 12),
    secondText: formatRadixInteger(total % 12, 12),
    now,
    showSeconds: settings.showSeconds,
  });
}

function formatDecimalTime(now, settings) {
  const total = partitionNominalDay(now, 100000);
  return colonClock({
    hourText: String(Math.floor(total / 10000)),
    minuteText: String(Math.floor(total / 100) % 100).padStart(2, "0"),
    secondText: String(total % 100).padStart(2, "0"),
    now,
    showSeconds: settings.showSeconds,
  });
}

function formatHexDay(now, settings) {
  const digits = formatRadixInteger(partitionNominalDay(now, 16 ** 4), 16, { minWidth: 4 });
  return {
    hourText: `.${digits.slice(0, 2)}`,
    minuteText: settings.showSeconds ? digits.slice(2) : "",
    secondText: "",
    separatorText: "",
    showSeconds: false,
    showColon: false,
  };
}

function colonClock({ hourText, minuteText, secondText, now, showSeconds }) {
  return {
    hourText,
    minuteText,
    secondText: `:${secondText}`,
    separatorText: ":",
    showSeconds,
    showColon: now.getSeconds() % 2 === 0,
  };
}

function partitionNominalDay(now, unitCount) {
  const elapsedMs =
    (((now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds()) * 1000) +
    now.getMilliseconds();
  return Math.min(unitCount - 1, Math.floor((elapsedMs / NOMINAL_DAY_MS) * unitCount));
}
