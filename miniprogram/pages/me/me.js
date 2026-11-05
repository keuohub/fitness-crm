var navUtil = require("../../utils/nav.js");
// pages/me/me.js
// 我的账户：只展示后台真实数据，页面不生产任何数字。
var api = require("../../utils/api.js");
var format = require("../../utils/format.js");

Page({
  data: {
    loading: true,
    loadError: "",
    memberId: null,
    memberName: "",
    initial: "",
    avatarUrl: "",
    memberCode: "",
    mentorName: "",
    status: "",
    joinedAt: "",
    joinedAtText: "",
    joinDays: null,
    joinDaysText: "",
    memberCodeText: "",
    statusText: "",
    totalHours: 0,
    courseCounts: [],
    latestTrainingDate: "",
    latestReply: null,
    updatingAvatar: false,
    isManager: false,
    managerRole: ""
  },

  onLoad: function() {
    this.setData({ nav: navUtil.getNavMetrics() });
    var memberId = wx.getStorageSync("memberId");
    if (!memberId || !wx.getStorageSync("memberToken")) {
      wx.reLaunch({ url: "/pages/login/login?force=1" });
      return;
    }
    this.setData({ memberId: Number(memberId) });
    this.loadAll();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      var tb = this.getTabBar();
      if (typeof tb.updateTab === "function") {
        tb.updateTab("/pages/me/me");
      } else {
        tb.setData({ hidden: false });
      }
    }
    var now = Date.now();
    var nc = this.selectComponent("#nextClass");
    if (nc && typeof nc.refresh === "function") {
      nc.refresh();
    }
    if (this.data.memberId && (!this._lastLoad || now - this._lastLoad > 3000)) {
      this._lastLoad = now;
      this.loadAll();
    }
  },

  onRetry: function() {
    this.setData({ loading: true });
    this.loadAll();
  },
  onPullDownRefresh: function() {
    var that = this;
    this.loadAll(function() { wx.stopPullDownRefresh(); });
  },

  fullUrl: function(p) {
    return api.fullUrl(p);
  },

  loadAll: function(done) {
    var that = this;
    var finished = typeof done === "function" ? done : function() {};
    var memberId = that.data.memberId;
    if (!memberId) { that.setData({ loading: false }); finished(); return; }

    api.request({
      url: "/api/portal/me",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var m = res.data;
          var joinDays = (m.joinDays === null || m.joinDays === undefined) ? null : Number(m.joinDays);
          that.setData({
            loading: false,
            loadError: "",
            memberName: m.memberName || "",
            initial: (m.memberName || "").charAt(0) || "",
            avatarUrl: api.fullUrl(m.avatarUrl || ""),
            memberCode: m.memberCode || "",
            memberCodeText: m.memberCode ? ("卡号 " + m.memberCode) : "",
            mentorName: m.mentorName || "",
            status: m.status || "",
            statusText: m.status === "active" ? "在册会员" : (m.status ? "会员" : ""),
            joinedAt: m.joinedAt ? format.formatChineseDate(m.joinedAt) : "",
            joinedAtText: m.joinedAt ? format.formatChineseDate(m.joinedAt) : "",
            joinDays: joinDays,
            joinDaysText: (joinDays === null || isNaN(joinDays)) ? "" : (joinDays + " 天"),
            totalHours: Number(m.totalHours || 0),
            courseCounts: Array.isArray(m.courseCounts) ? m.courseCounts : [],
            latestTrainingDate: m.lastTrainingDate ? format.formatShortDate(m.lastTrainingDate) : "",
            isManager: Boolean(m.isManager),
            managerRole: m.managerRole || ""
          });
          wx.setStorageSync("isManager", Boolean(m.isManager));
          wx.setStorageSync("managerRole", m.managerRole || "");
          if (typeof that.getTabBar === "function" && that.getTabBar()) {
            var tb = that.getTabBar();
            if (typeof tb.updateTab === "function") tb.updateTab("/pages/me/me");
          }
          if (m.memberName) wx.setStorageSync("memberName", m.memberName);
        } else if (res.statusCode === 401) {
          that.setData({ loading: false, loadError: "登录已过期" });
        } else {
          that.setData({ loading: false, loadError: "暂时无法加载，请下拉重试" });
        }
      },
      fail: function() {
        that.setData({ loading: false, loadError: "网络没有连上，请下拉重试" });
      },
      complete: function() {
        that.loadLatestReply(finished);
      }
    });
  },

  // round04 误删，已恢复：me.wxml 仍渲染 latestReply（小桥最近一条回复）
  loadLatestReply: function(done) {
    var that = this;
    var finished = typeof done === "function" ? done : function() {};
    api.request({
      url: "/api/portal/training-feelings?memberId=" + that.data.memberId,
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          var replied = res.data.filter(function(f) { return f && f.xiaoqiaoReply; });
          that.setData({
            latestReply: replied.length ? {
              date: replied[0].createdAt ? format.formatShortDate(replied[0].createdAt) : "",
              reply: format.cleanMarkdown(replied[0].xiaoqiaoReply || "")
            } : null
          });
        }
        finished();
      },
      fail: finished
    });
  },

  handleAvatarTap: function() {
    var that = this;
    if (that.data.updatingAvatar) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      success: function(res) {
        var filePath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (!filePath) return;
        that.setData({ updatingAvatar: true });
        wx.showLoading({ title: "正在更新…", mask: true });
        wx.uploadFile({
          url: api.getBaseUrl() + "/api/portal/avatar",
          filePath: filePath,
          name: "file",
          formData: { memberId: that.data.memberId },
          header: { Authorization: "Bearer " + (wx.getStorageSync("memberToken") || "") },
          success: function(up) {
            wx.hideLoading();
            that.setData({ updatingAvatar: false });
            var data = {};
            try { data = JSON.parse(up.data || "{}"); } catch (e) {}
            if (up.statusCode === 200 && data.avatarUrl) {
              that.setData({ avatarUrl: api.fullUrl(data.avatarUrl) });
              wx.showToast({ title: "已更新", icon: "success" });
            } else {
              wx.showToast({ title: "更新失败，请重试", icon: "none" });
            }
          },
          fail: function() {
            wx.hideLoading();
            that.setData({ updatingAvatar: false });
            wx.showToast({ title: "网络异常，请重试", icon: "none" });
          }
        });
      }
    });
  },

  copyConciergeWechat: function() {
    var account = wx.getStorageSync("conciergeWechat") || "Laiwu0010";
    wx.setClipboardData({
      data: account,
      success: function() {
        wx.showModal({
          title: "已复制小桥微信",
          content: "已复制「" + account + "」。回到微信搜索这个账号，备注你的姓名，小桥会通过你。",
          showCancel: false,
          confirmText: "好"
        });
      }
    });
  },

  goMyBookings: function() {
    wx.navigateTo({ url: "/pages/my-bookings/my-bookings" });
  },

  goBooking: function() {
    wx.switchTab({ url: "/pages/booking/booking" });
  },

  goManager: function() {
    wx.navigateTo({ url: "/pages/manager/manager" });
  },

  goNotes: function() {
    wx.navigateTo({ url: "/pages/notes/notes" });
  },

  goCards: function() {
    wx.navigateTo({ url: "/pages/cards/cards" });
  },

  goLetters: function() {
    wx.navigateTo({ url: "/pages/feedback/feedback" });
  },

  onAvatarError: function() {
    this.setData({ avatarUrl: "" });
  },

  goToBrand: function() {
    wx.navigateTo({ url: "/pages/brand/brand" });
  },

  goTransform: function() {
    wx.switchTab({ url: "/pages/transformation/transformation" });
  },

  handleLogout: function() {
    wx.showModal({
      title: "暂时离开",
      content: "离开后需要重新输入邀请码和验证信息才能进入。",
      confirmText: "离开",
      confirmColor: "#000000",
      cancelText: "留下",
      success: function(res) {
        if (!res.confirm) return;
        try { wx.request({ url: api.getBaseUrl() + "/api/portal/logout", method: "POST" }); } catch (e) {}
        wx.removeStorageSync("managerRole");
        wx.removeStorageSync("isManager");
        api.clearSession();
        wx.reLaunch({ url: "/pages/login/login?force=1" });
      }
    });
  },

  onShareTimeline: function() {
    return { title: "徕舞女子塑形 · 约一节课" };
  },

  onShareAppMessage: function() {
    return { title: "徕舞女子塑形 · 约一节课", path: "/pages/me/me" };
  }
});
