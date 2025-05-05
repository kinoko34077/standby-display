//main.js
var clockOffset = 0;

function syncTimeOffset() {
  var t0 = Date.now();
  return fetch("https://clock-server.kinoko-sub16.workers.dev/")
    .then(function(res) { return res.json(); })
    .then(function(json) {
      var t1 = Date.now();
      var serverTime = json.serverTime;
      var rtt = t1 - t0;
      clockOffset = serverTime + rtt / 2 - t1;
      console.log("⏱ clock offset =", clockOffset, "ms");
    }).catch(function(err) {
      console.warn("時刻同期失敗", err);
      clockOffset = 0;
    });
}

function nowSynced() {
  return new Date(Date.now() + clockOffset);
}

function updateClockOnly() {
  var now = nowSynced();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');
  document.getElementById("hour").textContent = h;
  document.getElementById("minute").textContent = m;
  document.getElementById("seconds").textContent = `:${s}`;
  document.querySelector(".colon").style.opacity = (parseInt(s) % 2 === 0) ? "1" : "0";
}

function updateTime() {
  var now = nowSynced();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');
  document.getElementById("hour").textContent = h;
  document.getElementById("minute").textContent = m;
  document.getElementById("seconds").textContent = `:${s}`;
  document.querySelector(".colon").style.opacity = (parseInt(s) % 2 === 0) ? "1" : "0";

  const eraYear = now.getFullYear() - 2018;
  const eraStr = "令和" + toKanjiNum(eraYear) + "年";
  const jpMonths = ['睦月','如月','彌生','卯月','皐月','水無月','文月','葉月','長月','神無月','霜月','師走'];
  const jpDays = ['日','月','火','水','木','金','土'];

  const month = jpMonths[now.getMonth()];
  const day = toKanjiNum(now.getDate());
  const dayIndex = now.getDay();
  const dayStr = jpDays[dayIndex];

  const warekiLine1 = eraStr;
  const warekiLine2 = `${month}${day}日<span class="weekday weekday-${dayIndex}">${dayStr}</span>`;

  document.getElementById("wareki-line1").textContent = warekiLine1;
  document.getElementById("wareki-line2").innerHTML = warekiLine2;

  setTextAll(".seikoku", getSeikoku(now.getHours()));
  setTextAll(".jishin", getJishin(now.getHours(), now.getMinutes()));
  navigator.geolocation.getCurrentPosition(function(pos) {
    var lat = pos.coords.latitude;
    var lon = pos.coords.longitude;
    fetchWeather(lat, lon).then(function(text) {
      setTextAll(".weather", text);
    });
  }, function(err) {
    console.error("位置情報取得失敗", err);
    setTextAll(".weather", "🌫不明");
  });
  
  // 月齡・六曜は非同期で取得・表示
  fetchMoonPhase().then(moonMark => {
    fetchRokuyo(now).then(rokuyo => {
      setTextAll(".moon", `${moonMark}${rokuyo}`);
    });
  });
}

  function setTextAll(selector, value) {
    document.querySelectorAll(selector).forEach(el => el.textContent = value);
  }

  function toKanjiNum(num) {
    const kanji = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    if (num <= 10) return kanji[num];
    if (num < 20) return "十" + (num % 10 === 0 ? "" : kanji[num % 10]);
    if (num < 30) return "廿" + (num % 10 === 0 ? "" : kanji[num % 10]);
    if (num < 40) return "丗" + (num % 10 === 0 ? "" : kanji[num % 10]);
    if (num < 50) return "卌" + (num % 10 === 0 ? "" : kanji[num % 10]);
    let tens = Math.floor(num / 10);
    let ones = num % 10;
    return (tens === 1 ? "十" : kanji[tens] + "十") + (ones === 0 ? "" : kanji[ones]);
  }

  function getSeikoku(h) {
    var map = [
      "夜九", "曉八", "曉七", "明六", "朝五", "朝四",
      "晝九", "晝八", "夕七", "暮六", "宵五", "暮四"
    ];
    return map[Math.floor((h + 1) % 24 / 2)] + "ツ";
  }  

  function getJishin(h, m) {
    const jikan = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
    const totalMinutes = h * 60 + m;
    const adjustedMinutes = (totalMinutes - 1380 + 1440) % 1440;
    const jikanIndex = Math.floor(adjustedMinutes / 120) % 12;
    const mod30 = adjustedMinutes % 120;
    const quarter = Math.floor(mod30 / 30);
    return jikan[jikanIndex] + ["一", "二", "三", "四"][quarter] + "ツ";
  }

  async function fetchRokuyo(date = new Date()) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;

    try {
      const url = `https://rokuyo-proxy.kinoko-sub16.workers.dev/?rokuyo&date=${isoDate}`;
      const res = await fetch(url);
      const json = await res.json(); // ← 中繼されているのでCORSエラーは出ません
      return json[0]?.rokuyo || "不明";
    } catch (e) {
      console.error("六曜取得失敗", e);
      return "不明";
    }
  }

  function fetchWeather(lat, lon) {
    var cache = JSON.parse(localStorage.getItem("weatherCache") || "{}");
    var now = Date.now();
  
    if (cache.timestamp && now - cache.timestamp < 15 * 60 * 1000) {
      return Promise.resolve(cache.data);
    }
  
    return fetch(`https://weather-proxy.kinoko-sub16.workers.dev/?lat=${lat}&lon=${lon}`)
      .then(res => res.json())
      .then(json => {
        var iconMap = {
          "Clear": "☀", "Clouds": "☁", "Rain": "🌧", "Snow": "❄",
          "Thunderstorm": "⚡", "Drizzle": "🌦", "Mist": "🌫"
        };
        var mark = iconMap[json.weather] || "❓";
        var temp = Math.round(json.temp) + "℃";
        var display = `${mark}${temp}`;
        localStorage.setItem("weatherCache", JSON.stringify({
          timestamp: now, data: display
        }));
        return display;
      })
      .catch(err => {
        console.error("天氣取得失敗", err);
        return "🌫不明";
      });
  }

  syncTimeOffset().then(startClock);

  function startClock() {
    updateTime(); // 六曜・天気・月齢などの初回取得
  
    var now = nowSynced();
    var delay = 1000 - now.getMilliseconds();
  
    setTimeout(function() {
      updateClockOnly(); // 秒境界に合わせて1回描画
      setInterval(updateClockOnly, 1000); // 以後、1秒毎に同期描画
    }, delay);
  
    setInterval(syncTimeOffset, 3600000); // 任意：1時間ごとに時刻再同期
  }