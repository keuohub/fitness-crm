import { execSync } from "child_process";

const run = `
const task = await taskSpace(0);
const page = task.page("p1");

console.log("[自动提审] 正在等待微信扫码验证身份...");
const start = Date.now();
let verified = false;

while (Date.now() - start < 180000) {
  const hasQR = await page.evaluate(() => {
    return document.body.innerText.includes("请使用微信扫描二维码进行验证");
  });
  const url = await page.url();
  if (!hasQR || url.includes("get_class")) {
    console.log("[扫码成功] 身份验证通过，进入提审表单页！URL:", url);
    verified = true;
    break;
  }
  await new Promise(r => setTimeout(r, 2000));
}

if (!verified) {
  console.log("扫码等待超时");
  process.exit(1);
}

// 等待表单页面完全渲染
await new Promise(r => setTimeout(r, 4000));
console.log("正在填写提审表单...");

// 填写表单
const filled = await page.evaluate(() => {
  // 1. 版本描述
  const textareas = Array.from(document.querySelectorAll("textarea"));
  if (textareas[0]) {
    textareas[0].value = "1. 约课首屏全动态云端驱动与视觉质感升级；\\n2. 场馆排课与会员档案功能优化。";
    textareas[0].dispatchEvent(new Event("input", { bubbles: true }));
    textareas[0].dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 2. 测试账号单选框：需登录账号即可使用
  const radios = Array.from(document.querySelectorAll("input[type=radio]"));
  const needLoginRadio = radios.find(r => {
    const parent = r.parentElement || r;
    return parent.innerText && parent.innerText.includes("需登录账号即可使用");
  });
  if (needLoginRadio) {
    needLoginRadio.click();
    needLoginRadio.checked = true;
    needLoginRadio.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 3. 测试账号和密码 inputs
  const inputs = Array.from(document.querySelectorAll("input[type=text], input[type=password]"));
  // 查找账号输入框与密码输入框
  inputs.forEach(inp => {
    const pText = inp.parentElement ? inp.parentElement.innerText : "";
    if (pText.includes("账号") || inp.placeholder.includes("账号")) {
      inp.value = "AUDIT888";
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (pText.includes("密码") || inp.placeholder.includes("密码")) {
      inp.value = "888888";
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  // 4. 测试备注
  if (textareas[1]) {
    textareas[1].value = "1. 小程序首页可直接浏览场馆空间、教练导师与排课信息；\\n2. 审核员登录测试：进入“我的蜕变”或“我的账户”页面，在邀请码/卡号输入框填入【AUDIT888】，登录PIN码填入【888888】点击开启即可成功进入会员专属档案；登录后可查看卡包、上课记录与约课功能；\\n3. 若不登录，也可点击“暂不登录，先去逛逛场馆与课表”直接体验公共内容。";
    textareas[1].dispatchEvent(new Event("input", { bubbles: true }));
    textareas[1].dispatchEvent(new Event("change", { bubbles: true }));
  }

  return "表单字段已自动填入完毕";
});
console.log(filled);

await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/bb6581f0-b9ef-4d56-a402-fa9c7aa57d07/mp_filled_form.png" });

// 点击最后的提交审核按钮
console.log("准备点击提交审核按钮...");
const submitted = await page.evaluate(() => {
  const allBtns = Array.from(document.querySelectorAll("button"));
  const subBtn = allBtns.find(b => b.innerText && b.innerText.trim() === "提交审核" && b.className.includes("weui-desktop-btn_primary"));
  if (subBtn) {
    subBtn.click();
    return "已点击提交审核按钮！";
  }
  return "未找到提交审核按钮";
});
console.log("提交动作结果:", submitted);

await new Promise(r => setTimeout(r, 5000));
console.log("提交完成后的当前 URL:", await page.url());
await page.screenshot({ path: "/Users/qiao/.gemini/antigravity/brain/bb6581f0-b9ef-4d56-a402-fa9c7aa57d07/mp_final_submitted.png" });
`;

process.stdout.write(run);
