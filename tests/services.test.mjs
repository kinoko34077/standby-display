import test from "node:test";
import assert from "node:assert/strict";

import { WEATHER_CACHE_KEY } from "../scripts/constants.mjs";
import { createWeatherService } from "../scripts/services.mjs";

function createStorage(initialValue) {
  let value = initialValue ?? null;
  return {
    getItem() {
      return value;
    },
    setItem(_key, nextValue) {
      value = nextValue;
    },
    read() {
      return value;
    },
  };
}

function createWeatherFetch(response = { temp: 21.4, weather: "Clear" }) {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return {
      ok: true,
      async json() {
        return response;
      },
    };
  };
  return { fetchImpl, urls };
}

test("reuses a fresh weather cache for the same location", async () => {
  const storage = createStorage(JSON.stringify({
    timestamp: Date.now(),
    lat: 35.6812,
    lon: 139.7671,
    data: "☀21℃",
  }));
  const { fetchImpl, urls } = createWeatherFetch();
  const service = createWeatherService(fetchImpl, storage);

  const result = await service.fetchWeather({ lat: 35.6812, lon: 139.7671 });

  assert.equal(result, "☀21℃");
  assert.equal(urls.length, 0);
});

test("reuses a fresh weather cache for a nearby location", async () => {
  const storage = createStorage(JSON.stringify({
    timestamp: Date.now(),
    lat: 35.6812,
    lon: 139.7671,
    data: "☀21℃",
  }));
  const { fetchImpl, urls } = createWeatherFetch();
  const service = createWeatherService(fetchImpl, storage);

  const result = await service.fetchWeather({ lat: 35.686, lon: 139.771 });

  assert.equal(result, "☀21℃");
  assert.equal(urls.length, 0);
});

test("fetches weather again when the location changes", async () => {
  const storage = createStorage(JSON.stringify({
    timestamp: Date.now(),
    lat: 35.6812,
    lon: 139.7671,
    data: "☀21℃",
  }));
  const { fetchImpl, urls } = createWeatherFetch({ temp: 8.6, weather: "Rain" });
  const service = createWeatherService(fetchImpl, storage);

  const result = await service.fetchWeather({ lat: 34.6937, lon: 135.5023 });

  assert.equal(result, "🌧9℃");
  assert.equal(urls.length, 1);
  assert.match(urls[0], /lat=34\.6937&lon=135\.5023$/);
});

test("treats a legacy weather cache without coordinates as a miss", async () => {
  const storage = createStorage(JSON.stringify({
    timestamp: Date.now(),
    data: "☀21℃",
  }));
  const { fetchImpl, urls } = createWeatherFetch();
  const service = createWeatherService(fetchImpl, storage);

  const result = await service.fetchWeather({ lat: 35.6812, lon: 139.7671 });

  assert.equal(result, "☀21℃");
  assert.equal(urls.length, 1);
});

test("stores the fetched weather location in the cache payload", async () => {
  const storage = createStorage();
  const { fetchImpl } = createWeatherFetch();
  const service = createWeatherService(fetchImpl, storage);

  await service.fetchWeather({ lat: 35.6812, lon: 139.7671 });

  const cache = JSON.parse(storage.read());
  assert.equal(typeof cache.timestamp, "number");
  assert.deepEqual(cache, {
    timestamp: cache.timestamp,
    lat: 35.6812,
    lon: 139.7671,
    data: "☀21℃",
  });
  assert.equal(storage.getItem(WEATHER_CACHE_KEY) !== null, true);
});
