/* Shared by the module app and the ES5 legacy page. No modern syntax here. */
(function (root) {
  "use strict";
  root.StandbyConfig = {
    api: {
      clock: "https://clock-server.kinotch.workers.dev",
      weather: "https://weather-proxy.kinotch.workers.dev",
      calendar: "https://rokuyo-proxy.kinotch.workers.dev"
    },
    settingsKey: "standby-display:settings"
  };
}(typeof window !== "undefined" ? window : globalThis));
