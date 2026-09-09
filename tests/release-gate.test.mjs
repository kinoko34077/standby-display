import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const readme = await readFile("README.md", "utf8");
const indexHtml = await readFile("index.html", "utf8");
const styleCss = await readFile("style.css", "utf8");
const legacyStyleCss = await readFile("legacy/style.css", "utf8");

test("production build and deploy scripts pass through the verify gate", () => {
  assert.equal(packageJson.scripts["build:assets"], "node tools/build-assets.mjs");
  assert.equal(packageJson.scripts.verify, "npm test && npm run build:assets");
  assert.equal(packageJson.scripts.build, "npm run verify");
  assert.equal(packageJson.scripts.deploy, "npm run verify && wrangler deploy");
});

test("Workers Builds documentation names the verify command", () => {
  assert.match(readme, /Workers Builds[\s\S]*npm run verify/);
});

test("canonical metadata and runtime assets stay on the offline Workers origin", () => {
  assert.match(indexHtml, /rel="canonical" href="https:\/\/standby-display\.kinotch\.workers\.dev\//);
  assert.match(indexHtml, /property="og:url"[\s\S]*standby-display\.kinotch\.workers\.dev/);
  assert.match(indexHtml, /property="og:image"[\s\S]*standby-display\.kinotch\.workers\.dev/);
  assert.match(indexHtml, /src="assets\/vendor\/iro\.min\.js"/);
  assert.doesNotMatch(indexHtml, /fonts\.googleapis\.com|cdn\.jsdelivr\.net/);
  assert.doesNotMatch(styleCss, /https?:\/\//);
  assert.doesNotMatch(legacyStyleCss, /https?:\/\//);
});
