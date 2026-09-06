import {
  DEFAULT_SUPPLEMENTAL_DATA,
  MOON_PHASE_EMOJIS,
  WEATHER_CACHE_KEY,
  WEATHER_CACHE_TTL_MS,
  WEATHER_ICON_MAP,
} from "./constants.mjs";

export function createTimeSyncService(fetchImpl) {
  return {
    async syncClockOffset() {
      const requestStartedAt = Date.now();
      const response = await fetchJson(
        fetchImpl,
        "https://clock-server.kinotch.workers.dev/",
      );
      const responseReceivedAt = Date.now();
      const serverTime = Number(response.serverTime);

      if (!Number.isFinite(serverTime)) {
        throw new Error("Invalid serverTime payload");
      }

      const roundTripTime = responseReceivedAt - requestStartedAt;
      return serverTime + roundTripTime / 2 - responseReceivedAt;
    },
  };
}

export function createLocationService(geolocation) {
  let cachedLocation = null;
  let pendingRequest = null;

  return {
    async getCurrentPosition() {
      if (cachedLocation) {
        return cachedLocation;
      }

      if (pendingRequest) {
        return pendingRequest;
      }

      if (!geolocation) {
        throw new Error("Geolocation is not available");
      }

      pendingRequest = new Promise((resolve, reject) => {
        geolocation.getCurrentPosition(
          (position) => {
            cachedLocation = {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            };
            resolve(cachedLocation);
          },
          (error) => reject(error),
          {
            enableHighAccuracy: false,
            maximumAge: 15 * 60 * 1000,
            timeout: 10000,
          },
        );
      }).finally(() => {
        pendingRequest = null;
      });

      return pendingRequest;
    },
  };
}

export function createWeatherService(fetchImpl, storage) {
  return {
    async fetchWeather(location) {
      const cachedWeather = readWeatherCache(storage);
      const now = Date.now();

      if (cachedWeather && now - cachedWeather.timestamp < WEATHER_CACHE_TTL_MS) {
        return cachedWeather.data;
      }

      try {
        const weather = await fetchJson(
          fetchImpl,
          `https://weather-proxy.kinotch.workers.dev/?lat=${location.lat}&lon=${location.lon}`,
        );
        const icon = WEATHER_ICON_MAP[weather.weather] || "？";
        const temperature = `${Math.round(weather.temp)}℃`;
        const displayText = `${icon}${temperature}`;

        writeWeatherCache(storage, {
          timestamp: now,
          data: displayText,
        });

        return displayText;
      } catch (error) {
        console.warn("Weather fetch failed", error);
        return DEFAULT_SUPPLEMENTAL_DATA.weatherText;
      }
    },
  };
}

export function createCalendarService(fetchImpl) {
  return {
    async fetchRokuyo(date) {
      const isoDate = toIsoDate(date);

      try {
        const response = await fetchJson(
          fetchImpl,
          `https://rokuyo-proxy.kinotch.workers.dev/?rokuyo&date=${isoDate}`,
        );
        return response[0]?.rokuyo || DEFAULT_SUPPLEMENTAL_DATA.rokuyoText;
      } catch (error) {
        console.warn("Rokuyo fetch failed", error);
        return DEFAULT_SUPPLEMENTAL_DATA.rokuyoText;
      }
    },

    async fetchMoonPhase(location) {
      try {
        const response = await fetchJson(
          fetchImpl,
          `https://rokuyo-proxy.kinotch.workers.dev/?moon&lat=${location.lat.toFixed(4)}&lon=${location.lon.toFixed(4)}`,
        );
        const moonAge = Number.parseFloat(
          response.result?.[0]?.age ?? Number.NaN,
        );

        if (Number.isNaN(moonAge)) {
          throw new Error("Moon age is missing");
        }

        return getMoonPhaseEmoji(moonAge);
      } catch (error) {
        console.warn("Moon phase fetch failed", error);
        return DEFAULT_SUPPLEMENTAL_DATA.moonEmoji;
      }
    },
  };
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMoonPhaseEmoji(age) {
  for (const entry of MOON_PHASE_EMOJIS) {
    if (age < entry.maxAge) {
      return entry.value;
    }
  }

  return MOON_PHASE_EMOJIS[0].value;
}

function readWeatherCache(storage) {
  try {
    const rawCache = storage.getItem(WEATHER_CACHE_KEY);
    if (!rawCache) {
      return null;
    }

    const parsedCache = JSON.parse(rawCache);
    if (
      typeof parsedCache?.timestamp !== "number" ||
      typeof parsedCache?.data !== "string"
    ) {
      return null;
    }

    return parsedCache;
  } catch (error) {
    console.warn("Weather cache read failed", error);
    return null;
  }
}

function writeWeatherCache(storage, value) {
  try {
    storage.setItem(WEATHER_CACHE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn("Weather cache write failed", error);
  }
}
