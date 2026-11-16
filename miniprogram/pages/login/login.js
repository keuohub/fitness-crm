var api = require("../../utils/api.js");
var wxbind = require("../../utils/wxbind.js");

Page({
  data: {
    loginMode: "member", // 'member' | 'manager'
    submitting: false,
    managerSubmitting: false,
    error: "",
    inviteCode: "",
    phoneSuffix: "",
    managerUsername: "",
    managerPassword: ""
  },

  onLoad: function(options) {
    this.optionsFrom = (options && options.from) || "";
    // 若带 mode=manager，直接进入管家模式
    if (options && options.mode === "manager") {
      this.setData({ loginMode: "manager" });
    }
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

  switchLoginMode: function(e) {
    var mode = e.currentTarget.dataset.mode || "member";
    this.setData({ loginMode: mode, error: "" });
  },

  switchToManagerMode: function() {
    this.setData({ loginMode: "manager", error: "" });
  },

  onCodeInput: function(e) {
    var raw = (e.detail.value || "").trim();
    // 智能识别：若用户在学员输入框填入了管理员专用账号（如 laiwu_admin / front / teach）
    if (raw.toLowerCase().indexOf("laiwu_") >= 0 || raw.toLowerCase().indexOf("admin") >= 0) {
      this.setData({
        loginMode: "manager",
        managerUsername: raw.toLowerCase(),
        inviteCode: "",
        error: "已自动为您切换至【管家管理中枢】登录通道"
      });
      return;
    }
    this.setData({ inviteCode: raw.toUpperCase(), error: "" });
  },

  onPhoneSuffixInput: function(e) {
    var val = (e.detail.value || "").trim();
    this.setData({ phoneSuffix: val, error: "" });
  },

  onManagerUsernameInput: function(e) {
    this.setData({ managerUsername: e.detail.value, error: "" });
  },

  onManagerPasswordInput: function(e) {
    this.setData({ managerPassword: e.detail.value, error: "" });
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

    that.setData({ submitting: true, error: "" });

    api.request({
      url: "/api/portal/login",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { portalCode: code, phoneSuffix: suffix },
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.memberId) {
          var data = res.data;
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
          try {
            wxbind.reset();
            wxbind.bind();
          } catch (e) {}

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
        that.setData({ submitting: false, error: "暂时连不上服务器，请稍后重试或联系小桥" });
      }
    });
  },

  handleManagerLogin: function() {
    var that = this;
    var username = (this.data.managerUsername || "").trim();
    var password = (this.data.managerPassword || "").trim();

    if (!username) {
      this.setData({ error: "请输入管理员专属账号" });
      return;
    }
    if (!password) {
      this.setData({ error: "请输入管理员登录密码" });
      return;
    }

    this.setData({ managerSubmitting: true, error: "" });

    api.request({
      url: "/api/portal/manager/auth",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { username: username, password: password },
      success: function(res) {
        that.setData({ managerSubmitting: false });
        if (res && res.statusCode === 200 && res.data && res.data.ok) {
          wx.setStorageSync("managerToken", res.data.token);
          wx.setStorageSync("managerProfile", res.data.admin);
          wx.showToast({ title: "安全验证成功", icon: "success" });
          setTimeout(function() {
            wx.reLaunch({ url: "/pages/manager/manager" });
          }, 300);
        } else {
          var errMsg = (res && res.data && res.data.error) || "管理员账号或密码错误，请核对";
          that.setData({ error: errMsg });
        }
      },
      fail: function() {
        that.setData({ managerSubmitting: false, error: "网络连接失败，请稍后重试" });
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
