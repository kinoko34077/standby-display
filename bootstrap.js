/* ES5 only: this file must run before any modern JavaScript is parsed. */
(function (window, document) {
  "use strict";
  var completed = false;
  var timer;
  var query = window.location.search || "";
  var forcedLegacy = /(?:^|[?&])mode=legacy(?:&|$)/.test(query);
  var forcedModern = /(?:^|[?&])mode=modern(?:&|$)/.test(query);

  function fallback() {
    if (completed) return;
    completed = true;
    window.clearTimeout(timer);
    // Relative paths also work under GitHub Pages /standby-display/.
    // Keep settings and fragments, but remove a forced-modern selection.
    var search = query.replace(/([?&])mode=[^&]*(&|$)/g, "$1").replace(/[?&]$/, "");
    window.location.replace("./legacy/" + search + window.location.hash);
  }

  function supportsModern() {
    var script = document.createElement("script");
    return "noModule" in script && !!window.fetch && !!window.Promise &&
      !!window.Map && !!window.Set && !!window.URL && !!window.URLSearchParams &&
      !!window.requestAnimationFrame && !!window.PointerEvent &&
      !!Object.entries && !!Array.from && !!String.prototype.padStart &&
      !!window.CSS && typeof window.CSS.supports === "function" &&
      window.CSS.supports("display", "grid") &&
      window.CSS.supports("color", "var(--test)") &&
      window.CSS.supports("width", "min(10px, 20px)");
  }

  window.StandbyBoot = {
    moduleParsed: false,
    fallback: fallback,
    ready: function () {
      if (completed) return;
      completed = true;
      window.clearTimeout(timer);
      document.documentElement.setAttribute("data-clock-mode", "modern");
    }
  };

  if (forcedLegacy || (!forcedModern && !supportsModern())) {
    fallback();
    return;
  }

  var entry = document.createElement("script");
  entry.type = "module";
  entry.src = "./modern-entry.mjs";
  entry.onerror = fallback;
  entry.onload = function () {
    // Some browsers load modules but cannot parse optional chaining/import().
    if (!window.StandbyBoot.moduleParsed) fallback();
  };
  timer = window.setTimeout(fallback, 15000);
  function loadModern() {
    if (!completed) document.head.appendChild(entry);
  }
  // Old devices redirect in <head>, before modern styles/fonts can delay them.
  // Modern code waits for the clock/settings DOM to exist.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadModern, false);
  } else {
    loadModern();
  }
}(window, document));
