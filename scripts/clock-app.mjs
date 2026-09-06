import {
  CLOCK_SYNC_INTERVAL_MS,
  DATA_REFRESH_INTERVAL_MS,
  DEFAULT_SETTINGS,
  DEFAULT_SUPPLEMENTAL_DATA,
  STATUS_MESSAGE_TIMEOUT_MS,
} from "./constants.mjs";
import { buildViewModel } from "./formatters.mjs";
import { createRenderer } from "./render.mjs";
import { getDailyRandomColors } from "./random-colors.mjs";
import {
  createCalendarService,
  createLocationService,
  createTimeSyncService,
  createWeatherService,
} from "./services.mjs";
import {
  buildShareUrl,
  cloneSettings,
  createDefaultUiState,
  loadStoredSettings,
  parseSettingsFromSearch,
  saveSettings,
  sanitizeSettings,
} from "./settings.mjs";
import { createSettingsUi } from "./settings-ui.mjs";

export function createClockApp({
  document,
  navigator,
  storage,
  fetchImpl,
  locationObject,
  timers,
}) {
  const persistedSettings = loadStoredSettings(storage);
  const urlSettings = parseSettingsFromSearch(locationObject?.search ?? "");

  const renderer = createRenderer(document);
  const settingsUi = createSettingsUi(document, {
    onOpen: openSettings,
    onClose: closeSettings,
    onToggleView: toggleSettingsView,
    onSettingChange: handleSettingChange,
    onCopyUrl: copyCurrentSettingsUrl,
    onReset: resetSettings,
  }, globalThis.iro);
  const locationService = createLocationService(navigator.geolocation);
  const timeSyncService = createTimeSyncService(fetchImpl);
  const weatherService = createWeatherService(fetchImpl, storage);
  const calendarService = createCalendarService(fetchImpl);

const state = {
    settings: sanitizeSettings(
      mergeSettings(DEFAULT_SETTINGS, persistedSettings, urlSettings),
    ),
    uiState: createDefaultUiState(),
    clockOffsetMs: 0,
    location: null,
    supplemental: { ...DEFAULT_SUPPLEMENTAL_DATA },
    lastMinuteKey: null,
    lastDayKey: null,
    timers: {
      secondAlignment: null,
      secondTick: null,
      timeSync: null,
      externalData: null,
      statusMessage: null,
      triggerVisibility: null,
    },
  };

  function mergeSettings(...settingsParts) {
    const nextSettings = cloneSettings(DEFAULT_SETTINGS);
    for (const part of settingsParts) {
      if (!part) {
        continue;
      }
      for (const [groupKey, groupValue] of Object.entries(part)) {
        if (!groupValue || typeof groupValue !== "object") {
          continue;
        }
        nextSettings[groupKey] = {
          ...nextSettings[groupKey],
          ...groupValue,
        };
      }
    }
    return nextSettings;
  }

  function getNow() {
    return new Date(Date.now() + state.clockOffsetMs);
  }

  function getMinuteKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
  }

  function getDayKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function renderSettingsUi() {
    settingsUi.render(state.settings, state.uiState);
  }

  function clearTriggerHideTimer() {
    if (state.timers.triggerVisibility !== null) {
      timers.clearTimeout(state.timers.triggerVisibility);
      state.timers.triggerVisibility = null;
    }
  }

  function scheduleTriggerHide() {
    clearTriggerHideTimer();

    if (state.uiState.settingsOpen) {
      return;
    }

    state.timers.triggerVisibility = timers.setTimeout(() => {
      state.uiState.triggerVisible = false;
      state.timers.triggerVisibility = null;
      renderSettingsUi();
    }, 3000);
  }

  function revealTriggerTemporarily() {
    if (state.uiState.settingsOpen) {
      return;
    }

    state.uiState.triggerVisible = true;
    renderSettingsUi();
    scheduleTriggerHide();
  }

  function renderClockView(now = getNow()) {
    const renderSettings = {
      ...state.settings,
      colors: getDailyRandomColors(state.settings, now),
    };
    renderer.render(
      buildViewModel({
        now,
        settings: renderSettings,
        supplemental: state.supplemental,
      }),
      renderSettings,
    );
    state.lastMinuteKey = getMinuteKey(now);
    state.lastDayKey = getDayKey(now);
  }

  function stopSecondLoop() {
    if (state.timers.secondAlignment !== null) {
      timers.clearTimeout(state.timers.secondAlignment);
      state.timers.secondAlignment = null;
    }
    if (state.timers.secondTick !== null) {
      timers.clearInterval(state.timers.secondTick);
      state.timers.secondTick = null;
    }
  }

  function handleSecondTick() {
    const now = getNow();
    const nextMinuteKey = getMinuteKey(now);
    const nextDayKey = getDayKey(now);
    const dayChanged = state.lastDayKey !== nextDayKey;

    renderer.renderTime(
      buildViewModel({
        now,
        settings: state.settings,
        supplemental: state.supplemental,
      }).time,
    );

    if (state.lastMinuteKey !== nextMinuteKey) {
      renderClockView(now);
    }

    if (dayChanged && state.settings.visibility.rokuyo) {
      void refreshCalendarData(now);
    }
  }

  function startSecondLoop() {
    stopSecondLoop();
    renderClockView();

    const syncedNow = Date.now() + state.clockOffsetMs;
    const remainder = syncedNow % 1000;
    const delay = remainder === 0 ? 1000 : 1000 - remainder;

    state.timers.secondAlignment = timers.setTimeout(() => {
      handleSecondTick();
      state.timers.secondTick = timers.setInterval(handleSecondTick, 1000);
    }, delay);
  }

  async function syncClockOffset() {
    try {
      state.clockOffsetMs = await timeSyncService.syncClockOffset();
      startSecondLoop();
    } catch (error) {
      console.warn("Clock sync failed", error);
    }
  }

  async function ensureLocation() {
    if (state.location) {
      return state.location;
    }

    if (
      !state.settings.visibility.weather &&
      !state.settings.visibility.moon
    ) {
      return null;
    }

    try {
      state.location = await locationService.getCurrentPosition();
    } catch (error) {
      console.warn("Location lookup failed", error);
      state.location = null;
    }

    return state.location;
  }

  async function refreshCalendarData(now = getNow()) {
    if (!state.settings.visibility.rokuyo) {
      renderClockView(now);
      return;
    }

    state.supplemental.rokuyoText = await calendarService.fetchRokuyo(now);
    renderClockView(now);
  }

  async function refreshLocationBoundData(now = getNow()) {
    if (
      !state.settings.visibility.weather &&
      !state.settings.visibility.moon
    ) {
      renderClockView(now);
      return;
    }

    const location = await ensureLocation();
    if (!location) {
      renderClockView(now);
      return;
    }

    const tasks = [];

    if (state.settings.visibility.weather) {
      tasks.push(
        weatherService.fetchWeather(location).then((weatherText) => {
          state.supplemental.weatherText = weatherText;
        }),
      );
    }

    if (state.settings.visibility.moon) {
      tasks.push(
        calendarService.fetchMoonPhase(location).then((moonEmoji) => {
          state.supplemental.moonEmoji = moonEmoji;
        }),
      );
    }

    await Promise.all(tasks);
    renderClockView(now);
  }

  function scheduleRecurringWork() {
    state.timers.timeSync = timers.setInterval(() => {
      void syncClockOffset();
    }, CLOCK_SYNC_INTERVAL_MS);

    state.timers.externalData = timers.setInterval(() => {
      void refreshLocationBoundData();
    }, DATA_REFRESH_INTERVAL_MS);
  }

  function persistSettings() {
    saveSettings(storage, state.settings);
  }

  function setStatusMessage(message) {
    state.uiState.statusMessage = message;
    renderSettingsUi();

    if (state.timers.statusMessage !== null) {
      timers.clearTimeout(state.timers.statusMessage);
    }

    state.timers.statusMessage = timers.setTimeout(() => {
      state.uiState.statusMessage = "";
      state.timers.statusMessage = null;
      renderSettingsUi();
    }, STATUS_MESSAGE_TIMEOUT_MS);
  }

  function updateSettings(mutator, options = {}) {
    const nextSettings = cloneSettings(state.settings);
    mutator(nextSettings);
    state.settings = sanitizeSettings(nextSettings);
    persistSettings();
    renderClockView();
    renderSettingsUi();

    if (options.refreshCalendar) {
      void refreshCalendarData();
    }

    if (options.refreshLocation) {
      void refreshLocationBoundData();
    }
  }

  function handleSettingChange({ group, key, field, value }) {
    const shouldRefreshCalendar =
      group === "visibility" && key === "rokuyo" && value === true;
    const shouldRefreshLocation =
      group === "visibility" &&
      (key === "weather" || key === "moon") &&
      value === true;

    updateSettings(
      (draft) => {
        if (field) {
          draft[group][key][field] = value;
          return;
        }
        draft[group][key] = value;
      },
      {
        refreshCalendar: shouldRefreshCalendar,
        refreshLocation: shouldRefreshLocation,
      },
    );
  }

  function openSettings() {
    clearTriggerHideTimer();
    state.uiState.settingsOpen = true;
    state.uiState.settingsView = "fullscreen";
    state.uiState.triggerVisible = false;
    renderSettingsUi();
  }

  function closeSettings() {
    state.uiState.settingsOpen = false;
    state.uiState.settingsView = "fullscreen";
    state.uiState.triggerVisible = true;
    renderSettingsUi();
    scheduleTriggerHide();
  }

  function toggleSettingsView() {
    state.uiState.settingsView =
      state.uiState.settingsView === "fullscreen" ? "compact" : "fullscreen";
    renderSettingsUi();
  }

  async function copyCurrentSettingsUrl() {
    const shareUrl = buildShareUrl(state.settings, locationObject);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        fallbackCopyText(document, shareUrl);
      }
      setStatusMessage("URLをコピーしました");
    } catch (error) {
      console.warn("Clipboard copy failed", error);
      try {
        fallbackCopyText(document, shareUrl);
        setStatusMessage("URLをコピーしました");
      } catch (fallbackError) {
        console.warn("Fallback copy failed", fallbackError);
        setStatusMessage("URLコピーに失敗しました");
      }
    }
  }

  function resetSettings() {
    state.settings = cloneSettings(DEFAULT_SETTINGS);
    persistSettings();
    renderClockView();
    renderSettingsUi();
    void refreshCalendarData();
    void refreshLocationBoundData();
    setStatusMessage("既定値へ戻しました");
  }

  async function start() {
    document.addEventListener("pointerdown", revealTriggerTemporarily, {
      passive: true,
    });
    renderClockView();
    renderSettingsUi();
    scheduleTriggerHide();
    startSecondLoop();
    scheduleRecurringWork();

    await syncClockOffset();

    if (state.settings.visibility.rokuyo) {
      await refreshCalendarData();
    }

    if (state.settings.visibility.weather || state.settings.visibility.moon) {
      await refreshLocationBoundData();
    }
  }

  return { start };
}

function fallbackCopyText(documentObject, text) {
  const textarea = documentObject.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  documentObject.body.appendChild(textarea);
  textarea.select();
  documentObject.execCommand("copy");
  textarea.remove();
}
