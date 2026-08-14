export function installViewportHeightVar(windowObject, documentObject) {
  const updateViewportHeight = () => {
    const viewportUnit = windowObject.innerHeight * 0.01;
    documentObject.documentElement.style.setProperty("--vh", `${viewportUnit}px`);
  };

  updateViewportHeight();
  windowObject.addEventListener("resize", updateViewportHeight, { passive: true });
}

export function installWakeLock(navigatorObject, documentObject) {
  if (!("wakeLock" in navigatorObject)) {
    return;
  }

  let wakeLock = null;

  const requestWakeLock = async () => {
    if (documentObject.visibilityState !== "visible" || wakeLock) {
      return;
    }

    try {
      wakeLock = await navigatorObject.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
        if (documentObject.visibilityState === "visible") {
          void requestWakeLock();
        }
      });
    } catch (error) {
      console.warn("Wake Lock request failed", error);
    }
  };

  documentObject.addEventListener("visibilitychange", () => {
    if (documentObject.visibilityState === "visible") {
      void requestWakeLock();
    }
  });

  void requestWakeLock();
}

export function registerServiceWorker(navigatorObject, locationObject) {
  if (
    !("serviceWorker" in navigatorObject) ||
    !locationObject ||
    !/^https?:$/.test(locationObject.protocol)
  ) {
    return;
  }

  navigatorObject.serviceWorker
    .register("./service-worker.js")
    .then((registration) => registration.update().catch(() => undefined))
    .catch((error) => {
      console.warn("Service Worker registration failed", error);
    });
}
