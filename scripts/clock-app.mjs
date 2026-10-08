import {
  CLOCK_SYNC_INTERVAL_MS,
  DATA_REFRESH_INTERVAL_MS,
  DEFAULT_SETTINGS,
  DEFAULT_SUPPLEMENTAL_DATA,
  STATUS_MESSAGE_TIMEOUT_MS,
} from "./constants.mjs";
import { buildViewModel } from "./formatters.mjs";
import { createKanjiConversionService } from "./kanji-conversion.mjs";
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
  mergeSettings,
  parseSettingsFromSearch,
  saveSettings,
  sanitizeSettings,
} from "./settings.mjs";
import { createSettingsUi } from "./settings-ui.mjs";
import { getClockNextTickDelayMs } from "./time-systems.mjs";

export function createLatestRequestFence(getCurrentKey) {
  let latestGeneration = 0;

  return {
    begin(requestKey) {
      const generation = ++latestGeneration;
      return {
        isCurrent() {
          return (
            generation === latestGeneration &&
            requestKey === getCurrentKey()
          );
        },
      };
    },
  };
}

export function createSingleFlightRunner() {
  let current = null;

  return function run(task) {
    if (current) {
      return current;
    }

    const promise = Promise.resolve()
      .then(task)
      .finally(() => {
        if (current === promise) {
          current = null;
        }
      });
    current = promise;
    return promise;
  };
}

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
    onSettingChange: handleSettingChange,
    onCopyUrl: copyCurrentSettingsUrl,
    onReset: resetSettings,
    onRetryLocation: retryLocation,
  }, globalThis.iro);
  const locationService = createLocationService(navigator.geolocation);
  const timeSyncService = createTimeSyncService(fetchImpl);
  const weatherService = createWeatherService(fetchImpl, storage);
  const calendarService = createCalendarService(fetchImpl);
  const characterStyleService = createKanjiConversionService(
    fetchImpl,
    globalThis.StandbyConfig?.api?.textTransform,
  );

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
      clockTick: null,
      timeSync: null,
      externalData: null,
      statusMessage: null,
      triggerVisibility: null,
    },
  };

  function getNow() {
    return new Date(Date.now() + state.clockOffsetMs);
  }

  function getMinuteKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
  }

  function getDayKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  const rokuyoRequestFence = createLatestRequestFence(() =>
    getDayKey(getNow()),
  );
  const runTimeSync = createSingleFlightRunner();
  const runExternalDataRefresh = createSingleFlightRunner();

  function hasLocationBoundVisibility() {
    return state.settings.visibility.weather || state.settings.visibility.moon;
  }

  function renderSettingsUi() {
    settingsUi.render(state.settings, state.uiState);
    const legacyLink = document.getElementById("settings-legacy");
    if (legacyLink) {
      const legacyUrl = new URL(buildShareUrl(state.settings, locationObject));
      legacyUrl.searchParams.set("mode", "legacy");
      legacyLink.href = legacyUrl.toString();
    }
  }

  function setLocationStatus(status, message) {
    state.uiState.locationStatus = status;
    state.uiState.locationStatusMessage = message;
    renderSettingsUi();
  }

  function describeLocationError(error) {
    if (!navigator.geolocation) {
      return "位置情報: このブラウザでは利用できません。天気・月齢は取得せず時計表示を続けます。";
    }
    if (error?.code === 1) {
      return "位置情報: 許可されていません。ブラウザまたはOSの位置情報権限を許可して再試行してください。";
    }
    if (error?.code === 3) {
      return "位置情報: 取得がタイムアウトしました。通信・現在地を確認して再試行してください。";
    }
    return "位置情報: 取得できませんでした。通信・端末設定・権限を確認して再試行してください。";
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
      const settingsTrigger = document.getElementById("settings-open");
      if (document.activeElement === settingsTrigger) {
        scheduleTriggerHide();
        return;
      }
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
    const { viewModel, settings } = buildClockView(now);
    renderer.render(viewModel, settings);
    state.lastMinuteKey = getMinuteKey(now);
    state.lastDayKey = getDayKey(now);
  }

  function buildClockView(now) {
    const settings = {
      ...state.settings,
      colors: getDailyRandomColors(state.settings, now),
    };
    return {
      settings,
      viewModel: buildViewModel({
        now,
        settings,
        supplemental: state.supplemental,
        characterConverter: characterStyleService.convertNewToOld,
      }),
    };
  }

  function stopClockLoop() {
    if (state.timers.clockTick !== null) {
      timers.clearTimeout(state.timers.clockTick);
      state.timers.clockTick = null;
    }
  }

  function handleClockTick() {
    const now = getNow();
    const nextMinuteKey = getMinuteKey(now);
    const nextDayKey = getDayKey(now);
    const dayChanged = state.lastDayKey !== nextDayKey;

    renderer.renderTime(buildClockView(now).viewModel.time);

    if (state.lastMinuteKey !== nextMinuteKey) {
      renderClockView(now);
    }

    if (dayChanged && state.settings.visibility.rokuyo) {
      void refreshCalendarData(now);
    }
  }

  function scheduleNextClockTick() {
    const now = getNow();
    const delay = getClockNextTickDelayMs(now, state.settings.clock);

    state.timers.clockTick = timers.setTimeout(() => {
      state.timers.clockTick = null;
      handleClockTick();
      scheduleNextClockTick();
    }, delay);
  }

  function startClockLoop() {
    stopClockLoop();
    renderClockView();
    scheduleNextClockTick();
  }

  async function syncClockOffset() {
    try {
      state.clockOffsetMs = await timeSyncService.syncClockOffset();
      startClockLoop();
    } catch (error) {
      console.warn("Clock sync failed", error);
    }
  }

  async function ensureLocation({ force = false } = {}) {
    if (!hasLocationBoundVisibility()) {
      setLocationStatus(
        "idle",
        "位置情報: 天気・月齢が無効のため取得していません。",
      );
      return null;
    }

    setLocationStatus("loading", "位置情報: 取得中…");

    try {
      state.location = await locationService.getCurrentPosition({ force });
      setLocationStatus("active", "位置情報: 取得済みです。");
    } catch (error) {
      console.warn("Location lookup failed", error);
      state.location = null;
      setLocationStatus("error", describeLocationError(error));
    }

    return state.location;
  }

  async function retryLocation() {
    state.location = null;
    locationService.invalidate();
    await refreshLocationBoundData(getNow(), { forceLocation: true });
  }

  async function refreshCalendarData(now = getNow()) {
    if (!state.settings.visibility.rokuyo) {
      renderClockView(now);
      return;
    }

    const requestedDayKey = getDayKey(now);
    const request = rokuyoRequestFence.begin(requestedDayKey);
    const rokuyoText = await calendarService.fetchRokuyo(now);

    if (!request.isCurrent()) {
      return;
    }

    state.supplemental.rokuyoText = rokuyoText;
    renderClockView(now);
  }

  async function refreshLocationBoundData(
    now = getNow(),
    { forceLocation = false } = {},
  ) {
    if (!hasLocationBoundVisibility()) {
      setLocationStatus(
        "idle",
        "位置情報: 天気・月齢が無効のため取得していません。",
      );
      renderClockView(now);
      return;
    }

    const location = await ensureLocation({ force: forceLocation });
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
      void runTimeSync(syncClockOffset);
    }, CLOCK_SYNC_INTERVAL_MS);

    state.timers.externalData = timers.setInterval(() => {
      void runExternalDataRefresh(() => refreshLocationBoundData());
    }, DATA_REFRESH_INTERVAL_MS);
  }

  function persistSettings() {
    return saveSettings(storage, state.settings);
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
    const settingsSaved = persistSettings();
    renderClockView();
    renderSettingsUi();

    if (!settingsSaved) {
      setStatusMessage(
        "設定は反映されましたが、自動保存に失敗しました。ブラウザの保存設定を確認してください。",
      );
    }

    if (options.refreshCalendar) {
      void refreshCalendarData();
    }

    if (options.refreshLocation) {
      void refreshLocationBoundData();
    }

    if (options.refreshLocationStatus) {
      void refreshLocationBoundData();
    }
  }

  function handleSettingChange({ group, key, field, value }) {
    const shouldRefreshCalendar =
      group === "visibility" && key === "rokuyo" && value === true;
    const locationVisibilityChanged =
      group === "visibility" && (key === "weather" || key === "moon");
    const shouldRefreshLocation = locationVisibilityChanged && value === true;

    updateSettings(
      (draft) => {
        if (field) {
          draft[group][key][field] = value;
          return;
        }
        draft[group][key] = value;
        if (group === "randomColors" && key === "enabled") {
          draft.randomColors.revision += 1;
        }
      },
      {
        refreshCalendar: shouldRefreshCalendar,
        refreshLocation: shouldRefreshLocation,
        refreshLocationStatus: locationVisibilityChanged && !value,
      },
    );

    if (
      group === "clock" &&
      (key === "timeSystem" || key === "showSeconds" || key === "fastBlink")
    ) {
      startClockLoop();
    }
  }

  function openSettings() {
    clearTriggerHideTimer();
    state.uiState.settingsOpen = true;
    state.uiState.triggerVisible = false;
    renderSettingsUi();
  }

  function closeSettings() {
    state.uiState.settingsOpen = false;
    state.uiState.triggerVisible = true;
    renderSettingsUi();
    scheduleTriggerHide();
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
    const settingsSaved = persistSettings();
    startClockLoop();
    renderSettingsUi();
    void refreshCalendarData();
    void refreshLocationBoundData();
    setStatusMessage(
      settingsSaved
        ? "既定値へ戻しました"
        : "既定値へ戻しましたが、自動保存に失敗しました。ブラウザの保存設定を確認してください。",
    );
  }

  async function start(onReady = () => {}) {
    document.addEventListener("pointerdown", revealTriggerTemporarily, {
      passive: true,
    });
    document.addEventListener("keydown", revealTriggerTemporarily);
    renderClockView();
    void characterStyleService.initialize().then(() => {
      renderClockView();
    });
    renderSettingsUi();
    scheduleTriggerHide();
    startClockLoop();
    scheduleRecurringWork();
    // A slow/offline API must not be mistaken for an incompatible browser.
    onReady();

    const startupTasks = [runTimeSync(syncClockOffset)];

    if (state.settings.visibility.rokuyo) {
      startupTasks.push(refreshCalendarData());
    }

    if (hasLocationBoundVisibility()) {
      startupTasks.push(
        runExternalDataRefresh(() => refreshLocationBoundData()),
      );
    }

    await Promise.allSettled(startupTasks);
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
