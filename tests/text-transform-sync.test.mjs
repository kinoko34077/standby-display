import test from "node:test";
import assert from "node:assert/strict";
import { access, cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("generated text client is present and the sync check command is available", async () => {
  await access(path.join(root, "vendor", "text-transform.mjs"));
  const result = await runNode(["scripts/tools/sync-text-client.mjs", "--check"]);
  assert.equal(result.code, 0, result.stderr || result.stdout);
});

test("standalone checkout can verify the vendored client without the source repo", async () => {
  const checkout = await mkdtemp(path.join(os.tmpdir(), "standby-display-standalone-"));
  try {
    await mkdir(path.join(checkout, "scripts", "tools"), { recursive: true });
    await mkdir(path.join(checkout, "vendor"), { recursive: true });
    await cp(path.join(root, "scripts", "tools", "sync-text-client.mjs"), path.join(checkout, "scripts", "tools", "sync-text-client.mjs"));
    await cp(path.join(root, "vendor", "text-transform.mjs"), path.join(checkout, "vendor", "text-transform.mjs"));
    await cp(path.join(root, "vendor", "text-transform.mjs.sha256"), path.join(checkout, "vendor", "text-transform.mjs.sha256"));
    const result = await runNode(["scripts/tools/sync-text-client.mjs", "--check"], { cwd: checkout });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.match(`${result.stdout}${result.stderr}`, /canonical source unavailable/i);

    const vendorPath = path.join(checkout, "vendor", "text-transform.mjs");
    const vendor = await readFile(vendorPath, "utf8");
    await writeFile(vendorPath, `${vendor}\n// tampered`, "utf8");
    const tampered = await runNode(["scripts/tools/sync-text-client.mjs", "--check"], { cwd: checkout });
    assert.notEqual(tampered.code, 0);
    assert.match(`${tampered.stdout}${tampered.stderr}`, /hash does not match/i);
  } finally {
    await rm(checkout, { recursive: true, force: true });
  }
});

test("an explicit missing canonical source fails instead of silently downgrading the check", async () => {
  const missingSource = path.join(root, ".missing-kinotch-api-for-test");
  const result = await runNode([
    "scripts/tools/sync-text-client.mjs",
    "--check",
    "--source",
    missingSource,
  ]);
  assert.notEqual(result.code, 0);
  assert.match(`${result.stdout}${result.stderr}`, /canonical source repo is unavailable/i);
});

function runNode(args, { cwd = root } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
