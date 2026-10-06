import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CLOCK_FONT_OPTIONS } from "../scripts/constants.mjs";
import { parseSettingsFromSearch, sanitizeSettings } from "../scripts/settings.mjs";

const root = new URL("../", import.meta.url);

test("DSEG7 Classic Mini Bold is a selectable bundled clock font", async () => {
  const option = CLOCK_FONT_OPTIONS.find(
    (candidate) => candidate.id === "dseg7-classic-mini-bold",
  );
  assert.deepEqual(option, {
    id: "dseg7-classic-mini-bold",
    label: "DSEG7 Classic Mini Bold",
    family: "\"DSEG7-Classic-MINI\", \"D7\", \"Rajdhani\", sans-serif",
  });

  const parsed = parseSettingsFromSearch("?clockfont=dseg7-classic-mini-bold");
  const settings = sanitizeSettings(parsed);
  assert.equal(settings.clock.font, "dseg7-classic-mini-bold");

  const css = await readFile(new URL("style.css", root), "utf8");
  assert.match(css, /font-family: "DSEG7-Classic-MINI"/);
  assert.match(css, /assets\/fonts\/dseg7-classic-mini-bold\.woff2/);
  assert.match(css, /font-weight: 700/);

  const font = await readFile(
    new URL("assets/fonts/dseg7-classic-mini-bold.woff2", root),
  );
  assert.equal(font.subarray(0, 4).toString("ascii"), "wOF2");

  const worker = await readFile(new URL("service-worker.js", root), "utf8");
  assert.match(worker, /assets\/fonts\/dseg7-classic-mini-bold\.woff2/);

  const license = await readFile(
    new URL("assets/fonts/DSEG-LICENSE.txt", root),
    "utf8",
  );
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(license, /Reserved Font Name "DSEG"/);
});
