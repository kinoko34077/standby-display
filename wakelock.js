let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('WakeLock released');
      });
      console.log('WakeLock active');
    } else {
      console.warn('Wake Lock API not supported');
    }
  } catch (err) {
    console.error(`Wake Lock error: ${err.name}, ${err.message}`);
  }
}

document.addEventListener('visibilitychange', () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    requestWakeLock();
  }
});

requestWakeLock();
