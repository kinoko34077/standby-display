import test from "node:test";
import assert from "node:assert/strict";

import { createSingleFlightRunner } from "../scripts/clock-app.mjs";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

test("single-flight runner deduplicates overlap and allows a later retry", async () => {
  const run = createSingleFlightRunner();
  const firstTask = deferred();
  let firstCalls = 0;

  const first = run(() => {
    firstCalls += 1;
    return firstTask.promise;
  });
  const overlapping = run(() => {
    firstCalls += 1;
    return Promise.resolve("wrong");
  });

  assert.equal(first, overlapping);
  assert.equal(firstCalls, 0);
  await Promise.resolve();
  assert.equal(firstCalls, 1);

  firstTask.resolve("first");
  assert.equal(await first, "first");

  let laterCalls = 0;
  const later = await run(async () => {
    laterCalls += 1;
    return "later";
  });
  assert.equal(later, "later");
  assert.equal(laterCalls, 1);
});

test("single-flight runner releases the slot after rejection", async () => {
  const run = createSingleFlightRunner();

  await assert.rejects(
    run(async () => {
      throw new Error("first failed");
    }),
    /first failed/,
  );

  assert.equal(await run(async () => "recovered"), "recovered");
});
