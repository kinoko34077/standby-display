var wakeLock = null;

function requestWakeLock() {
  if ('wakeLock' in navigator && document.visibilityState === 'visible') {
    navigator.wakeLock.request('screen')
      .then(function(lock) {
        wakeLock = lock;
        console.log("✅ Wake Lock acquired");
        wakeLock.addEventListener('release', function() {
          console.log("🔓 Wake Lock released");
        });
      })
      .catch(function(err) {
        console.warn("Wake Lock error:", err.name + ", " + err.message);
      });
  } else {
    console.log("⏳ Wake Lock postponed: page not visible");
  }
}

// タブが可視化されたタイミングで再要求
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    requestWakeLock();
  }
});

// 初回実行
requestWakeLock();
