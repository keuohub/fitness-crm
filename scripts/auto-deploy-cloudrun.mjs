// 微信云托管全自动代管部署脚本
import { execSync } from "node:child_process";

const script = `
const task = await taskSpace("cloudrun deploy task");
const page = task.page("p1");

console.log("[自动化代管] 等待微信扫码并确认中...");
const startWait = Date.now();
let loggedIn = false;

while (Date.now() - startWait < 10 * 60 * 1000) {
  const url = await page.url();
  if (!url.includes("qrLogin")) {
    console.log("[扫码成功] 已进入控制台！URL:", url);
    loggedIn = true;
    break;
  }
  // 检查是否显示过期
  const isExpired = await page.evaluate(() => document.body.innerText.includes("二维码已过期"));
  if (isExpired) {
    console.log("[二维码过期提示] 页面提示已过期，自动刷新...");
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("*")).find(e => e.innerText && e.innerText.includes("刷新"));
      if (el) el.click();
    });
  }
  await new Promise(r => setTimeout(r, 2000));
}

if (!loggedIn) {
  console.log("扫码超时");
  process.exit(1);
}

// 等待控制台完全渲染
await new Promise(r => setTimeout(r, 5000));
console.log("控制台加载完成，当前 URL:", await page.url());
await page.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/4e1121fc-828a-4d5a-bd34-6e3a445ce11b/step1_console_home.png" });

// 1. 查找并点击 crm 服务
console.log("正在查找 crm 服务...");
const clickedCrm = await page.evaluate(() => {
  const elements = Array.from(document.querySelectorAll("a, button, div, span, tr, td"));
  const target = elements.find(el => el.innerText && el.innerText.trim() === "crm");
  if (target) {
    target.click();
    return true;
  }
  return false;
});
console.log("点击 crm 结果:", clickedCrm);
await new Promise(r => setTimeout(r, 4000));
await page.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/4e1121fc-828a-4d5a-bd34-6e3a445ce11b/step2_crm_detail.png" });

// 2. 点击「版本管理」
console.log("正在查找版本管理...");
const clickedVersionTab = await page.evaluate(() => {
  const elements = Array.from(document.querySelectorAll("a, button, div, span, li"));
  const target = elements.find(el => el.innerText && el.innerText.trim() === "版本管理");
  if (target) {
    target.click();
    return true;
  }
  return false;
});
console.log("点击版本管理结果:", clickedVersionTab);
await new Promise(r => setTimeout(r, 3000));
await page.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/4e1121fc-828a-4d5a-bd34-6e3a445ce11b/step3_version_tab.png" });

// 3. 点击「新建版本」
console.log("正在查找新建版本按钮...");
const clickedNewVersion = await page.evaluate(() => {
  const elements = Array.from(document.querySelectorAll("button, a, div, span"));
  const target = elements.find(el => el.innerText && el.innerText.includes("新建版本"));
  if (target) {
    target.click();
    return true;
  }
  return false;
});
console.log("点击新建版本结果:", clickedNewVersion);
await new Promise(r => setTimeout(r, 3000));
await page.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/4e1121fc-828a-4d5a-bd34-6e3a445ce11b/step4_new_version_modal.png" });

// 4. 确认使用 GitHub / main 分支并点击发布/确定部署
console.log("正在确认部署配置并点击部署...");
const deployResult = await page.evaluate(() => {
  // 查找弹窗中的确认/部署按钮
  const buttons = Array.from(document.querySelectorAll(".modal button, .dialog button, button, a"));
  const deployBtn = buttons.find(b => {
    const t = b.innerText && b.innerText.trim();
    return t === "确定" || t === "确定部署" || t === "开始部署" || t === "立即部署" || t === "发布";
  });
  if (deployBtn) {
    deployBtn.click();
    return { success: true, text: deployBtn.innerText.trim() };
  }
  return { success: false };
});
console.log("触发部署操作:", deployResult);
await new Promise(r => setTimeout(r, 5000));
await page.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/4e1121fc-828a-4d5a-bd34-6e3a445ce11b/step5_deploying.png" });
console.log("[部署已成功触发] 云托管构建已开启！");
`;

import fs from "node:fs";
fs.writeFileSync("/tmp/run_deploy_ego.js", script);
execSync("ego-browser nodejs < /tmp/run_deploy_ego.js", { stdio: "inherit" });
