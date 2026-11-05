#!/bin/bash
# 微信云托管全自动代管部署脚本
ego-browser nodejs <<'EOF'
const task = await taskSpace("cloudrun deploy task");
const page = task.page("p1");

console.log("等待微信扫码登录中...");
const startWait = Date.now();
let loggedIn = false;

while (Date.now() - startWait < 5 * 60 * 1000) {
  const url = await page.url();
  if (!url.includes("qrLogin") && (url.includes("console") || url.includes("cloudrun") || url.includes("manage"))) {
    console.log("扫码成功，已进入控制台:", url);
    loggedIn = true;
    break;
  }
  await new Promise(r => setTimeout(r, 1500));
}

if (!loggedIn) {
  console.log("等待扫码超时");
  process.exit(1);
}

// 等待控制台完全加载
await new Promise(r => setTimeout(r, 4000));
console.log("控制台就绪，当前页面:", await page.url());
await page.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/4e1121fc-828a-4d5a-bd34-6e3a445ce11b/console_home.png" });

// 查找并进入 crm 服务
const crmClicked = await page.evaluate(() => {
  const allLinks = Array.from(document.querySelectorAll("a, button, div, span, tr, td"));
  const crmEl = allLinks.find(el => el.innerText && el.innerText.trim() === "crm");
  if (crmEl) {
    crmEl.click();
    return true;
  }
  return false;
});
console.log("点击 crm 服务:", crmClicked);
await new Promise(r => setTimeout(r, 3000));

// 截图记录
await page.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/4e1121fc-828a-4d5a-bd34-6e3a445ce11b/crm_service_page.png" });
console.log("已进入服务详情，等待后续操作...");
EOF
