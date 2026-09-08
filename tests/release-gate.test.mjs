import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const readme = await readFile("README.md", "utf8");

test("production build and deploy scripts pass through the verify gate", () => {
  assert.equal(packageJson.scripts["build:assets"], "node tools/build-assets.mjs");
  assert.equal(packageJson.scripts.verify, "npm test && npm run build:assets");
  assert.equal(packageJson.scripts.build, "npm run verify");
  assert.equal(packageJson.scripts.deploy, "npm run verify && wrangler deploy");
});

test("Workers Builds documentation names the verify command", () => {
  assert.match(readme, /Workers Builds[\s\S]*npm run verify/);
});
