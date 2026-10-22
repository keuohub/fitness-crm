import fs from "node:fs";
import { requireDbWriteGuard } from "./_db-write-guard.mjs";
import { neon } from "@neondatabase/serverless";

const BASE = "http://localhost:3001";
const CDP = "http://127.0.0.1:9451";
const envText = fs.readFileSync(".env.local", "utf8");
const sql = neon((envText.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
requireDbWriteGuard("browser-acceptance", (envText.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const envMap = Object.fromEntries(envText.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }));
const ADMIN_PASSWORD = process.env.S6_ADMIN_PASSWORD || envMap.ADMIN_PASSWORD || "";

async function loginCookies() {
  const res = await fetch(BASE + "/api/admin/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin", password: ADMIN_PASSWORD }),
  });
  return (res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")])
    .map((c) => c.split(";")[0]).filter(Boolean);
}

class CDPClient {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = new Map(); }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    const c = new CDPClient(ws);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && c.pending.has(msg.id)) {
        const { resolve, reject } = c.pending.get(msg.id); c.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method && c.events.has(msg.method)) {
        for (const fn of c.events.get(msg.method)) fn(msg.params);
      }
    };
    return c;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) { if (!this.events.has(method)) this.events.set(method, []); this.events.get(method).push(fn); }
  close() { this.ws.close(); }
}

async function newTarget(url) {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!res.ok) throw new Error("new target failed " + res.status);
  return res.json();
}

async function main() {
  const cookies = await loginCookies();
  if (!cookies.length) throw new Error("admin login cookie missing");

  const target = await newTarget(BASE + "/admin/login");
  const c = await CDPClient.connect(target.webSocketDebuggerUrl);
  await c.send("Page.enable");
  await c.send("Network.enable");
  await c.send("Runtime.enable");
  await c.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
  for (const pair of cookies) {
    const i = pair.indexOf("=");
    await c.send("Network.setCookie", { name: pair.slice(0, i), value: pair.slice(i + 1), domain: "localhost", path: "/" });
  }

  const pages = [
    ["/admin/cards", "会员卡与开卡", "s6-admin-cards"],
    ["/admin/schedule", "周排课表", "s6-admin-schedule"],
    ["/admin/bookings", "预约名单", "s6-admin-bookings"],
    ["/admin/followups", "跟进名单", "s6-admin-followups"],
    ["/admin/coach", "今日课表", "s6-admin-coach"],
  ];
  fs.mkdirSync("docs/visual", { recursive: true });
  for (const [path, expect, name] of pages) {
    await c.send("Page.navigate", { url: BASE + path });
    await sleep(2500);
    const body = await c.send("Runtime.evaluate", { expression: "document.body.innerText", returnByValue: true });
    const text = body.result?.value || "";
    if (!text.includes(expect)) throw new Error(`${path} 未渲染预期文本: ${expect} / got ${text.slice(0, 80)}`);
    const shot = await c.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    fs.writeFileSync(`docs/visual/${name}.png`, Buffer.from(shot.data, "base64"));
    console.log("PASS browser", path, "text", text.replace(/\s+/g, " ").slice(0, 60));
  }

  // coach page: create a temporary coach and inject token
  const create = await fetch(BASE + "/api/admin/coaches", {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: cookies.join("; ") },
    body: JSON.stringify({ name: "S6浏览器验收教练", email: `s6browser-${Date.now()}@laiwu.local`, password: "S6Browser!2026" }),
  });
  const coach = await create.json();
  if (!create.ok) throw new Error("coach create failed " + JSON.stringify(coach));
  const login = await fetch(BASE + "/api/coach/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: coach.email, password: "S6Browser!2026" }),
  });
  const coachLogin = await login.json();
  await c.send("Page.navigate", { url: BASE + "/coach" });
  await sleep(1200);
  await c.send("Runtime.evaluate", { expression: `localStorage.setItem("coachToken", ${JSON.stringify(coachLogin.token)}); localStorage.setItem("coachName", ${JSON.stringify(coach.name)});` });
  await c.send("Page.reload");
  await sleep(2000);
  const coachBody = await c.send("Runtime.evaluate", { expression: "document.body.innerText", returnByValue: true });
  const coachText = coachBody.result?.value || "";
  if (!coachText.includes("的课")) throw new Error("coach page not rendered: " + coachText.slice(0, 80));
  const coachShot = await c.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  fs.writeFileSync("docs/visual/s6-coach.png", Buffer.from(coachShot.data, "base64"));
  console.log("PASS browser /coach");

  await sql`DELETE FROM users WHERE id=${coach.id}`;
  c.close();
}

try { await main(); console.log("browser acceptance done"); } catch (e) { console.error("BROWSER FAIL", e.message); process.exitCode = 1; }
