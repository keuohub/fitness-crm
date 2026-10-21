var api = require("../../utils/api.js");

Page({
  data: {
    submitting: false,
    error: "",
    inviteCode: "",
    phoneSuffix: "",
    baseUrl: ""
  },

  onLoad: function(options) {
    // 若带 switch=1 或 force=1，表示用户主动要求切换账号，不自动重定向
    var isSwitching = options && (options.switch === "1" || options.force === "1");
    if (!isSwitching) {
      var memberId = wx.getStorageSync("memberId");
      if (memberId) {
        // 必须落到 tabBar 页面：switchTab 不接受非 tab 页（原 growth 会静默失败并卡死在此页）
        wx.switchTab({ url: "/pages/stars/stars" });
        return;
      }
    } else {
      // 主动切换账号：彻底清除旧会话所有残余
      var saved = wx.getStorageSync("baseUrl");
      wx.clearStorageSync();
      if (saved) wx.setStorageSync("baseUrl", saved);
    }
    var saved = wx.getStorageSync("baseUrl");
    this.setData({ baseUrl: saved || api.DEFAULT_BASE_URL });

    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"]
      });
    }
  },

  onCodeInput: function(e) {
    var val = (e.detail.value || "").trim().toUpperCase();
    this.setData({ inviteCode: val, error: "" });
  },

  onPhoneSuffixInput: function(e) {
    var val = (e.detail.value || "").trim();
    this.setData({ phoneSuffix: val, error: "" });
  },

  handleLogin: function() {
    var that = this;
    var code = (that.data.inviteCode || "").trim().toUpperCase();
    var suffix = (that.data.phoneSuffix || "").trim();

    if (!code) {
      that.setData({ error: "请输入专属邀请码" });
      return;
    }

    // 已移除 DEMO / LAIWU2024 / LAIWU2025 三个硬编码口令。
    // 它们会把任何人直接放进 memberId=9 的真实会员档案（含训练记录与体态照）。
    // 提审如需账号，请在后台新建一个「审核测试」会员，用它的真实邀请码登录，
    // 这样审核员看到的是真实链路，而不是别人的档案。

    that.setData({ submitting: true, error: "" });

    api.request({
      url: "/api/portal/login",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { portalCode: code, phoneSuffix: suffix },
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.memberId) {
          var data = res.data;
          var savedBase = that.data.baseUrl;
          // 全面彻底清除上一位会员的所有专属缓存，绝不串门
          wx.clearStorageSync();
          
          wx.setStorageSync("baseUrl", savedBase);
          wx.setStorageSync("memberId", data.memberId);
          wx.setStorageSync("memberName", data.memberName || "会员");
          wx.setStorageSync("loginExpires", Date.now() + 30 * 24 * 60 * 60 * 1000);
          wx.setStorageSync("isDemoMode", false);
          if (data.joinedAt) {
            var diff = Math.floor((Date.now() - new Date(String(data.joinedAt).replace(/-/g, "/")).getTime()) / 86400000);
            wx.setStorageSync("joinDays", Math.max(1, diff));
          }
          // 使用 reLaunch 彻底销毁旧的 Page 实例栈，100% 触发全新挂载
          // 落点必须是 tabBar 页面，否则进入后没有底部导航（原 growth 是非 tab 页）
          wx.reLaunch({ url: "/pages/stars/stars" });
        } else {
          var errMsg = (res.data && res.data.error) ? res.data.error : "未找到该会员档案，请核对或联系小桥";
          that.setData({ submitting: false, error: errMsg });
        }
      },
      fail: function() {
        // 请求失败或超时：如实报错，绝不静默进演示模式
        that.setData({ submitting: false, error: "暂时连不上服务器，请稍后重试或联系小桥" });
      }
    });
  },

  onShareAppMessage: function() {
    return {
      title: "徕舞健身 · 会员专属成长手札",
      path: "/pages/login/login"
    };
  },

  onShareTimeline: function() {
    return {
      title: "徕舞健身 · 会员专属成长手札",
      query: ""
    };
  }
});
