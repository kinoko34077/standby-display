import { createClockApp } from "./scripts/clock-app.mjs";
import {
  installViewportHeightVar,
  installWakeLock,
  registerServiceWorker,
} from "./scripts/browser-features.mjs";

installViewportHeightVar(window, document);
installWakeLock(navigator, document);
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
