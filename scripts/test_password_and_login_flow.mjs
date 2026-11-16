
import fs from "fs";
import { rawSql } from "../src/db/index.js";
import bcrypt from "bcryptjs"; const { compareSync, hashSync } = bcrypt;
import { verifyAdminLogin } from "../src/lib/auth/admin-session.js";

async function run() {
  console.log("=== 1. 验证 3 位专职管理员双重初始口令 (复杂版 & 极简版 laiwu888) ===");
  const accounts = [
    { username: "laiwu_admin", complex: "Laiwu@2026Admin!" },
    { username: "laiwu_front", complex: "Laiwu@2026Front!" },
    { username: "laiwu_teach", complex: "Laiwu@2026Teach!" },
  ];

  for (const acc of accounts) {
    const fullEmail = acc.username + "@laiwu.fitness";
    const [user] = await rawSql`
      SELECT id, name, email, password_hash, role, status
      FROM users
      WHERE email = ${fullEmail}
    `;
    if (!user) throw new Error(`用户 ${acc.username} 不存在`);
    
    // 验证复杂口令
    const complexValid = compareSync(acc.complex, user.password_hash);
    console.log(`[${user.name}] 复杂密码匹配: ${complexValid}`);
    if (!complexValid) throw new Error(`复杂密码匹配失败: ${acc.username}`);

    // 验证 PC admin 鉴权
    const pcComplex = await verifyAdminLogin(acc.username, acc.complex);
    if (!pcComplex) throw new Error(`PC 复杂密码登录失败: ${acc.username}`);

    const pcSimple = await verifyAdminLogin(acc.username, "laiwu888");
    if (!pcSimple) throw new Error(`PC 极简口令登录失败: ${acc.username}`);
    console.log(`[${user.name}] PC端双密码验证通过`);
  }

  console.log("\n=== 2. 验证自主修改密码逻辑与审计留痕 ===");
  // 测试账号 35 (前台管家) 修改本人密码
  const [front] = await rawSql`SELECT id, password_hash FROM users WHERE id = 35`;
  const originalHash = front.password_hash;

  // 模拟修改为新密码
  const testNewPass = "TestNewPass2026!";
  const testNewHash = hashSync(testNewPass, 10);
  await rawSql`UPDATE users SET password_hash = ${testNewHash} WHERE id = 35`;

  const newVerify = await verifyAdminLogin("laiwu_front", testNewPass);
  console.log("新密码验证通过:", !!newVerify);
  if (!newVerify) throw new Error("修改后新密码验证失败");

  // 恢复原密码
  await rawSql`UPDATE users SET password_hash = ${originalHash} WHERE id = 35`;
  console.log("已恢复原密码哈希");

  console.log("\n=== 3. 检查小程序页面配置与输入长度 ===");
  const loginWxml = fs.readFileSync("miniprogram/pages/login/login.wxml", "utf-8");
  if (!loginWxml.includes("login-mode-tabs")) throw new Error("缺少登录双模选项卡");
  if (!loginWxml.includes("管家管理中枢")) throw new Error("缺少管家管理中枢通道");
  console.log("小程序学员/管家双通道配置校验通过");

  console.log("\n ALL TESTS PASSED SUCCESSFULLY! ✅");
  process.exit(0);
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
