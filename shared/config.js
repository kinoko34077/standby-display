/* Shared by the module app and the ES5 legacy page. No modern syntax here. */
(function (root) {
  "use strict";
  root.StandbyConfig = {
    api: {
      clock: "https://api.kinotch.workers.dev/v1/time",
      weather: "https://api.kinotch.workers.dev/v1/weather",
      calendar: "https://api.kinotch.workers.dev/v1/calendar/rokuyo",
      moon: "https://api.kinotch.workers.dev/v1/astronomy/moon",
      textTransform: "https://api.kinotch.workers.dev"
    },
    settingsKey: "standby-display:settings"
  };
}(typeof window !== "undefined" ? window : globalThis));
