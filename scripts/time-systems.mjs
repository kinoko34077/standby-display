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
    secondPartitionsPerDay: 24 * 60 * 60,
    blinkPartitionsPerDay: 24 * 60 * 60,
    format: formatCivilDecimal,
    nextVisibleBoundaryMs: nextCivilSecondBoundaryMs,
  }],
  ["civil-base12", {
    usesHourFormat: false,
    supportsLetterCase: true,
    secondPartitionsPerDay: 24 * 60 * 60,
    blinkPartitionsPerDay: 24 * 60 * 60,
    format: (now, settings, system) => formatCivilRadix(now, settings, 12, system),
    nextVisibleBoundaryMs: nextCivilSecondBoundaryMs,
  }],
  ["duodecimal", {
    usesHourFormat: false,
    supportsLetterCase: true,
    secondPartitionsPerDay: 12 * 12 * 12,
    blinkPartitionsPerDay: 12 ** 4,
    format: formatDuodecimalDay,
    nextVisibleBoundaryMs: nextDuodecimalBoundaryMs,
  }],
  ["decimal-time", {
    usesHourFormat: false,
    supportsLetterCase: false,
    secondPartitionsPerDay: 100000,
    blinkPartitionsPerDay: 100000,
    format: formatDecimalTime,
    nextVisibleBoundaryMs: nextDecimalTimeBoundaryMs,
  }],
  ["civil-base16", {
    usesHourFormat: false,
    supportsLetterCase: true,
    secondPartitionsPerDay: 24 * 60 * 60,
    blinkPartitionsPerDay: 24 * 60 * 60,
    format: (now, settings, system) => formatCivilRadix(now, settings, 16, system),
    nextVisibleBoundaryMs: nextCivilSecondBoundaryMs,
  }],
  ["hex-day", {
    usesHourFormat: false,
    supportsLetterCase: true,
    secondPartitionsPerDay: 16 ** 4,
    blinkPartitionsPerDay: 16 ** 4,
    format: formatHexDay,
    nextVisibleBoundaryMs: nextHexDayBoundaryMs,
  }],
]);

export function formatClockTime(now, clockSettings) {
  const system = getSystem(clockSettings.timeSystem);
  return system.format(now, clockSettings, system);
}

export function getClockNextTickDelayMs(now, clockSettings) {
  const system = getSystem(clockSettings.timeSystem);
  return Math.min(
    system.nextVisibleBoundaryMs(now, clockSettings),
    nextBlinkBoundaryMs(
      now,
      system.blinkPartitionsPerDay,
      clockSettings.fastBlink,
    ),
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

function formatCivilDecimal(now, settings, system) {
  const rawHour = now.getHours();
  const hour = settings.hourFormat === "12" ? ((rawHour + 11) % 12) + 1 : rawHour;
  return colonClock({
    hourText: String(hour).padStart(2, "0"),
    minuteText: String(now.getMinutes()).padStart(2, "0"),
    secondText: String(now.getSeconds()).padStart(2, "0"),
    now,
    showSeconds: settings.showSeconds,
    fastBlink: settings.fastBlink,
    blinkPartitionsPerDay: system.blinkPartitionsPerDay,
  });
}

function formatCivilRadix(now, settings, radix, system) {
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
    fastBlink: settings.fastBlink,
    blinkPartitionsPerDay: system.blinkPartitionsPerDay,
  });
}

function formatDuodecimalDay(now, settings, system) {
  const fractionalTotal = partitionNominalDay(now, 12 ** 4);
  const total = Math.floor(fractionalTotal / 12);
  const fraction = fractionalTotal % 12;

  return colonClock({
    hourText: formatRadixInteger(Math.floor(total / 144), 12, {
      uppercase: settings.uppercaseDigits,
    }),
    minuteText: formatRadixInteger(Math.floor(total / 12) % 12, 12, {
      uppercase: settings.uppercaseDigits,
    }),
    secondText: `${formatRadixInteger(total % 12, 12, {
      uppercase: settings.uppercaseDigits,
    })}.${formatRadixInteger(fraction, 12, {
      uppercase: settings.uppercaseDigits,
    })}`,
    now,
    showSeconds: settings.showSeconds,
    fastBlink: settings.fastBlink,
    blinkPartitionsPerDay: system.blinkPartitionsPerDay,
  });
}

function formatDecimalTime(now, settings, system) {
  const total = partitionNominalDay(now, 100000);
  return colonClock({
    hourText: String(Math.floor(total / 10000)),
    minuteText: String(Math.floor(total / 100) % 100).padStart(2, "0"),
    secondText: String(total % 100).padStart(2, "0"),
    now,
    showSeconds: settings.showSeconds,
    fastBlink: settings.fastBlink,
    blinkPartitionsPerDay: system.blinkPartitionsPerDay,
  });
}

function formatHexDay(now, settings, system) {
  const digits = formatRadixInteger(partitionNominalDay(now, 16 ** 4), 16, {
    minWidth: 4,
    uppercase: settings.uppercaseDigits,
  });
  return {
    prefixText: ".",
    hourText: digits.slice(0, 2),
    minuteText: settings.showSeconds ? digits.slice(2) : "",
    secondText: "",
    separatorText: "",
    showSeconds: false,
    showColon: false,
    showPrefix: isBlinkVisible(
      now,
      system.blinkPartitionsPerDay,
      settings.fastBlink,
    ),
  };
}

function colonClock({
  hourText,
  minuteText,
  secondText,
  now,
  showSeconds,
  fastBlink,
  blinkPartitionsPerDay,
}) {
  return {
    prefixText: "",
    hourText,
    minuteText,
    secondText: `:${secondText}`,
    separatorText: ":",
    showSeconds,
    showColon: isBlinkVisible(now, blinkPartitionsPerDay, fastBlink),
    showPrefix: false,
  };
}

function partitionNominalDay(now, unitCount) {
  const elapsedMs = elapsedNominalDayMs(now);
  return Math.min(
    unitCount - 1,
    Math.floor((elapsedMs * unitCount) / NOMINAL_DAY_MS),
  );
}

function nextDuodecimalBoundaryMs(now, settings) {
  return nextPartitionBoundaryMs(now, settings.showSeconds ? 12 ** 4 : 12 ** 2);
}

function nextDecimalTimeBoundaryMs(now, settings) {
  return nextPartitionBoundaryMs(now, settings.showSeconds ? 100000 : 1000);
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

function nextCivilSecondBoundaryMs(now) {
  const milliseconds = now.getMilliseconds();
  return milliseconds === 0 ? 1000 : 1000 - milliseconds;
}

function nextBlinkBoundaryMs(now, blinkPartitionsPerDay, fastBlink) {
  const partitionCount = blinkPartitionsPerDay * (fastBlink ? 2 : 1);
  return nextPartitionBoundaryMs(now, partitionCount);
}

function isBlinkVisible(now, blinkPartitionsPerDay, fastBlink) {
  const partitionCount = blinkPartitionsPerDay * (fastBlink ? 2 : 1);
  return partitionNominalDay(now, partitionCount) % 2 === 0;
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
