// src/worker.js
var worker_default = {
  async fetch(request) {
    const warekiLine1 = "\u4EE4\u548C\u516D\u5E74";
    const warekiLine2 = "\u7690\u6708\u4E94\u65E5 \u65E5";
    const seikoku = "\u671D\u56DB\u3064";
    const jishin = "\u5DF3\u4E8C\u3064";
    const moon = "\u{1F315}\u5927\u5B89";
    const weather = "\u{1F324}20\u2103";
    const styleText = `
      @font-face {
        font-family: D7;
        src: url(https://exis9.github.io/tradingviews/fonts/digital-7.ttf);
      }
      html, body {
        margin: 0; padding: 0; height: 100vh; width: 100vw;
        position: absolute; top: 0; left: 0;
        background: #000; color: #fff;
        font-family: 'Rajdhani', sans-serif;
        overflow: hidden;
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-box-align: center; -webkit-align-items: center; align-items: center;
        -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center;
      }
      .main-layout {
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-flex-direction: row; flex-direction: row;
        width: 100%; height: 100%; box-sizing: border-box;
        padding: 2vh 2vw; position: relative;
      }
      .left-area {
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-flex-direction: column; flex-direction: column;
        -webkit-box-pack: justify; -webkit-justify-content: space-between; justify-content: space-between;
        height: 100%; width: 30%; max-width: 30vw; -webkit-flex-shrink: 0; flex-shrink: 0; z-index: 2;
      }
      .container {
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-flex-direction: column; flex-direction: column;
        -webkit-align-items: flex-start; align-items: flex-start;
        margin-bottom: 2vh;
      }
      .extra-block-horizontal, .extra-block-vertical {
        font-size: 4vh; line-height: 1.8; font-family: 'Noto Sans JP', sans-serif; z-index: 2;
      }
      .extra-block-horizontal { display: block; }
      .extra-block-vertical { display: none; }
      .block {
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-flex-direction: column; flex-direction: column;
        -webkit-justify-content: center; justify-content: center;
        -webkit-flex-shrink: 0; flex-shrink: 0;
      }
      .date-block { font-size: 4vh; line-height: 1.6; font-family: 'Noto Sans JP', sans-serif; }
      .clock-block {
        position: absolute; top: 50%; left: 50%; font-family: 'D7', sans-serif;
        font-size: 48vw; color: #70b8ff; text-align: center; line-height: 1;
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-align-items: center; align-items: center;
        -webkit-justify-content: center; justify-content: center;
        z-index: 1; white-space: nowrap;
        -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%);
      }
      .seconds {
        position: absolute; bottom: 5%; right: 2vw;
        font-size: 5vw; opacity: 0.4; font-family: 'D7'; z-index: 3;
      }
    `;
    const scriptText = `
      (function () {
        function pad(n) { return n < 10 ? '0' + n : n; }
        function updateClock() {
          var now = new Date();
          document.getElementById("hour").innerText = pad(now.getHours());
          document.getElementById("minute").innerText = pad(now.getMinutes());
          document.getElementById("seconds").innerText = ':' + pad(now.getSeconds());
        }
        setInterval(updateClock, 1000);
        updateClock();
      })();
    `;
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="mobile-web-app-capable" content="yes" />
  <title>\u548C\u98A8\u30B9\u30BF\u30F3\u30D0\u30A4\u6642\u8A08</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP&family=Rajdhani:wght@500&display=swap" rel="stylesheet">
  <style>${styleText}</style>
</head>
<body>
  <div class="main-layout">
    <div class="left-area">
      <div class="container">
        <div class="block date-block">
          <div id="wareki-line1">${warekiLine1}</div>
          <div id="wareki-line2">${warekiLine2}</div>
        </div>
      </div>
      <div class="extra-block-horizontal">
        <div><span class="seikoku">${seikoku}</span> <span class="weather">${weather}</span></div>
        <div><span class="jishin">${jishin}</span> <span class="moon">${moon}</span></div>
      </div>
    </div>
    <div class="block clock-block">
      <div><span id="hour">--</span><span class="colon">:</span><span id="minute">--</span></div>
      <div class="seconds" id="seconds">:--</div>
    </div>
    <div class="extra-block-vertical">
      <div><span class="seikoku">${seikoku}</span> <span class="weather">${weather}</span></div>
      <div><span class="jishin">${jishin}</span> <span class="moon">${moon}</span></div>
    </div>
  </div>
  <script>${scriptText}<\/script>
</body>
</html>
`.trim();
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=UTF-8" }
    });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
