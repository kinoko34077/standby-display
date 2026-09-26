import { createClockApp } from "./scripts/clock-app.mjs";
import {
  installViewportHeightVar,
  installWakeLock,
  registerServiceWorker,
} from "./scripts/browser-features.mjs";

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
