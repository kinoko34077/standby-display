/* Shared by the module app and the ES5 legacy page. No modern syntax here. */
(function (root) {
  "use strict";
  function readFiniteNumber(payload, key) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    var value = payload[key];
    // The endpoint field fixes the unit. Accept an unambiguous decimal,
    // not JavaScript's coercion of empty/null/boolean/array/hex values.
    if (typeof value === "string") {
      value = value.trim();
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) return null;
      var decimal = value;
      value = Number(value);
      // A nonzero decimal that underflows to zero is not an equivalent value.
      if (value === 0 && /[1-9]/.test(decimal.split(/[eE]/)[0])) return null;
    }
    return typeof value === "number" && isFinite(value) ? value : null;
  }
  function isUsableDate(value) {
    return typeof value === "number" && isFinite(new Date(value).getTime());
  }
  function clockOffset(started, received, serverTime) {
    if (!isUsableDate(started) || !isUsableDate(received) ||
        !isUsableDate(serverTime) || received < started) return null;
    var effective = serverTime + (received - started) / 2;
    var offset = effective - received;
    return isUsableDate(effective) && isUsableDate(received + offset) ? offset : null;
  }
  var weatherLocationTolerance = 0.01;
  function nearby(a, b) {
    return !!a && !!b && typeof a.lat === "number" && typeof a.lon === "number" &&
      typeof b.lat === "number" && typeof b.lon === "number" &&
      isFinite(a.lat) && isFinite(a.lon) && isFinite(b.lat) && isFinite(b.lon) &&
      Math.abs(a.lat - b.lat) <= weatherLocationTolerance && Math.abs(a.lon - b.lon) <= weatherLocationTolerance;
  }
  function createApiStatus(document) {
    var messages = { clock: "", weather: "" };
    return function (key, message) {
      messages[key] = message;
      var element = document.getElementById("api-status");
      if (!element) return;
      var combined = [messages.clock, messages.weather].filter(Boolean).join(" / ");
      if (element.textContent !== combined) element.textContent = combined;
    };
  }
  root.StandbyConfig = {
    api: {
      clock: "https://api.kinotch.workers.dev/v1/time",
      weather: "https://api.kinotch.workers.dev/v1/weather",
      calendar: "https://api.kinotch.workers.dev/v1/calendar/rokuyo",
      moon: "https://api.kinotch.workers.dev/v1/astronomy/moon",
      textTransform: "https://api.kinotch.workers.dev"
    },
    readFiniteNumber: readFiniteNumber,
    isUsableDate: isUsableDate,
    clockOffset: clockOffset,
    nearbyWeatherLocation: nearby,
    weatherLocationTolerance: weatherLocationTolerance,
    createApiStatus: createApiStatus,
    settingsKey: "standby-display:settings"
  };
}(typeof window !== "undefined" ? window : globalThis));
