import { createClockApp } from "./scripts/clock-app.mjs";
import {
  installViewportHeightVar,
  installWakeLock,
  registerServiceWorker,
} from "./scripts/browser-features.mjs";

function ensureCapabilityStatusUi() {
  if (document.getElementById("wake-lock-status")) {
    return;
  }

  const settingsGrid = document.querySelector(".settings-grid");
  if (!settingsGrid) {
    return;
  }

  const section = document.createElement("section");
  section.className = "settings-section capability-status-section";

  const heading = document.createElement("h2");
  heading.textContent = "端末状態";

  const wakeStatus = document.createElement("p");
  wakeStatus.id = "wake-lock-status";
  wakeStatus.className = "settings-help";
  wakeStatus.setAttribute("role", "status");
  wakeStatus.setAttribute("aria-live", "polite");
  wakeStatus.textContent = "画面スリープ防止: 状態を確認中…";

  const wakeRetry = document.createElement("button");
  wakeRetry.id = "wake-lock-retry";
  wakeRetry.className = "action-button";
  wakeRetry.type = "button";
  wakeRetry.textContent = "画面スリープ防止を再試行";
  wakeRetry.hidden = true;

  const locationStatus = document.createElement("p");
  locationStatus.id = "location-status";
  locationStatus.className = "settings-help";
  locationStatus.setAttribute("role", "status");
  locationStatus.setAttribute("aria-live", "polite");
  locationStatus.textContent = "位置情報: 天気・月齢を有効にすると現在地を取得します。";

  const locationRetry = document.createElement("button");
  locationRetry.id = "location-retry";
  locationRetry.className = "action-button";
  locationRetry.type = "button";
  locationRetry.textContent = "位置情報を再試行";
  locationRetry.hidden = true;

  section.append(heading, wakeStatus, wakeRetry, locationStatus, locationRetry);
  settingsGrid.appendChild(section);
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
