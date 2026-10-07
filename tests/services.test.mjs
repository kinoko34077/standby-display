import test from "node:test";
import assert from "node:assert/strict";

import { WEATHER_CACHE_KEY } from "../scripts/constants.mjs";
import {
  createLocationService,
  createWeatherService,
  estimateClockOffset,
  fetchJson,
} from "../scripts/services.mjs";

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


test("estimates synchronized clock offset with half-RTT compensation", () => {
  assert.equal(
    estimateClockOffset({
      requestStartedAt: 1000,
      responseReceivedAt: 1100,
      serverTime: 1050,
    }),
    0,
  );

  assert.equal(
    estimateClockOffset({
      requestStartedAt: 1000,
      responseReceivedAt: 1100,
      serverTime: 1550,
    }),
    500,
  );
});

test("rejects invalid clock-sync timing observations", () => {
  assert.throws(
    () =>
      estimateClockOffset({
        requestStartedAt: 1100,
        responseReceivedAt: 1000,
        serverTime: 1050,
      }),
    /precedes request/,
  );
  assert.throws(
    () =>
      estimateClockOffset({
        requestStartedAt: 1000,
        responseReceivedAt: Number.NaN,
        serverTime: 1050,
      }),
    /finite/,
  );
});


test("location cache expires and force refresh bypasses a fresh coordinate", async () => {
  let nowMs = 1000;
  let calls = 0;
  const optionsSeen = [];
  const geolocation = {
    getCurrentPosition(success, _error, options) {
      calls += 1;
      optionsSeen.push(options);
      success({
        coords: {
          latitude: 35 + calls,
          longitude: 139 + calls,
        },
      });
    },
  };
  const service = createLocationService(geolocation, {
    now: () => nowMs,
    maxAgeMs: 900000,
  });

  const first = await service.getCurrentPosition();
  assert.deepEqual(first, { lat: 36, lon: 140 });
  assert.equal(calls, 1);

  nowMs += 899999;
  assert.deepEqual(await service.getCurrentPosition(), first);
  assert.equal(calls, 1);

  nowMs += 1;
  assert.deepEqual(await service.getCurrentPosition(), { lat: 37, lon: 141 });
  assert.equal(calls, 2);

  nowMs += 1;
  assert.deepEqual(
    await service.getCurrentPosition({ force: true }),
    { lat: 38, lon: 142 },
  );
  assert.equal(calls, 3);
  assert.equal(optionsSeen.at(-1).maximumAge, 0);
});

test("location invalidation and concurrent requests preserve one in-flight lookup", async () => {
  let successCallback;
  let calls = 0;
  const geolocation = {
    getCurrentPosition(success) {
      calls += 1;
      successCallback = success;
    },
  };
  const service = createLocationService(geolocation, {
    now: () => 1000,
    maxAgeMs: 900000,
  });

  const first = service.getCurrentPosition();
  const second = service.getCurrentPosition({ force: true });
  assert.equal(calls, 1);

  successCallback({ coords: { latitude: 35.5, longitude: 139.5 } });
  assert.deepEqual(await first, { lat: 35.5, lon: 139.5 });
  assert.deepEqual(await second, { lat: 35.5, lon: 139.5 });

  service.invalidate();
  const third = service.getCurrentPosition();
  assert.equal(calls, 2);
  successCallback({ coords: { latitude: 36, longitude: 140 } });
  assert.deepEqual(await third, { lat: 36, lon: 140 });
});

test("fetchJson aborts a request when the application timeout expires", async () => {
  let timeoutCallback;
  let aborted = false;
  class FakeAbortController {
    constructor() {
      this.signal = {};
    }
    abort() {
      aborted = true;
    }
  }

  const request = fetchJson(
    () => new Promise(() => {}),
    "https://example.test/hung",
    {
      timeoutMs: 25,
      AbortControllerImpl: FakeAbortController,
      setTimeoutImpl(callback) {
        timeoutCallback = callback;
        return 1;
      },
      clearTimeoutImpl() {},
    },
  );

  timeoutCallback();
  await assert.rejects(request, /Request timed out after 25ms/);
  assert.equal(aborted, true);
});

test("fetchJson clears its timeout after a successful response", async () => {
  let cleared = null;
  const result = await fetchJson(
    async () => ({
      ok: true,
      async json() {
        return { ok: true };
      },
    }),
    "https://example.test/ok",
    {
      timeoutMs: 25,
      setTimeoutImpl() {
        return 17;
      },
      clearTimeoutImpl(id) {
        cleared = id;
      },
    },
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(cleared, 17);
});
