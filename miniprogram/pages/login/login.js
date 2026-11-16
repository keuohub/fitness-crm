var api = require("../../utils/api.js");
var wxbind = require("../../utils/wxbind.js");

Page({
  data: {
    accountInput: "",
    passwordInput: "",
    submitting: false,
    error: ""
  },

  onLoad: function(options) {
    this.optionsFrom = (options && options.from) || "";
    var isSwitching = options && (options.switch === "1" || options.force === "1");
    if (!isSwitching) {
      // 1. 若专职管理员已登录，直接进入管家工作台
      var mgrToken = wx.getStorageSync("managerToken");
      var mgrProfile = wx.getStorageSync("managerProfile");
      if (mgrToken && mgrProfile && mgrProfile.id !== 11) {
        wx.reLaunch({ url: "/pages/manager/manager" });
        return;
      }
      // 2. 若学员已登录，直接进入学员首页
      var memberId = wx.getStorageSync("memberId");
      var memberToken = wx.getStorageSync("memberToken");
      if (memberId && memberToken) {
        wx.switchTab({ url: "/pages/stars/stars" });
        return;
      }
      if (memberId && !memberToken) {
        api.clearSession();
      }
    } else {
      api.clearSession();
      wx.removeStorageSync("managerToken");
      wx.removeStorageSync("managerProfile");
    }

    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"]
      });
    }
  },

  onAccountInput: function(e) {
    this.setData({ accountInput: (e.detail.value || "").trim(), error: "" });
  },

  onPasswordInput: function(e) {
    this.setData({ passwordInput: (e.detail.value || "").trim(), error: "" });
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

  // 统一登录入口：根据输入的内容自动分流，学员看学员端，管理端看工作台
  handleUnifiedLogin: function() {
    var that = this;
    var account = (this.data.accountInput || "").trim();
    var password = (this.data.passwordInput || "").trim();

    if (!account) {
      this.setData({ error: "请输入手机号或管理员账号" });
      return;
    }
    if (!password) {
      this.setData({ error: "请输入密码" });
      return;
    }

    this.setData({ submitting: true, error: "" });

    // 智能分流路由判定：
    var lowerAcc = account.toLowerCase();
    var isPurePhone = /^\d{11}$/.test(account);
    var isPureSuffix = /^\d{4,6}$/.test(password);
    var isManagerFormat = lowerAcc.indexOf("laiwu_") >= 0 || lowerAcc.indexOf("admin") >= 0 || lowerAcc.indexOf("front") >= 0 || lowerAcc.indexOf("teach") >= 0 || (!isPurePhone && /[a-zA-Z]/.test(account));

    if (isManagerFormat || (!isPurePhone && !isPureSuffix)) {
      // 走专职管理端鉴权
      that.tryManagerLogin(account, password, function(success, msg) {
        if (success) return;
        // 如果管理鉴权失败，兜底尝试学员端查询
        that.tryMemberLogin(account, password, function(memSuccess, memMsg) {
          that.setData({ submitting: false });
          if (!memSuccess) {
            that.setData({ error: msg || memMsg || "账号或密码错误，请核对" });
          }
        });
      });
    } else {
      // 11位手机号 + 4/6位数字密码：优先走学员档案流程
      that.tryMemberLogin(account, password, function(memSuccess, memMsg) {
        if (memSuccess) return;
        // 若学员不存在，兜底尝试管理员鉴权
        that.tryManagerLogin(account, password, function(mgrSuccess, mgrMsg) {
          that.setData({ submitting: false });
          if (!mgrSuccess) {
            that.setData({ error: memMsg || mgrMsg || "未找到该账号信息，请核对手机号或密码" });
          }
        });
      });
    }
  },

  tryManagerLogin: function(username, password, callback) {
    var that = this;
    api.request({
      url: "/api/portal/manager/auth",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { username: username, password: password },
      success: function(res) {
        if (res && res.statusCode === 200 && res.data && res.data.ok) {
          wx.setStorageSync("managerToken", res.data.token);
          wx.setStorageSync("managerProfile", res.data.admin);
          that.setData({ submitting: false });
          wx.showToast({ title: "管家工作台开启", icon: "success" });
          setTimeout(function() {
            wx.reLaunch({ url: "/pages/manager/manager" });
          }, 300);
          callback(true);
        } else {
          var errMsg = (res && res.data && res.data.error) || "";
          callback(false, errMsg);
        }
      },
      fail: function() {
        callback(false, "网络连接失败，请稍后重试");
      }
    });
  },

  tryMemberLogin: function(phone, suffix, callback) {
    var that = this;
    api.request({
      url: "/api/portal/login",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { portalCode: phone, phoneSuffix: suffix },
      success: function(res) {
        if (res && res.statusCode === 200 && res.data && res.data.memberId) {
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

          that.setData({ submitting: false });
          if (that.optionsFrom === "booking") {
            wx.switchTab({ url: "/pages/booking/booking" });
          } else {
            wx.reLaunch({ url: "/pages/stars/stars" });
          }
          callback(true);
        } else {
          var errMsg = (res && res.data && res.data.error) || "";
          callback(false, errMsg);
        }
      },
      fail: function() {
        callback(false, "网络连接失败，请稍后重试");
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
