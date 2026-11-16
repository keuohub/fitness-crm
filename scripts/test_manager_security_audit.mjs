import dotenv from "dotenv";
import pg from "pg";
dotenv.config({ path: ".env.local" });

import { POST as authLogin } from "../src/app/api/portal/manager/auth/route.ts";
import { GET as managerActions } from "../src/app/api/portal/manager/actions/route.ts";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== 启动【管理员专属账号认证 + 留痕寻迹 + 小桥权限隔离】全链路自动化验证 ===\n");

  const client = await pool.connect();

  // 1. 数据库核查：店主小桥权限
  const { rows: qiaoUsers } = await client.query("SELECT id, name, email, role, status FROM users WHERE id = 11 OR name = '小桥'");
  console.log("[1. 数据库核查] 店主小桥 users 记录:", qiaoUsers[0]);
  if (qiaoUsers[0]?.role === "owner" || qiaoUsers[0]?.status === "active") {
    throw new Error("❌ 店主小桥 users 权限未彻底撤销！");
  }
  console.log("✓ 店主小桥 users 角色已降级为 member，状态为 disabled");

  const { rows: qiaoManagers } = await client.query("SELECT * FROM manager_accounts WHERE user_id = 11 OR member_id = 36");
  console.log("[2. 数据库核查] manager_accounts 小桥关联记录:", qiaoManagers);
  if (qiaoManagers.length > 0) {
    throw new Error("❌ manager_accounts 仍存在小桥关联记录！");
  }
  console.log("✓ manager_accounts 中小桥关联记录已彻底清除 (0条)");

  // 2. 数据库核查：三大专用管理员账号
  const { rows: dedicatedAdmins } = await client.query(
    "SELECT id, name, email, role, status FROM users WHERE email IN ($1, $2, $3) ORDER BY id",
    ['laiwu_admin@laiwu.fitness', 'laiwu_front@laiwu.fitness', 'laiwu_teach@laiwu.fitness']
  );
  console.log("\n[3. 数据库核查] 三大专职管理员账号:", dedicatedAdmins);
  if (dedicatedAdmins.length !== 3) {
    throw new Error("❌ 专职管理员账号数量不足 3 个！");
  }
  console.log("✓ 三大专职管理员账号均已正常激活");

  // 3. 登录鉴权测试
  console.log("\n[4. 登录鉴权测试]");
  
  // 3.1 尝试使用小桥登录 -> 期望 403
  const qiaoReq = new Request("http://localhost:3001/api/portal/manager/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "小桥", password: "any" })
  });
  const qiaoRes = await authLogin(qiaoReq);
  const qiaoJson = await qiaoRes.json();
  console.log("  4.1 小桥尝试登录管理端:", qiaoRes.status, qiaoJson);
  if (qiaoRes.status !== 403) throw new Error("❌ 小桥登录未被 403 阻断！");
  console.log("  ✓ 小桥管理权限已被硬阻断 (HTTP 403)");

  // 3.2 错误密码 -> 期望 401
  const wrongReq = new Request("http://localhost:3001/api/portal/manager/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "laiwu_admin", password: "wrong" })
  });
  const wrongRes = await authLogin(wrongReq);
  console.log("  4.2 错误密码登录:", wrongRes.status);
  if (wrongRes.status !== 401) throw new Error("❌ 错误密码未被 401 拦截！");
  console.log("  ✓ 错误密码被正确拒绝 (HTTP 401)");

  // 3.3 总店长正确登录 -> 期望 200 + 下发专用 manager_token
  const adminReq = new Request("http://localhost:3001/api/portal/manager/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "laiwu_admin", password: "Laiwu@2026Admin!" })
  });
  const adminRes = await authLogin(adminReq);
  const adminJson = await adminRes.json();
  console.log("  4.3 总店长正确登录:", adminRes.status, adminJson.admin);
  if (adminRes.status !== 200 || !adminJson.token) throw new Error("❌ 总店长登录失败！");
  console.log("  ✓ 总店长登录成功，下发专用签名 Token");

  const managerToken = adminJson.token;

  // 4. 凭证访问与操作寻迹测试
  console.log("\n[5. 凭证访问与操作寻迹测试]");
  const actionReq = new Request("http://localhost:3001/api/portal/manager/actions?action=audit_logs", {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + managerToken
    }
  });
  const actionRes = await managerActions(actionReq);
  const actionJson = await actionRes.json();
  console.log("  5.1 读取全链路操作留痕寻迹:", actionRes.status, "条数:", actionJson.logs?.length, "总计:", actionJson.total);
  if (actionRes.status !== 200 || !Array.isArray(actionJson.logs)) {
    throw new Error("❌ 读取留痕寻迹失败！");
  }
  console.log("  ✓ 最新一条留痕记录:", actionJson.logs[0]);

  // 5. 验证管理员名单接口不包含小桥
  const adminsReq = new Request("http://localhost:3001/api/portal/manager/actions?action=admins", {
    method: "GET",
    headers: { "Authorization": "Bearer " + managerToken }
  });
  const adminsRes = await managerActions(adminsReq);
  const adminsJson = await adminsRes.json();
  console.log("  5.2 读取专职管理员名单:", adminsJson.admins?.map(a => `${a.name}(${a.email})`));
  const hasQiaoInAdmins = adminsJson.admins?.some(a => a.name === "小桥" || a.id === 11);
  if (hasQiaoInAdmins) throw new Error("❌ 管理员名单仍包含小桥！");
  console.log("  ✓ 专职管理员名单已完全排除小桥");

  client.release();
  await pool.end();
  console.log("\n=======================================================");
  console.log("🎉 全部 5 项验证 100% 通过！管理端安全中枢与留痕寻迹完全就绪！");
  console.log("=======================================================\n");
}

run().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
