import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { inflateSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = String.raw`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<main class="main-layout">
  <section class="date-panel"></section>
  <section class="clock-panel">
    <div class="block clock-block">
      <div class="time-line">
        <span id="clock-prefix" class="clock-prefix" aria-hidden="true" hidden></span><span id="hour">21</span><span class="colon">:</span><span id="minute">12</span>
      </div>
      <div id="seconds" class="seconds">:34</div>
    </div>
  </section>
  <section class="extra-panel"></section>
</main>
<script type="module">
import { CLOCK_FONT_OPTIONS } from "/scripts/constants.mjs";
import { sanitizeSettings } from "/scripts/settings.mjs";
import { resolveClockTypography } from "/scripts/render.mjs";

const params = new URLSearchParams(location.search);
const font = params.get("font") ?? "d7";
const hex = params.get("mode") === "hex";
const sizePercent = Number(params.get("size") ?? 100);
const letterSpacingEm = Number(params.get("tracking") ?? 0);
const settings = sanitizeSettings({clock:{font,sizePercent,letterSpacingEm}});
const option = CLOCK_FONT_OPTIONS.find(candidate => candidate.id === font);
if (!option) throw new Error("Unknown font " + font);
const typography = resolveClockTypography(settings);
const root = document.documentElement;
root.style.setProperty("--app-clock-font", typography.family);
root.style.setProperty("--app-clock-font-weight", String(typography.weight));
root.style.setProperty("--app-clock-size-scale", String(typography.sizeScale));
root.style.setProperty("--app-clock-letter-spacing", typography.letterSpacingEm + "em");
root.style.setProperty("--app-clock-secondary-letter-spacing", typography.secondaryLetterSpacingEm + "em");
root.style.setProperty("--app-clock-center-shift", typography.centerShiftEm + "em");
root.style.setProperty("--app-clock-prefix-shift", typography.prefixShiftEm + "em");
root.style.setProperty("--app-clock", "#70b8ff");
const prefix = document.getElementById("clock-prefix");
// Color only the synthetic period red in the probe. Do not reveal the
// hidden font glyph by changing the wrapper's transparent text color.
const probeStyle = document.createElement("style");
probeStyle.textContent = ".clock-prefix::after { background:#ff0000 !important; }";
document.head.appendChild(probeStyle);
if (hex) {
  prefix.hidden = false;
  prefix.textContent = ".";
  document.getElementById("hour").textContent = "80";
  document.querySelector(".colon").textContent = "";
  document.getElementById("minute").textContent = "00";
}
const fontName = typography.family.split(",")[0].trim();
const loaded = await document.fonts.load(typography.weight + ' 32px ' + fontName);
await document.fonts.ready;
await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
window.clockProbe = {
  ready: true,
  font,
  fontFaceCount: loaded.length,
  setPrefixVisible(value) {
    prefix.style.opacity = value ? "1" : "0";
  },
  measure() {
    const rect = element => {
      const b = element.getBoundingClientRect();
      return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};
    };
    return {
      font,
      hex,
      width: innerWidth,
      height: innerHeight,
      fontFaceCount: loaded.length,
      panel:rect(document.querySelector(".clock-panel")),
      line:rect(document.querySelector(".time-line")),
      seconds:rect(document.querySelector(".seconds")),
      prefix:rect(prefix),
      fontName,
    };
  },
};
</script>
</body></html>`;

function findBrowser() {
  for (const candidate of [
    process.env.CHROME_BIN,
    process.env.CHROMIUM_BIN,
    process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : undefined,
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
  ].filter(Boolean)) {
    if (candidate.includes("/") || candidate.includes("\\")) {
      if (existsSync(candidate)) return candidate;
      continue;
    }
    const which = spawnSync(process.platform === "win32" ? "where" : "which", [candidate], {encoding:"utf8"});
    if (which.status === 0) return which.stdout.trim().split(/\r?\n/)[0];
  }
  throw new Error("No Chrome/Chromium binary found; set CHROME_BIN");
}

const mime = ext => ({
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".woff2":"font/woff2",
  ".ttf":"font/ttf",
})[ext] ?? "application/octet-stream";

async function serve() {
  const server = createServer((req, res) => {
    const requestPath = new URL(req.url, "http://localhost").pathname;
    if (requestPath === "/__clock_probe__") {
      res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
      res.end(html);
      return;
    }
    const full = resolve(root, "." + requestPath);
    if (!full.startsWith(root + sep) || !existsSync(full)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {"Content-Type":mime(extname(full))});
    createReadStream(full).pipe(res);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {server, url:"http://127.0.0.1:" + server.address().port + "/__clock_probe__"};
}

async function inspectChrome(temp) {
  const path = join(temp, "DevToolsActivePort");
  // The Actions Ubuntu image may need substantially more than 16s to start
  // Chrome in a fresh profile. Keep polling while the process is alive.
  for (let i=0;i<600;i++) {
    try {
      const content = await readFile(path, "utf8");
      const port = Number(content.split("\n")[0]);
      const response = await fetch("http://127.0.0.1:" + port + "/json");
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find(target => target.type === "page");
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error("Chrome debugging endpoint failed to start");
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    ws.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      clearTimeout(entry.timeout);
      if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
      else entry.resolve(message.result);
    });
  }
  async call(method, params={}, timeoutMs=20000) {
    const id=this.nextId++;
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{
        this.pending.delete(id);
        reject(new Error("CDP timeout: "+method));
      },timeoutMs);
      this.pending.set(id,{resolve,reject,timeout});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  async eval(expr, timeoutMs=20000) {
    const result=await this.call("Runtime.evaluate",{
      expression:expr, awaitPromise:true, returnByValue:true,
    }, timeoutMs);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result?.value;
  }
}

function png(data) {
  const bytes=Buffer.from(data,"base64");
  if (bytes.subarray(0,8).toString("hex")!=="89504e470d0a1a0a") throw Error("Bad PNG signature");
  let offset=8,width=0,height=0,channels=0,depth=0;
  const idat=[];
  while(offset<bytes.length){
    const length=bytes.readUInt32BE(offset); offset+=4;
    const type=bytes.toString("ascii",offset,offset+4); offset+=4;
    const value=bytes.subarray(offset,offset+length); offset+=length+4;
    if(type==="IHDR"){
      width=value.readUInt32BE(0);height=value.readUInt32BE(4);
      depth=value[8]; channels=value[9]===6?4:value[9]===2?3:0;
    }else if(type==="IDAT") idat.push(value);
    else if(type==="IEND") break;
  }
  if(depth!==8||!channels) throw Error("Unsupported PNG pixel format");
  const raw=inflateSync(Buffer.concat(idat));
  const stride=width*channels;
  const rgba=Buffer.alloc(width*height*4);
  let pos=0,prev=Buffer.alloc(stride);
  const paeth=(a,b,c)=>{
    const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
    return pa<=pb&&pa<=pc?a:pb<=pc?b:c;
  };
  for(let y=0;y<height;y++){
    const filter=raw[pos++];
    const row=Buffer.from(raw.subarray(pos,pos+stride));pos+=stride;
    for(let x=0;x<stride;x++){
      const a=x>=channels?row[x-channels]:0;
      const b=prev[x];const c=x>=channels?prev[x-channels]:0;
      const v=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):null;
      if(v===null) throw Error("Bad PNG filter");
      row[x]=(row[x]+v)&255;
    }
    for(let x=0;x<width;x++){
      const src=x*channels,dst=(y*width+x)*4;
      rgba[dst]=row[src];rgba[dst+1]=row[src+1];rgba[dst+2]=row[src+2];rgba[dst+3]=channels===4?row[src+3]:255;
    }
    prev=row;
  }
  return {width,height,rgba};
}

function sampleClock(picture,line) {
  // Restrict ink detection to the primary line. Secondary seconds are
  // absolutely positioned just below it and must not bias the center check.
  const y0=Math.max(0,Math.floor(line.top));
  const y1=Math.min(picture.height-1,Math.ceil(line.bottom)-1);
  let left=Infinity,right=-Infinity;
  const pixels=new Set();
  for(let y=y0;y<=y1;y++) for(let x=0;x<picture.width;x++){
    const i=(y*picture.width+x)*4;
    const r=picture.rgba[i],g=picture.rgba[i+1],b=picture.rgba[i+2];
    if(r>=45 && r<190 && g>r+35 && b>g+30 && b>170){
      left=Math.min(left,x);
      right=Math.max(right,x);
      pixels.add(y*picture.width+x);
    }
  }
  if(left===Infinity) throw new Error("No visible clock ink in screenshot");
  return {left,right,pixels};
}
function samplePrefix(picture,line) {
  const y0=Math.max(0,Math.floor(line.top));
  const y1=Math.min(picture.height-1,Math.ceil(line.bottom)-1);
  let left=Infinity,right=-Infinity,count=0;
  for(let y=y0;y<=y1;y++) for(let x=0;x<picture.width;x++){
    const i=(y*picture.width+x)*4;
    const r=picture.rgba[i],g=picture.rgba[i+1],b=picture.rgba[i+2];
    if(r>190 && g<100 && b<100){
      left=Math.min(left,x);
      right=Math.max(right,x);
      count++;
    }
  }
  return left===Infinity ? null : {left,right,count};
}
async function sleep(ms) {return new Promise(r=>setTimeout(r,ms));}
async function waitProbe(client,font) {
  for(let i=0;i<200;i++){
    try {
      const value=await client.eval('window.clockProbe?.ready && window.clockProbe.font === '+JSON.stringify(font)+' ? window.clockProbe.measure() : null',8000);
      if(value) return value;
    }catch{}
    await sleep(100);
  }
  throw new Error("Clock probe did not become ready for "+font);
}
function assert(condition,message) {if(!condition) throw Error(message);}
const cases=[];
for(const font of ["d7","dseg7-modern","dseg7-classic-mini-bold","rajdhani","mono"])
  for(const viewport of [{width:390,height:844},{width:1100,height:650}])
    for(const mode of ["civil","hex"])
      cases.push({font,viewport,mode,size:100,tracking:0});
for(const tracking of [-0.2,0.2])
  for(const viewport of [{width:390,height:844},{width:1100,height:650}])
    cases.push({font:"d7",viewport,mode:"hex",size:120,tracking});

const artifactDir=join(root,".clock-visual-artifacts");
await mkdir(artifactDir,{recursive:true});
const {server,url}=await serve();
const temp=await mkdtemp(join(tmpdir(),"standby-visual-ci-"));
const browser=spawn(findBrowser(),[
  "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
  "--no-first-run","--no-default-browser-check","--hide-scrollbars",
  "--remote-allow-origins=*","--remote-debugging-port=0",
  "--user-data-dir="+temp,"about:blank",
],{stdio:["ignore","ignore","pipe"]});
let chromeStderr="";
browser.stderr?.on("data",chunk=>{
  chromeStderr=(chromeStderr+chunk.toString()).slice(-5000);
});
let failed=0;
let client=null;
try{
  const wsUrl=await inspectChrome(temp).catch(error=>{
    throw new Error(error.message+" (Chrome exited="+browser.exitCode+") "+chromeStderr);
  });
  const ws=new WebSocket(wsUrl);
  await new Promise((resolve,reject)=>{
    ws.addEventListener("open",resolve,{once:true});
    ws.addEventListener("error",reject,{once:true});
  });
  client=new CDP(ws);
  await client.call("Page.enable");
  await client.call("Runtime.enable");
  for(const scenario of cases){
    const {font,viewport,mode,size,tracking}=scenario;
    const ident=font+" "+viewport.width+"x"+viewport.height+" "+mode+" size="+size+" tracking="+tracking;
    try{
      await client.call("Emulation.setDeviceMetricsOverride",{
        width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:true,
      });
      const target=url+"?"+new URLSearchParams({font,mode,size,tracking});
      await client.call("Page.navigate",{url:target});
      const data=await waitProbe(client,font);
      assert(data.width===viewport.width && data.height===viewport.height,"Viewport emulation mismatch");
      assert(data.fontFaceCount>0,"Expected font was not loaded: "+data.fontName);
      await client.eval("window.clockProbe.setPrefixVisible(false)");
      const hiddenCapture=await client.call("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
      const hidden=png(hiddenCapture.data);
      if(size===100 && tracking===0 && mode==="civil") {
        await writeFile(join(artifactDir,font+"-"+viewport.width+"x"+viewport.height+"-civil.png"),Buffer.from(hiddenCapture.data,"base64"));
      }
      const base=sampleClock(hidden,data.line);
      const center=(base.left+base.right)/2;
      const error=center-data.width/2;
      assert(
        Math.abs(error)<=4,
        "Visible glyph center error="+error.toFixed(2)+"px "+
          JSON.stringify({panel:data.panel,line:data.line,ink:[base.left,base.right]}),
      );
      const deltaSeconds=Math.abs(data.seconds.right-data.line.right);
      assert(deltaSeconds<=5,"Secondary seconds right-edge drift="+deltaSeconds.toFixed(2)+"px");
      if(mode==="hex" && size===100 && tracking===0){
        await client.eval("window.clockProbe.setPrefixVisible(true)");
        const visibleCapture=await client.call("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
        const visible=png(visibleCapture.data);
        await writeFile(join(artifactDir,font+"-"+viewport.width+"x"+viewport.height+"-hex.png"),Buffer.from(visibleCapture.data,"base64"));
        const period=samplePrefix(visible,data.line);
        assert(period,"No visible period ink");
        const gap=base.left-period.right-1;
        assert(
          gap>=0 && gap<=7,
          "Period visible gap="+gap+"px "+
            JSON.stringify({line:data.line,prefix:data.prefix,inkLeft:base.left,periodRight:period.right,periodCount:period.count}),
        );
      }
      console.log("PASS",ident,"visible-center="+error.toFixed(2)+"px");
    }catch(e){
      failed++;console.error("FAIL",ident,e.message);
    }
  }
  ws.close();
}finally{
  browser.kill();
  server.close();
  for(let attempt=0;attempt<10;attempt++){
    try {
      await rm(temp,{recursive:true,force:true});
      break;
    } catch (error) {
      if(error?.code!=="ENOTEMPTY" || attempt===9) throw error;
      await sleep(100);
    }
  }
}
if(failed) {
  console.error("Browser geometry failures:",failed,"/",cases.length);
  process.exitCode=1;
}else console.log("Browser geometry PASS:",cases.length,"cases");
