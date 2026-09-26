export function installViewportHeightVar(windowObject, documentObject) {
  const updateViewportHeight = () => {
    const viewportUnit = windowObject.innerHeight * 0.01;
    documentObject.documentElement.style.setProperty("--vh", `${viewportUnit}px`);
  };

  updateViewportHeight();
  windowObject.addEventListener("resize", updateViewportHeight, { passive: true });
}

export function installWakeLock(
  navigatorObject,
  documentObject,
  onStateChange = () => {},
) {
  const emitState = (status, error = null) => {
    onStateChange({ status, error });
  };

  if (!("wakeLock" in navigatorObject)) {
    emitState("unsupported");
    return {
      retry: async () => {
        emitState("unsupported");
        return false;
      },
    };
  }

  let wakeLock = null;
  let requestPending = null;

  const requestWakeLock = async () => {
    if (documentObject.visibilityState !== "visible") {
      return false;
    }

    if (wakeLock) {
      emitState("active");
      return true;
    }

    if (requestPending) {
      return requestPending;
    }

    emitState("requesting");
    requestPending = (async () => {
      try {
        const sentinel = await navigatorObject.wakeLock.request("screen");
        wakeLock = sentinel;
        sentinel.addEventListener("release", () => {
          wakeLock = null;
          emitState("released");
          if (documentObject.visibilityState === "visible") {
            void requestWakeLock();
          }
        });
        emitState("active");
        return true;
      } catch (error) {
        console.warn("Wake Lock request failed", error);
        emitState("error", error);
        return false;
      } finally {
        requestPending = null;
      }
    })();

    return requestPending;
  };

  documentObject.addEventListener("visibilitychange", () => {
    if (documentObject.visibilityState === "visible") {
      void requestWakeLock();
    }
  });

  void requestWakeLock();

  return {
    retry: requestWakeLock,
  };
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
