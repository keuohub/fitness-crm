import { execSync } from "node:child_process";

const script = `
const task = await taskSpace("cloudrun deploy task");
const p1 = task.page("p1");

console.log("[自动运维] 正在等待微信公众平台登录中...");
const startWait = Date.now();
let loggedIn = false;

while (Date.now() - startWait < 5 * 60 * 1000) {
  const url = await p1.url();
  if (!url.includes("login") && (url.includes("mp.weixin.qq.com/wxamp") || url.includes("mp.weixin.qq.com/cgi-bin/home") || url.includes("cgi-bin"))) {
    console.log("[扫码成功] 已进入微信公众平台！URL:", url);
    loggedIn = true;
    break;
  }
  // 如果出现选择账号页面
  const hasAccountList = await p1.evaluate(() => document.body.innerText.includes("选择账号") || document.body.innerText.includes("徕舞"));
  if (hasAccountList) {
    console.log("[账号选择] 检测到账号选择列表，尝试选择徕舞小程序...");
    await p1.evaluate(() => {
      const items = Array.from(document.querySelectorAll("*"));
      const laiwu = items.find(e => e.innerText && e.innerText.includes("徕舞"));
      if (laiwu) laiwu.click();
    });
  }
  await new Promise(r => setTimeout(r, 2000));
}

if (!loggedIn) {
  console.log("扫码等待超时");
  process.exit(1);
}

// 等待首页完全加载
await new Promise(r => setTimeout(r, 5000));
console.log("进入后台首页:", await p1.url());
await p1.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/4e1121fc-828a-4d5a-bd34-6e3a445ce11b/mp_home_after_login.png" });

// 1. 进入版本管理
console.log("正在前往版本管理页面...");
const clickedVersion = await p1.evaluate(() => {
  const links = Array.from(document.querySelectorAll("a, span, div, li"));
  const target = links.find(e => e.innerText && e.innerText.trim() === "版本管理");
  if (target) {
    target.click();
    return true;
  }
  return false;
});

await new Promise(r => setTimeout(r, 4000));
console.log("当前页面:", await p1.url());
await p1.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/4e1121fc-828a-4d5a-bd34-6e3a445ce11b/mp_version_manage.png" });

// 2. 检查 1.3.10 开发版本并设为体验版
const setExperience = await p1.evaluate(() => {
  const rows = Array.from(document.querySelectorAll("tr, .weui-desktop-table__row, .table_row, div"));
  const row1310 = rows.find(r => r.innerText && r.innerText.includes("1.3.10"));
  if (row1310) {
    const btn = Array.from(row1310.querySelectorAll("a, button, span")).find(b => b.innerText && b.innerText.includes("设为体验版"));
    if (btn) {
      btn.click();
      return "clicked_set_experience";
    }
    return "found_1310_no_btn";
  }
  return "not_found_1310";
});
console.log("设为体验版结果:", setExperience);

await new Promise(r => setTimeout(r, 3000));
await p1.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/4e1121fc-828a-4d5a-bd34-6e3a445ce11b/mp_after_set_experience.png" });

// 3. 进入微信云托管
console.log("正在前往微信云托管...");
const clickedCloudRun = await p1.evaluate(() => {
  const items = Array.from(document.querySelectorAll("a, span, div"));
  const target = items.find(e => e.innerText && (e.innerText.trim() === "云托管" || e.innerText.includes("微信云托管")));
  if (target) {
    target.click();
    return true;
  }
  return false;
});

await new Promise(r => setTimeout(r, 5000));
console.log("当前 URL:", await p1.url());
`;

console.log("Script template ready");
