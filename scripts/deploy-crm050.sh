#!/bin/bash
ego-browser nodejs <<'INNER_EOF'
const task = await taskSpace("cloudrun deploy task");
const p2 = task.page("p2");

console.log("[云托管自动部署] 等待微信扫码确认登录...");
const startWait = Date.now();
let loggedIn = false;

while (Date.now() - startWait < 5 * 60 * 1000) {
  const url = await p2.url();
  // 登录成功会跳转到控制台或环境列表
  if (!url.includes("login") && !url.includes("qrcode") && (url.includes("cloudrun") && !url.endsWith("/cloudrun") || url.includes("console") || url.includes("manage"))) {
    console.log("[云托管扫码成功] 进入控制台:", url);
    loggedIn = true;
    break;
  }
  await new Promise(r => setTimeout(r, 2000));
}

if (!loggedIn) {
  console.log("云托管扫码超时");
  process.exit(1);
}

// 等待控制台完全渲染
await new Promise(r => setTimeout(r, 5000));
console.log("控制台加载完成，当前 URL:", await p2.url());
await p2.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/bb6581f0-b9ef-4d56-a402-fa9c7aa57d07/cloudrun_console_home.png" });

// 1. 如果有账号/环境选择，选择「crm」或「徕舞」
const selectedEnv = await p2.evaluate(() => {
  const items = Array.from(document.querySelectorAll("a, button, div, span, tr, td"));
  const crmItem = items.find(el => el.innerText && (el.innerText.trim() === "crm" || el.innerText.includes("crm-330905")));
  if (crmItem) {
    crmItem.click();
    return "clicked_crm_env";
  }
  return "no_crm_env_found";
});
console.log("环境选择结果:", selectedEnv);
await new Promise(r => setTimeout(r, 4000));

// 2. 查找并点击 crm 服务
const clickedCrm = await p2.evaluate(() => {
  const elements = Array.from(document.querySelectorAll("a, button, div, span, tr, td"));
  const target = elements.find(el => el.innerText && el.innerText.trim() === "crm");
  if (target) {
    target.click();
    return true;
  }
  return false;
});
console.log("点击 crm 服务结果:", clickedCrm);
await new Promise(r => setTimeout(r, 4000));
await p2.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/bb6581f0-b9ef-4d56-a402-fa9c7aa57d07/cloudrun_crm_detail.png" });

// 3. 查找并点击「新建版本」或流水线部署
const clickedDeploy = await p2.evaluate(() => {
  const elements = Array.from(document.querySelectorAll("button, a, span, div"));
  const target = elements.find(el => el.innerText && (el.innerText.includes("新建版本") || el.innerText.includes("流水线部署") || el.innerText.includes("重新部署")));
  if (target) {
    target.click();
    return { clicked: true, text: target.innerText.trim() };
  }
  return { clicked: false };
});
console.log("点击部署按钮结果:", clickedDeploy);
await new Promise(r => setTimeout(r, 3000));
await p2.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/bb6581f0-b9ef-4d56-a402-fa9c7aa57d07/cloudrun_modal_deploy.png" });

// 4. 点击弹窗确认按钮
const confirmed = await p2.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll(".dialog button, .modal button, .tea-dialog button, button"));
  const confirmBtn = buttons.find(b => {
    const t = b.innerText && b.innerText.trim();
    return t === "确定" || t === "确定部署" || t === "发布" || t === "立即部署";
  });
  if (confirmBtn) {
    confirmBtn.click();
    return { success: true, text: confirmBtn.innerText.trim() };
  }
  return { success: false };
});
console.log("确认部署结果:", confirmed);
await new Promise(r => setTimeout(r, 5000));
await p2.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/bb6581f0-b9ef-4d56-a402-fa9c7aa57d07/cloudrun_deploy_result.png" });
console.log("部署指令触发完毕。");
INNER_EOF
