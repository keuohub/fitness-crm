App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: "crm-d8gk3n5aj45d5cf11",
        traceUser: true
      });
    }
    // 打开分享菜单：朋友、朋友圈都允许，页面再各自定义分享标题
    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: false,
        menus: ["shareAppMessage", "shareTimeline"]
      });
    }
    // 检查登录状态
    const memberId = wx.getStorageSync("memberId");
    if (!memberId) {
      // 未登录，下次进入时跳转
    }
  }
});
