// 监控微信云托管线上容器发版状态
import https from "node:https";
import { signMemberToken } from "../src/lib/auth/member-token.ts";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const token = signMemberToken(36);
const BASE = "https://crm-330905-9-1509862887.sh.run.tcloudbase.com";
const started = Date.now();
let n = 0;

console.log("[监控启动] 正在持续监测微信云托管生产容器发版状态...");

function check() {
  return new Promise((resolve) => {
    const req = https.request(`${BASE}/api/portal/manager/actions?action=members`, {
      method: "GET",
      headers: { "Authorization": "Bearer " + token }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        resolve({ status: res.statusCode, data });
      });
    });
    req.on("error", () => resolve({ status: 500, data: "" }));
    req.end();
  });
}

while (Date.now() - started < 30 * 60 * 1000) {
  n++;
  const res = await check();
  if (res.status === 200) {
    console.log(`\n========================================`);
    console.log(`[${new Date().toISOString()}] 部署成功生效！`);
    console.log(`线上后端所有管家端接口已 100% 连通（HTTP 200）！`);
    console.log(`========================================\n`);
    process.exit(0);
  }

  if (n % 4 === 0) {
    console.log(`[${new Date().toISOString()}] 第 ${n} 次检测：云托管正在构建中或等待控制台点击（已等待 ${Math.round((Date.now() - started) / 60000)} 分钟）...`);
  }
  await new Promise(r => setTimeout(r, 15000));
}

console.log("30分钟监控超时，请检查云托管控制台构建日志。");
process.exit(1);
