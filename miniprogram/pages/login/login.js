var api = require("../../utils/api.js");

Page({
  data: {
    submitting: false,
    error: "",
    inviteCode: "",
    phoneSuffix: "",
    agreed: false
  },

  onLoad: function(options) {
    // 若带 switch=1 或 force=1，表示用户主动要求切换账号，不自动重定向
    var isSwitching = options && (options.switch === "1" || options.force === "1");
    if (!isSwitching) {
      var memberId = wx.getStorageSync("memberId");
      var memberToken = wx.getStorageSync("memberToken");
      if (memberId && memberToken) {
        wx.switchTab({ url: "/pages/stars/stars" });
        return;
      }
      if (memberId && !memberToken) {
        // 旧版本留下的登录态没有 token，必须重新验证
        api.clearSession();
      }
    } else {
      // 主动切换账号：彻底清除旧会话所有残余
      api.clearSession();
    }

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

  toggleAgree: function() {
    this.setData({ agreed: !this.data.agreed, error: "" });
  },

  openPrivacy: function() { wx.navigateTo({ url: "/pages/legal/privacy" }); },
  openTerms: function() { wx.navigateTo({ url: "/pages/legal/terms" }); },

  handleLogin: function() {
    var that = this;
    var code = (that.data.inviteCode || "").trim().toUpperCase();
    var suffix = (that.data.phoneSuffix || "").trim();

    if (!code) {
      that.setData({ error: "请输入专属邀请码" });
      return;
    }
    if (!suffix) {
      that.setData({ error: "请填写手机尾号或登录 PIN" });
      return;
    }
    if (!that.data.agreed) {
      that.setData({ error: "请先阅读并同意隐私政策和用户协议" });
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
          // 清除上一位会员的所有缓存，绝不串门
          wx.clearStorageSync();
          wx.setStorageSync("memberToken", data.token || "");
          wx.setStorageSync("tokenExpiresAt", data.tokenExpiresAt || 0);
          wx.setStorageSync("memberId", data.memberId);
          wx.setStorageSync("memberName", data.memberName || "会员");
          if (data.joinedAt) {
            var diff = Math.floor((Date.now() - new Date(String(data.joinedAt).replace(/-/g, "/")).getTime()) / 86400000);
            wx.setStorageSync("joinDays", Math.max(1, diff));
          }
          api.request({
            url: "/api/portal/consent",
            method: "POST",
            data: { agreed: true },
            complete: function() {
              wx.reLaunch({ url: "/pages/stars/stars" });
            }
          });
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
      path: "/pages/stars/stars"
    };
  },

  onShareTimeline: function() {
    return {
      title: "徕舞健身 · 会员专属成长手札",
      query: ""
    };
  }
});
