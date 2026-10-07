import { createClockApp } from "./scripts/clock-app.mjs";
import {
  installViewportHeightVar,
  installWakeLock,
  registerServiceWorker,
} from "./scripts/browser-features.mjs";

function ensureCapabilityStatusUi() {
  const systemDiagnostics = document.getElementById("settings-system-diagnostics");
  const displayDiagnostics = document.getElementById("settings-display-diagnostics");

  if (systemDiagnostics && !document.getElementById("wake-lock-status")) {
    const wakeStatus = document.createElement("p");
    wakeStatus.id = "wake-lock-status";
    wakeStatus.className = "settings-help settings-diagnostic-status";
    wakeStatus.setAttribute("role", "status");
    wakeStatus.setAttribute("aria-live", "polite");
    wakeStatus.textContent = "画面スリープ防止: 状態を確認中…";
    systemDiagnostics.appendChild(wakeStatus);

    const wakeRetry = document.createElement("button");
    wakeRetry.id = "wake-lock-retry";
    wakeRetry.className = "action-button action-button-compact";
    wakeRetry.type = "button";
    wakeRetry.textContent = "再試行";
    wakeRetry.hidden = true;
    systemDiagnostics.appendChild(wakeRetry);
  }

  if (displayDiagnostics && !document.getElementById("location-status")) {
    const locationStatus = document.createElement("p");
    locationStatus.id = "location-status";
    locationStatus.className = "settings-help settings-diagnostic-status";
    locationStatus.setAttribute("role", "status");
    locationStatus.setAttribute("aria-live", "polite");
    locationStatus.textContent =
      "位置情報: 天気・月齢を有効にすると現在地を取得します。";
    displayDiagnostics.appendChild(locationStatus);

    const locationRetry = document.createElement("button");
    locationRetry.id = "location-retry";
    locationRetry.className = "action-button action-button-compact";
    locationRetry.type = "button";
    locationRetry.textContent = "再試行";
    locationRetry.hidden = true;
    displayDiagnostics.appendChild(locationRetry);
  }
}

ensureCapabilityStatusUi();
installViewportHeightVar(window, document);

const wakeLockStatus = document.getElementById("wake-lock-status");
const wakeLockRetry = document.getElementById("wake-lock-retry");

function renderWakeLockState(state) {
  if (!wakeLockStatus) {
    return;
  }

  const messages = {
    unsupported:
      "画面スリープ防止: このブラウザでは利用できません。端末の自動ロック設定を確認してください。",
    requesting: "画面スリープ防止: 有効化を確認中…",
    active: "画面スリープ防止: 有効です。",
    released: "画面スリープ防止: 再取得中…",
    error:
      "画面スリープ防止: 有効化できませんでした。ブラウザ/OSの権限・省電力設定を確認して再試行してください。",
  };

  wakeLockStatus.textContent = messages[state.status] ?? "画面スリープ防止: 状態を確認できません。";
  wakeLockStatus.dataset.status = state.status;
  if (wakeLockRetry) {
    wakeLockRetry.hidden = state.status !== "error";
    wakeLockRetry.disabled = state.status === "requesting";
  }
}

const wakeLockController = installWakeLock(
  navigator,
  document,
  renderWakeLockState,
);
wakeLockRetry?.addEventListener("click", () => {
  void wakeLockController.retry();
});

registerServiceWorker(navigator, window.location);

const app = createClockApp({
  document,
  navigator,
  storage: window.localStorage,
  fetchImpl: window.fetch.bind(window),
  locationObject: window.location,
  timers: window,
});

void app.start(() => window.StandbyBoot?.ready()).catch((error) => {
  console.error("Clock startup failed", error);
  window.StandbyBoot?.fallback();
});
