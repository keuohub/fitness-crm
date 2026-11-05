// utils/dev-preview.js · 开发预览假数据开关（BRIEF_06 §8）
// 只有同时满足：① 运行在微信开发者工具（platform === "devtools"）② 手动在 Console 执行
//   wx.setStorageSync("devPreview", true)
// 才会开启。真机/线上 platform 永远不是 devtools → 永远关闭。本文件不写任何存储。
function isPreview() {
  try {
    if (wx.getSystemInfoSync().platform !== "devtools") return false;
    return wx.getStorageSync("devPreview") === true;
  } catch (e) {
    return false;
  }
}

module.exports = { isPreview: isPreview };
