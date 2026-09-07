const COLOR_TARGETS = Object.freeze([
  ["clock", "clock", 72],
  ["text", "text", 48],
  ["background", "backgroundRange", 58],
]);

export function getDailyRandomColors(settings, now) {
  if (!settings.randomColors?.enabled) {
    return settings.colors;
  }

  const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const revision = Number.isInteger(settings.randomColors.revision)
    ? settings.randomColors.revision
    : 0;
  const colors = { ...settings.colors };

  for (const [target, rangeKey, saturation] of COLOR_TARGETS) {
    if (target === "background" && !settings.randomColors.background) {
      continue;
    }

    const range = settings.randomColors[rangeKey];
    const hue = randomInRange(
      `${dayKey}:${revision}:${target}:hue`,
      range.hueMin,
      range.hueMax,
    );
    const lightness = randomInRange(
      `${dayKey}:${revision}:${target}:lightness`,
      range.lightnessMin,
      range.lightnessMax,
    );
    colors[target] = hslToHex(hue, saturation, lightness);
  }

  return colors;
}

export function normalizeRandomColorRange(value, fallback) {
  const hueMin = clampInteger(value?.hueMin, 0, 360, fallback.hueMin);
  const hueMax = clampInteger(value?.hueMax, 0, 360, fallback.hueMax);
  const lightnessMin = clampInteger(
    value?.lightnessMin,
    0,
    100,
    fallback.lightnessMin,
  );
  const lightnessMax = clampInteger(
    value?.lightnessMax,
    0,
    100,
    fallback.lightnessMax,
  );

  return {
    hueMin: Math.min(hueMin, hueMax),
    hueMax: Math.max(hueMin, hueMax),
    lightnessMin: Math.min(lightnessMin, lightnessMax),
    lightnessMax: Math.max(lightnessMin, lightnessMax),
  };
}

function randomInRange(seed, min, max) {
  return Math.round(min + seededUnit(seed) * (max - min));
}

function seededUnit(seed) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function hslToHex(hue, saturation, lightness) {
  const normalizedHue = ((hue % 360) + 360) % 360 / 360;
  const normalizedSaturation = saturation / 100;
  const normalizedLightness = lightness / 100;
  const chroma =
    (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const huePrime = normalizedHue * 6;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const [red, green, blue] = getHslComponents(huePrime, chroma, x);
  const match = normalizedLightness - chroma / 2;

  return `#${[red, green, blue]
    .map((component) => Math.round((component + match) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function getHslComponents(huePrime, chroma, x) {
  if (huePrime < 1) return [chroma, x, 0];
  if (huePrime < 2) return [x, chroma, 0];
  if (huePrime < 3) return [0, chroma, x];
  if (huePrime < 4) return [0, x, chroma];
  if (huePrime < 5) return [x, 0, chroma];
  return [chroma, 0, x];
}

function clampInteger(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.round(Math.min(max, Math.max(min, numericValue)));
}
