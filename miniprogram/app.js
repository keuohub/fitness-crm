App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: "crm-d8gk3n5aj45d5cf11",
        traceUser: true
      });
    }
    // 检查登录状态
    const memberId = wx.getStorageSync("memberId");
    if (!memberId) {
      // 未登录，下次进入时跳转
    }
  }
});
