// 自动监控云托管发版状态
import fs from "node:fs";

const BASE = "https://crm-330905-9-1509862887.sh.run.tcloudbase.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const started = Date.now();
let n = 0;

console.log("开始持续监控云托管线上发版状态...");

while (Date.now() - started < 30 * 60 * 1000) {
  n++;
  try {
    const loginRes = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin", password: "z2rWW5qIL6XldYldxdB2" }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${BASE}/admin/coach`, {
      headers: { cookie },
    });
    const html = await res.text();

    if (html.includes("点击展开日历")) {
      console.log(`[${new Date().toISOString()}] 恭喜！检测到云托管新版本（可视化大日历表）已全量发布成功生效！`);
      process.exit(0);
    }
  } catch (err) {
    // network retry
  }

  if (n % 4 === 0) {
    console.log(`[${new Date().toISOString()}] 第 ${n} 次轮询检测：云托管正在构建打包中（已等待 ${Math.round((Date.now() - started) / 60000)} 分钟）...`);
  }
  await sleep(15000);
}

console.log("30分钟轮询超时");
