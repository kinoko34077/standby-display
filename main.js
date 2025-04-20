//main.js
function updateTime() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    document.getElementById("hour").textContent = h;
    document.getElementById("minute").textContent = m;
    document.getElementById("seconds").textContent = `:${s}`;
    document.querySelector(".colon").style.opacity = (parseInt(s) % 2 === 0) ? "1" : "0";
  
    const eraYear = now.getFullYear() - 2018;
    const eraStr = "令和" + toKanjiNum(eraYear) + "年";
    const jpMonths = ['睦月','如月','弥生','卯月','皐月','水無月','文月','葉月','長月','神無月','霜月','師走'];
    const jpDays = ['日','月','火','水','木','金','土'];
    const warekiLine1 = eraStr;
    const warekiLine2 = `${jpMonths[now.getMonth()]}${toKanjiNum(now.getDate())}日(${jpDays[now.getDay()]})`;
    document.getElementById("wareki-line1").textContent = warekiLine1;
    document.getElementById("wareki-line2").textContent = warekiLine2;
  
    setTextAll(".seikoku", getSeikoku(now.getHours()));
    setTextAll(".jishin", getJishin(now.getHours(), now.getMinutes()));
    setTextAll(".weather", "🌤20℃");
    setTextAll(".moon", "🌓友引");
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
    const map = [
      "夜九つ", "暁八つ", "暁七つ", "明六つ", "朝五つ", "朝四つ",
      "昼九つ", "昼八つ", "夕七つ", "暮六つ", "宵五つ", "暮四つ"
    ];
    return map[Math.floor((h + 1) % 24 / 2)];
  }
  
  function getJishin(h, m) {
    const jikan = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
    const totalMinutes = h * 60 + m;
    const adjustedMinutes = (totalMinutes - 1380 + 1440) % 1440;
    const jikanIndex = Math.floor(adjustedMinutes / 120) % 12;
    const mod30 = adjustedMinutes % 120;
    const quarter = Math.floor(mod30 / 30);
    return jikan[jikanIndex] + ["一", "二", "三", "四"][quarter] + "つ";
  }
  
  setInterval(updateTime, 1000);
  updateTime();
  