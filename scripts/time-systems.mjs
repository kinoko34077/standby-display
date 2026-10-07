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
  ["civil", {
    usesHourFormat: true,
    supportsLetterCase: false,
    format: formatCivilDecimal,
    nextVisibleBoundaryMs: nextCivilSecondBoundaryMs,
  }],
  ["civil-base12", {
    usesHourFormat: false,
    supportsLetterCase: true,
    format: (now, settings) => formatCivilRadix(now, settings, 12),
    nextVisibleBoundaryMs: nextCivilSecondBoundaryMs,
  }],
  ["duodecimal", {
    usesHourFormat: false,
    supportsLetterCase: true,
    format: formatDuodecimalDay,
    nextVisibleBoundaryMs: nextCivilSecondBoundaryMs,
  }],
  ["decimal-time", {
    usesHourFormat: false,
    supportsLetterCase: false,
    format: formatDecimalTime,
    nextVisibleBoundaryMs: nextDecimalTimeBoundaryMs,
  }],
  ["civil-base16", {
    usesHourFormat: false,
    supportsLetterCase: true,
    format: (now, settings) => formatCivilRadix(now, settings, 16),
    nextVisibleBoundaryMs: nextCivilSecondBoundaryMs,
  }],
  ["hex-day", {
    usesHourFormat: false,
    supportsLetterCase: true,
    format: formatHexDay,
    nextVisibleBoundaryMs: nextHexDayBoundaryMs,
  }],
]);

export function formatClockTime(now, clockSettings) {
  return getSystem(clockSettings.timeSystem).format(now, clockSettings);
}

export function getClockNextTickDelayMs(now, clockSettings) {
  const system = getSystem(clockSettings.timeSystem);
  return Math.min(
    system.nextVisibleBoundaryMs(now, clockSettings),
    nextBlinkBoundaryMs(now, clockSettings),
    nextCivilMinuteBoundaryMs(now),
  );
}

export function clockSystemUsesHourFormat(systemId) {
  return getSystem(systemId).usesHourFormat;
}

export function clockSystemSupportsLetterCase(systemId) {
  return getSystem(systemId).supportsLetterCase;
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
    settings,
  });
}

function formatCivilRadix(now, settings, radix) {
  return colonClock({
    hourText: formatRadixInteger(now.getHours(), radix, {
      minWidth: 2,
      uppercase: settings.uppercaseDigits,
    }),
    minuteText: formatRadixInteger(now.getMinutes(), radix, {
      minWidth: 2,
      uppercase: settings.uppercaseDigits,
    }),
    secondText: formatRadixInteger(now.getSeconds(), radix, {
      minWidth: 2,
      uppercase: settings.uppercaseDigits,
    }),
    now,
    showSeconds: settings.showSeconds,
    settings,
  });
}

function formatDuodecimalDay(now, settings) {
  const total = partitionNominalDay(now, 12 * 12 * 12);
  return colonClock({
    hourText: formatRadixInteger(Math.floor(total / 144), 12, {
      uppercase: settings.uppercaseDigits,
    }),
    minuteText: formatRadixInteger(Math.floor(total / 12) % 12, 12, {
      uppercase: settings.uppercaseDigits,
    }),
    secondText: formatRadixInteger(total % 12, 12, {
      uppercase: settings.uppercaseDigits,
    }),
    now,
    showSeconds: settings.showSeconds,
    settings,
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
    settings,
  });
}

function formatHexDay(now, settings) {
  const digits = formatRadixInteger(partitionNominalDay(now, 16 ** 4), 16, {
    minWidth: 4,
    uppercase: settings.uppercaseDigits,
  });
  return {
    prefixText: ".",
    showPrefix: true,
    prefixVisible: isBlinkVisible(now, settings),
    hourText: digits.slice(0, 2),
    minuteText: settings.showSeconds ? digits.slice(2) : "",
    secondText: "",
    separatorText: "",
    showSeconds: false,
    showColon: false,
  };
}

function colonClock({
  hourText,
  minuteText,
  secondText,
  now,
  showSeconds,
  settings,
}) {
  return {
    prefixText: "",
    showPrefix: false,
    prefixVisible: false,
    hourText,
    minuteText,
    secondText: `:${secondText}`,
    separatorText: ":",
    showSeconds,
    showColon: isBlinkVisible(now, settings),
  };
}

function partitionNominalDay(now, unitCount) {
  const elapsedMs = elapsedNominalDayMs(now);
  return Math.min(
    unitCount - 1,
    Math.floor((elapsedMs * unitCount) / NOMINAL_DAY_MS),
  );
}

function nextDecimalTimeBoundaryMs(now, settings) {
  const partitionCount = settings.showSeconds ? 100000 : 1000;
  return Math.min(
    nextPartitionBoundaryMs(now, partitionCount),
    nextCivilSecondBoundaryMs(now),
  );
}

function nextHexDayBoundaryMs(now, settings) {
  return nextPartitionBoundaryMs(now, settings.showSeconds ? 16 ** 4 : 16 ** 2);
}

function nextPartitionBoundaryMs(now, unitCount) {
  const elapsedMs = elapsedNominalDayMs(now);
  const currentUnit = Math.floor((elapsedMs * unitCount) / NOMINAL_DAY_MS);
  const nextBoundaryElapsedMs = ((currentUnit + 1) * NOMINAL_DAY_MS) / unitCount;
  return Math.max(1, Math.ceil(nextBoundaryElapsedMs - elapsedMs));
}

function nextBlinkBoundaryMs(now, settings) {
  const intervalMs = settings.blinkDoubleSpeed ? 500 : 1000;
  const remainder = ((now.getTime() % intervalMs) + intervalMs) % intervalMs;
  return remainder === 0 ? intervalMs : intervalMs - remainder;
}

function isBlinkVisible(now, settings) {
  const intervalMs = settings.blinkDoubleSpeed ? 500 : 1000;
  return Math.floor(now.getTime() / intervalMs) % 2 === 0;
}

function nextCivilSecondBoundaryMs(now) {
  const milliseconds = now.getMilliseconds();
  return milliseconds === 0 ? 1000 : 1000 - milliseconds;
}

function nextCivilMinuteBoundaryMs(now) {
  const elapsedInMinuteMs = now.getSeconds() * 1000 + now.getMilliseconds();
  return elapsedInMinuteMs === 0 ? 60000 : 60000 - elapsedInMinuteMs;
}

function elapsedNominalDayMs(now) {
  return (
    ((now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds()) * 1000 +
    now.getMilliseconds()
  );
}
