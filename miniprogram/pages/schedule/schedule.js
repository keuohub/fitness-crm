// pages/schedule/schedule.js
// 微信订阅消息写死跳转此页，在此迅速中转至约课 Tab，避免 404 与空白
Page({
  onLoad: function() {
    wx.switchTab({
      url: "/pages/booking/booking",
      fail: function() {
        wx.reLaunch({ url: "/pages/booking/booking" });
      }
    });
  }
});
