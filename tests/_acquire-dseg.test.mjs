import test from "node:test";
import assert from "node:assert/strict";

test("TEMP acquire official DSEG7 Classic Mini Bold asset", async () => {
  const url = "https://cdn.jsdelivr.net/npm/dseg@0.46.0/fonts/DSEG7-Classic-MINI/DSEG7ClassicMini-Bold.woff2";
  const response = await fetch(url);
  assert.equal(response.ok, true, `DSEG download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2");
  console.log("DSEG_WOFF2_BASE64_BEGIN");
  console.log(bytes.toString("base64"));
  console.log("DSEG_WOFF2_BASE64_END");
});
