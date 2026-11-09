var api = require("../../utils/api.js");
var wxbind = require("../../utils/wxbind.js");

Page({
  data: {
    submitting: false,
    error: "",
    inviteCode: "",
    phoneSuffix: ""
  },

  onLoad: function(options) {
    this.optionsFrom = (options && options.from) || "";
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

  handleSkipLogin: function() {
    if (this.optionsFrom === "booking") {
      var pages = getCurrentPages();
      if (pages && pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({ url: "/pages/booking/booking" });
      }
    } else {
      wx.switchTab({ url: "/pages/stars/stars" });
    }
  },

  handleLogin: function() {
    var that = this;
    var code = (that.data.inviteCode || "").trim().toUpperCase();
    var suffix = (that.data.phoneSuffix || "").trim();

    if (!code) {
      that.setData({ error: "请输入手机号" });
      return;
    }
    if (!suffix) {
      that.setData({ error: "请输入手机后 4 位密码" });
      return;
    }

    // 已移除旧版本硬编码口令。
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
          // 清除上一位会员的所有缓存，但保留本轮可能暂存的待约课次
          var pendingSessionId = wx.getStorageSync("pendingSessionId");
          wx.clearStorageSync();
          if (pendingSessionId) {
            wx.setStorageSync("pendingSessionId", pendingSessionId);
          }
          wx.setStorageSync("memberToken", data.token || "");
          wx.setStorageSync("tokenExpiresAt", data.tokenExpiresAt || 0);
          wx.setStorageSync("memberId", data.memberId);
          wx.setStorageSync("memberName", data.memberName || "会员");
          if (data.joinedAt) {
            var diff = Math.floor((Date.now() - new Date(String(data.joinedAt).replace(/-/g, "/")).getTime()) / 86400000);
            wx.setStorageSync("joinDays", Math.max(1, diff));
          }
          if (data.managerRole) {
            wx.setStorageSync("managerRole", data.managerRole);
          }
          if (data.isManager !== undefined) {
            wx.setStorageSync("isManager", Boolean(data.isManager));
          }
          // 登录成功后静默绑定微信 openid（推送能力的前提，会员无感）
          try {
            wxbind.reset();
            wxbind.bind();
          } catch (e) {}

          // from=booking 时跳回约课 Tab，否则默认回到首页
          if (that.optionsFrom === "booking") {
            wx.switchTab({ url: "/pages/booking/booking" });
          } else {
            wx.reLaunch({ url: "/pages/stars/stars" });
          }
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
      title: "徕舞女子塑形 · 约一节课",
      path: "/pages/stars/stars"
    };
  },

  onShareTimeline: function() {
    return {
      title: "徕舞女子塑形 · 约一节课",
      query: ""
    };
  }
});
