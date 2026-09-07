import {
  ERA_NAME,
  ERA_YEAR_OFFSET,
  JAPANESE_MONTHS,
  JAPANESE_WEEKDAYS,
  JISHIN_NAMES,
  KANJI_DIGITS,
  SEIKOKU_NAMES,
} from "./constants.mjs";
import { convertNewToOld } from "./kanji-conversion.mjs";

export function buildViewModel({
  now,
  settings,
  supplemental,
  characterConverter = convertNewToOld,
}) {
  const characterStyle = settings.calendar.characterStyle;

  return {
    time: formatTime(now, settings.clock),
    date: formatDate(now, settings.calendar, characterConverter),
    info: {
      seikokuText: applyCharacterStyle(
        getSeikoku(now.getHours()),
        characterStyle,
        characterConverter,
      ),
      jishinText: applyCharacterStyle(
        getJishin(now.getHours(), now.getMinutes()),
        characterStyle,
        characterConverter,
      ),
      weatherText: supplemental.weatherText,
      moonText: supplemental.moonEmoji,
      rokuyoText: applyCharacterStyle(
        supplemental.rokuyoText,
        characterStyle,
        characterConverter,
      ),
      showWeather: settings.visibility.weather,
      showMoon: settings.visibility.moon,
      showRokuyo: settings.visibility.rokuyo,
    },
  };
}

export function formatTime(now, clockSettings) {
  const rawHour = now.getHours();
  const hour =
    clockSettings.hourFormat === "12"
      ? ((rawHour + 11) % 12) + 1
      : rawHour;

  return {
    hourText: String(hour).padStart(2, "0"),
    minuteText: String(now.getMinutes()).padStart(2, "0"),
    secondText: `:${String(now.getSeconds()).padStart(2, "0")}`,
    showSeconds: clockSettings.showSeconds,
    showColon: now.getSeconds() % 2 === 0,
  };
}

export function formatDate(
  now,
  calendarSettings,
  characterConverter = convertNewToOld,
) {
  const weekdayIndex = now.getDay();
  const characterStyle = calendarSettings.characterStyle;
  const monthName = applyCharacterStyle(
    JAPANESE_MONTHS[now.getMonth()],
    characterStyle,
    characterConverter,
  );
  const weekdayText = applyCharacterStyle(
    JAPANESE_WEEKDAYS[weekdayIndex],
    characterStyle,
    characterConverter,
  );
  const yearLineText =
    calendarSettings.yearSystem === "wareki"
      ? `${ERA_NAME}${toKanjiNumber(now.getFullYear() - ERA_YEAR_OFFSET)}年`
      : `${now.getFullYear()}年`;

  return {
    line1Text: applyCharacterStyle(
      yearLineText,
      characterStyle,
      characterConverter,
    ),
    line2Html: `${monthName}${applyCharacterStyle(
      `${toKanjiNumber(now.getDate())}日`,
      characterStyle,
      characterConverter,
    )}<span class="weekday weekday-${weekdayIndex}">${weekdayText}</span>`,
  };
}

export function toKanjiNumber(number) {
  if (number < 10) {
    return KANJI_DIGITS[number];
  }

  if (number < 20) {
    return `十${number % 10 === 0 ? "" : KANJI_DIGITS[number % 10]}`;
  }

  const tens = Math.floor(number / 10);
  const ones = number % 10;
  const tensText = tens === 1 ? "十" : `${KANJI_DIGITS[tens]}十`;
  return `${tensText}${ones === 0 ? "" : KANJI_DIGITS[ones]}`;
}

export function getSeikoku(hours) {
  return `${SEIKOKU_NAMES[Math.floor(((hours + 1) % 24) / 2)]}つ`;
}

export function getJishin(hours, minutes) {
  const totalMinutes = hours * 60 + minutes;
  const adjustedMinutes = (totalMinutes - 1380 + 1440) % 1440;
  const jishinIndex = Math.floor(adjustedMinutes / 120) % 12;
  const quarter = Math.floor((adjustedMinutes % 120) / 30);
  return `${JISHIN_NAMES[jishinIndex]}${["一", "二", "三", "四"][quarter]}つ`;
}

export function applyCharacterStyle(
  text,
  style,
  characterConverter = convertNewToOld,
) {
  if (style !== "old" || !text) {
    return text;
  }

  return characterConverter(text);
}
