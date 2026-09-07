import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.resolve(root, "dist");
if (path.dirname(output) !== path.resolve(root)) throw new Error("Unsafe output directory");
// Keep the directory itself: Wrangler's Windows watcher may hold it open.
await mkdir(output, { recursive: true });
for (const entry of await readdir(output)) {
  const stale = path.resolve(output, entry);
  if (path.dirname(stale) !== output) throw new Error("Unsafe asset path");
  await rm(stale, { recursive: true, force: true });
}
for (const file of ["index.html", "style.css", "app.mjs", "bootstrap.js", "modern-entry.mjs",
  "manifest.json", "service-worker.js", "icon-192.png", "assets", "scripts", "shared", "legacy"]) {
  await cp(path.join(root, file), path.join(output, file), { recursive: true });
}
console.log(`Static Assets ready: ${output}`);
