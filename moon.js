async function fetchMoonPhase() {
  const cache = JSON.parse(localStorage.getItem("moonCache") || "{}");
  const now = Date.now();

  if (cache.timestamp && now - cache.timestamp < 3600000) {
    return cache.data;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        const res = await fetch(`https://mgpn.org/api/moon/v2position.cgi?lat=${lat}&lon=${lon}`);
        const json = await res.json();
        const moonAge = parseFloat(json[0]?.moon_age);
        const moonEmoji = getMoonEmoji(moonAge);
        localStorage.setItem("moonCache", JSON.stringify({ timestamp: now, data: moonEmoji }));
        resolve(moonEmoji);
      } catch (e) {
        console.error("月齢取得失敗", e);
        resolve("🌙⚠️");
      }
    }, err => {
      console.error("位置情報取得失敗", err);
      resolve("🧭⚠️");
    });
  });
}

  
  function getMoonEmoji(age) {
    if (age < 1.5 || age >= 27.5) return "🌑";
    if (age < 6.5) return "🌒";
    if (age < 8.5) return "🌓";
    if (age < 13)  return "🌔";
    if (age < 16)  return "🌕";
    if (age < 21)  return "🌖";
    if (age < 23)  return "🌗";
    if (age < 27.5) return "🌘";
    return "🌙";
  }
  