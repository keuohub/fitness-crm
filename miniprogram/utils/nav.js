// utils/nav.js · 胶囊安全区统一计算（BRIEF_06 §4）
function getNavMetrics() {
  var sys = {};
  try { sys = wx.getSystemInfoSync() || {}; } catch (e) {}
  var sb = sys.statusBarHeight || 20;
  var ww = sys.windowWidth || 375;
  var m = { navTop: sb + 4, navH: 32, navBottom: sb + 36, capsuleLeft: ww - 95 };
  try {
    var r = wx.getMenuButtonBoundingClientRect();
    if (r && r.top) {
      m = { navTop: r.top, navH: r.height, navBottom: r.bottom, capsuleLeft: r.left };
    }
  } catch (e) {}
  return m;
}
module.exports = { getNavMetrics: getNavMetrics };
