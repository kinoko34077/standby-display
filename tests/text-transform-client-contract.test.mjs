import test from "node:test";
import assert from "node:assert/strict";
import { createTextTransformClient } from "../vendor/text-transform.mjs";

test("standby vendor client retries transient API failures", async () => {
  let attempts = 0;
  const client = createTextTransformClient({
    retryBaseDelayMs: 0,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response(JSON.stringify({ error: "temporary" }), { status: 503 });
      }
      return new Response(JSON.stringify({ text: "國" }), { status: 200 });
    },
  });

  assert.deepEqual(await client.transform("国", { profile: ["legacy-kanji"] }), { text: "國" });
  assert.equal(attempts, 2);
});

test("standby vendor client falls back on malformed successful responses", async () => {
  const client = createTextTransformClient({
    maxRetries: 0,
    fetchImpl: async () => new Response(JSON.stringify({ texts: ["國"] }), { status: 200 }),
    fallback: {
      transform: (_text, _options, error) => ({ fallbackCode: error.code }),
    },
  });

  assert.deepEqual(await client.transform("国", { profile: ["legacy-kanji"] }), {
    fallbackCode: "invalid_response",
  });
});
