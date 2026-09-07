/* ES5 + XMLHttpRequest: keep this parseable on iOS 9 and earlier WebKit. */
(function (window, document, navigator) {
  "use strict";
  var config = window.StandbyConfig;
  var api = config.api;
  var settings = {};
  var offset = 0;
  var lastDay = "";
  var location = null;
  var locating = false;
  var months = ["睦月", "如月", "弥生", "卯月", "皐月", "水無月", "文月", "葉月", "長月", "神無月", "霜月", "師走"];
  var weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  var digits = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  var seikoku = ["夜九", "暁八", "暁七", "明六", "朝五", "朝四", "昼九", "昼八", "暮七", "暮六", "夜五", "夜四"];
  var jishin = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var weatherIcons = { Clear: "☀", Clouds: "☁", Rain: "🌧", Snow: "❄", Thunderstorm: "⛈", Drizzle: "🌦", Mist: "🌫" };
  var ages = [1.5, 6.5, 8.5, 13.5, 15.5, 21.5, 23.5, 28];
  var moons = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];

  try { settings = JSON.parse(window.localStorage.getItem(config.settingsKey)) || {}; } catch (error) {}
  function param(name) {
    var match = new RegExp("(?:^|[?&])" + name + "=([^&]*)").exec(window.location.search);
    try { return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : null; } catch (error) { return null; }
  }
  function option(group, key, query, fallback) {
    var value = param(query);
    if (value !== null) return typeof fallback === "boolean" ? value === "1" : value;
    value = settings[group] && settings[group][key];
    return typeof value === typeof fallback ? value : fallback;
  }
  var showSeconds = option("clock", "showSeconds", "sec", true);
  var hourFormat = option("clock", "hourFormat", "hour", "24");
  var calendar = option("calendar", "yearSystem", "cal", "wareki");
  var showWeather = option("visibility", "weather", "weather", true);
  var showMoon = option("visibility", "moon", "moon", true);
  var showRokuyo = option("visibility", "rokuyo", "rokuyo", true);
  function text(id, value) { document.getElementById(id).textContent = value; }
  function hide(id, hidden) { document.getElementById(id).style.display = hidden ? "none" : ""; }
  function pad(number) { return number < 10 ? "0" + number : String(number); }
  function kanji(number) {
    if (number < 0 || number >= 100) return String(number);
    if (number < 10) return digits[number];
    var tens = Math.floor(number / 10);
    return (tens === 1 ? "" : digits[tens]) + "十" + (number % 10 ? digits[number % 10] : "");
  }
  function request(url, callback) {
    try {
      var xhr = new window.XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.timeout = 8000;
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { callback(JSON.parse(xhr.responseText)); } catch (error) {}
        }
      };
      xhr.onerror = xhr.ontimeout = function () {};
      xhr.send();
    } catch (error) {}
  }
  function updateClock() {
    var now = new Date(new Date().getTime() + offset);
    var hour = now.getHours();
    var minutes = now.getMinutes();
    text("hour", pad(hourFormat === "12" ? ((hour + 11) % 12) + 1 : hour));
    text("minute", pad(minutes));
    text("seconds", ":" + pad(now.getSeconds()));
    text("wareki-line1", calendar === "western" ? now.getFullYear() + "年" : "令和" + kanji(now.getFullYear() - 2018) + "年");
    text("wareki-line2", months[now.getMonth()] + kanji(now.getDate()) + "日 " + weekdays[now.getDay()]);
    text("seikoku", seikoku[Math.floor(((hour + 1) % 24) / 2)] + "つ");
    var adjusted = (hour * 60 + minutes - 1380 + 1440) % 1440;
    text("jishin", jishin[Math.floor(adjusted / 120)] + ["一", "二", "三", "四"][Math.floor((adjusted % 120) / 30)] + "つ");
    var day = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    if (lastDay !== day) {
      lastDay = day;
      text("rokuyo", "未取得");
      refreshRokuyo();
    }
  }
  function refreshRokuyo() {
    if (!showRokuyo) return;
    var requestedDay = lastDay;
    request(api.calendar + "?date=" + requestedDay, function (data) {
      if (requestedDay === lastDay && data[0] && typeof data[0].rokuyo === "string") text("rokuyo", data[0].rokuyo);
    });
  }
  function syncTime() {
    var started = new Date().getTime();
    request(api.clock + "/", function (data) {
      if (typeof data.serverTime !== "number" || !isFinite(data.serverTime)) return;
      var received = new Date().getTime();
      offset = data.serverTime + (received - started) / 2 - received;
      updateClock();
    });
  }
  function refreshForLocation() {
    var query = "lat=" + location.lat + "&lon=" + location.lon;
    if (showWeather) request(api.weather + "/?" + query, function (data) {
      if (typeof data.temp === "number" && isFinite(data.temp)) text("weather", (weatherIcons[data.weather] || "？") + Math.round(data.temp) + "℃");
    });
    if (showMoon) request(api.moon + "?" + query, function (data) {
      var age = data.result && data.result[0] ? parseFloat(data.result[0].age) : NaN;
      if (!isFinite(age)) return;
      var icon = moons[0];
      for (var i = 0; i < ages.length; i++) { if (age < ages[i]) { icon = moons[i]; break; } }
      text("moon", icon);
    });
  }
  function refreshLocation() {
    if (!showWeather && !showMoon) return;
    if (location) { refreshForLocation(); return; }
    if (!navigator.geolocation || locating) return;
    locating = true;
    navigator.geolocation.getCurrentPosition(function (position) {
      locating = false;
      var lat = position.coords.latitude;
      var lon = position.coords.longitude;
      if (!isFinite(lat) || !isFinite(lon)) return;
      location = { lat: lat.toFixed(4), lon: lon.toFixed(4) };
      refreshForLocation();
    }, function () { locating = false; }, { enableHighAccuracy: false, maximumAge: 900000, timeout: 8000 });
  }
  function applyColor(element, property, value) {
    if (/^#[0-9a-f]{6}$/i.test(value)) element.style[property] = value;
  }
  var colors = settings.colors || {};
  applyColor(document.body, "backgroundColor", param("bg") !== null ? "#" + param("bg") : colors.background);
  applyColor(document.body, "color", param("text") !== null ? "#" + param("text") : colors.text);
  applyColor(document.querySelector(".clock-block"), "color", param("clock") !== null ? "#" + param("clock") : colors.clock);
  hide("seconds", !showSeconds);
  hide("weather", !showWeather);
  hide("moon", !showMoon);
  hide("rokuyo", !showRokuyo);
  document.getElementById("automatic-mode").href = "../" + (window.location.search || "").replace(/([?&])mode=[^&]*(&|$)/g, "$1").replace(/[?&]$/, "") + window.location.hash;
  updateClock();
  window.setInterval(updateClock, 1000);
  syncTime();
  refreshLocation();
  window.setInterval(syncTime, 3600000);
  window.setInterval(function () { refreshRokuyo(); refreshLocation(); }, 900000);
}(window, document, navigator));
