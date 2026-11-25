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
    // A successful HTTP response can still contain invalid measurement data.
    readFiniteNumber: function (payload, key) {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
      var value = payload[key];
      return typeof value === "number" && isFinite(value) ? value : null;
    },
    settingsKey: "standby-display:settings"
  };
}(typeof window !== "undefined" ? window : globalThis));
