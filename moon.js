async function fetchMoonPhase() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        const url = `https://rokuyo-proxy.kinoko-sub16.workers.dev/?moon&lat=${lat}&lon=${lon}`;
        const res = await fetch(url);
        const json = await res.json();

        const moonAge = parseFloat(json.result?.[0]?.age ?? NaN);
        if (isNaN(moonAge)) throw new Error("moon_ageが無効");
        
        resolve(getMoonEmoji(moonAge));
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
  if (isNaN(age)) return "🌙";
  if (age < 1.5) return "🌑";
  if (age < 6.5) return "🌒";
  if (age < 8.5) return "🌓";
  if (age < 13.5) return "🌔";
  if (age < 15.5) return "🌕";
  if (age < 21.5) return "🌖";
  if (age < 23.5) return "🌗";
  if (age < 28) return "🌘";
  return "🌑";
}
