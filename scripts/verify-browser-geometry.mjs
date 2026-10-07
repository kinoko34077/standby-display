import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (/\.(?:m?js)$/.test(filePath)) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  if (filePath.endsWith(".ttf")) return "font/ttf";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const filePath = path.resolve(root, "." + pathname);
    if (!filePath.startsWith(root + path.sep)) {
      response.writeHead(403).end("forbidden");
      return;
    }
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, {
      "content-type": contentType(filePath),
      "cache-control": "no-store",
    });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404).end("not found");
  }
});

async function listen() {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "google-chrome-stable",
    "google-chrome",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ["--version"], { timeout: 5000 });
      return candidate;
    } catch {
      // Try the next GitHub-hosted-runner/browser executable.
    }
  }
  throw new Error(
    "No Chrome/Chromium executable found. Set CHROME_BIN or install Chrome.",
  );
}

async function runSuite(chrome, port, suite) {
  const sizes = {
    landscape: [1365, 768],
    portrait: [1170, 2532],
  };
  const [width, height] = sizes[suite];
  const target =
    `http://127.0.0.1:${port}/tests/browser-geometry.html?suite=${suite}`;
  const { stdout, stderr } = await execFileAsync(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--disable-component-update",
      `--window-size=${width},${height}`,
      "--virtual-time-budget=60000",
      "--dump-dom",
      target,
    ],
    {
      timeout: 120000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  const match = stdout.match(
    /<pre id="result" data-status="(pass|fail)">([^<]*)<\/pre>/,
  );
  if (!match) {
    throw new Error(
      `Browser geometry suite ${suite} did not publish a result.\n${stderr}`,
    );
  }

  const decoded = match[2]
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
  const payload = JSON.parse(decoded);
  if (match[1] !== "pass") {
    throw new Error(
      `Browser geometry suite ${suite} failed:\n${JSON.stringify(payload, null, 2)}`,
    );
  }

  console.log(
    `${suite}: PASS (${payload.measurements.length} rendered geometry cases)`,
  );
}

const port = await listen();
try {
  const chrome = await findChrome();
  for (const suite of ["landscape", "portrait"]) {
    await runSuite(chrome, port, suite);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
