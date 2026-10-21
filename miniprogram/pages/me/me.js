// pages/me/me.js
// 原则：页面不生产任何数字。所有数值来自 /api/portal/me，缺数据就显示「待录入」，绝不兜底成假值。
var api = require("../../utils/api.js");
var format = require("../../utils/format.js");

Page({
  data: {
    initial: "",
    avatarUrl: "",
    memberName: "",
    memberCode: "",
    mentorName: "",
    status: "",
    joinDays: null,
    formattedDays: "",
    joinedAt: "",
    totalHours: 0,
    trainingsByType: [],
    questionnaireCount: 0,
    photoCount: 0,
    stageName: "",
    stageProgress: 0,
    lastTrainingDate: "",
    feelings: [],
    loading: true,
    baseUrl: "",
    memberId: null
  },

  onLoad: function() {
    var memberId = wx.getStorageSync("memberId");
    if (!memberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    var baseUrl = wx.getStorageSync("baseUrl") || api.DEFAULT_BASE_URL;
    var cachedName = wx.getStorageSync("memberName") || "";

    this.setData({
      baseUrl: baseUrl,
      memberId: Number(memberId),
      memberName: cachedName,
      initial: cachedName ? cachedName.charAt(0) : ""
    });

    this.loadData();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3,
        hidden: false
      });
    }

    var currentMemberId = Number(wx.getStorageSync("memberId") || 0);
    if (!currentMemberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }

    if (this.data.memberId && this.data.memberId !== currentMemberId) {
      this.setData({
        memberId: currentMemberId,
        feelings: [],
        totalHours: 0,
        trainingsByType: [],
        loading: true
      });
      this.loadData();
    }
  },

  onPullDownRefresh: function() {
    var that = this;
    this.loadData(function() {
      wx.stopPullDownRefresh();
    });
  },

  apiHeaders: function() {
    return {
      "Content-Type": "application/json",
      "X-Portal-Member-Id": String(this.data.memberId)
    };
  },

  fullUrl: function(p) {
    if (!p) return "";
    if (p.indexOf("http") === 0) return p;
    if (p.indexOf("/images/") === 0) return p;
    return (this.data.baseUrl || "") + p;
  },

  handleAvatarTap: function() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      success: function(res) {
        var filePath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (!filePath) return;
        wx.showLoading({ title: "正在更新写真...", mask: true });
        wx.uploadFile({
          url: that.data.baseUrl + "/api/portal/avatar",
          filePath: filePath,
          name: "file",
          formData: { memberId: that.data.memberId },
          header: { "X-Portal-Member-Id": String(that.data.memberId) },
          success: function(up) {
            wx.hideLoading();
            var data = {};
            try { data = JSON.parse(up.data || "{}"); } catch (e) {}
            if (up.statusCode === 200 && data.avatarUrl) {
              that.setData({ avatarUrl: that.fullUrl(data.avatarUrl) });
              wx.showToast({ title: "写真已更新", icon: "success" });
            } else {
              wx.showToast({ title: "更新失败，请重试", icon: "none" });
            }
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: "网络微忙，请重试", icon: "none" });
          }
        });
      }
    });
  },

  loadData: function(done) {
    var that = this;
    var memberId = that.data.memberId;
    var finished = typeof done === "function" ? done : function() {};

    api.request({
      url: "/api/portal/me",
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var m = res.data;
          var joinDays = (m.joinDays === null || m.joinDays === undefined) ? null : Number(m.joinDays);
          var stage = m.stage || {};

          that.setData({
            loading: false,
            memberName: m.memberName || "",
            initial: (m.memberName || "").charAt(0) || "会",
            memberCode: m.memberCode || "",
            joinedAt: m.joinedAt ? format.formatChineseDate(m.joinedAt) : "",
            mentorName: m.mentorName || "",
            status: m.status || "",
            joinDays: joinDays,
            formattedDays: joinDays === null ? "" : String(joinDays).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
            totalHours: Number(m.totalHours || 0),
            trainingsByType: Array.isArray(m.trainingsByType) ? m.trainingsByType : [],
            questionnaireCount: Number(m.questionnaireCount || 0),
            photoCount: Number(m.photoCount || 0),
            stageName: stage.name || "",
            stageProgress: Number(stage.progress || 0),
            lastTrainingDate: m.lastTrainingDate ? format.formatShortDate(m.lastTrainingDate) : "",
            avatarUrl: that.fullUrl(m.avatarUrl)
          });

          if (m.memberName) wx.setStorageSync("memberName", m.memberName);
          if (joinDays !== null) wx.setStorageSync("joinDays", joinDays);
        } else {
          that.setData({ loading: false });
        }
        finished();
      },
      fail: function() {
        that.setData({ loading: false });
        finished();
      }
    });

    // 体感便签与回音：没有就是没有，不再塞示范档案
    api.request({
      url: "/api/portal/training-feelings?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          var list = res.data.map(function(f) {
            return {
              id: f.id,
              date: format.formatShortDate(f.createdAt),
              feeling: format.cleanMarkdown(f.feeling || ""),
              xiaoqiaoReply: format.cleanMarkdown(f.xiaoqiaoReply || ""),
              pending: !f.xiaoqiaoReply
            };
          });
          that.setData({ feelings: list.slice(0, 5) });
        } else {
          that.setData({ feelings: [] });
        }
      },
      fail: function() {
        that.setData({ feelings: [] });
      }
    });
  },

  goBooking: function() {
    wx.navigateTo({ url: "/pages/booking/booking" });
  },

  goLetters: function() {
    wx.navigateTo({ url: "/pages/feedback/feedback" });
  },

  copyConciergeWechat: function() {
    var account = wx.getStorageSync("conciergeWechat") || "Laiwu0010";
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    } catch (err) {}
    wx.setClipboardData({
      data: account,
      success: function() {
        wx.showModal({
          title: "顾问微信已复制",
          content: "已复制「" + account + "」。回到微信搜索该账号，备注你的姓名，小桥会把你拉进专属沟通。",
          showCancel: false,
          confirmText: "好"
        });
      }
    });
  },

  handleLogout: function() {
    var baseUrl = this.data.baseUrl;
    wx.showModal({
      title: "暂别提示",
      content: "确定要暂时离开当前专属账户吗？再次进入需重新验证身份口令。",
      confirmText: "暂时离开",
      confirmColor: "#9E2A2B",
      cancelText: "继续留在手札",
      success: function(res) {
        if (res.confirm) {
          wx.clearStorageSync();
          if (baseUrl) wx.setStorageSync("baseUrl", baseUrl);
          wx.reLaunch({ url: "/pages/login/login?force=1" });
        }
      }
    });
  },

  onShareAppMessage: function() {
    return {
      title: "我的身体手札 · 徕舞",
      path: "/pages/stars/stars"
    };
  }
});
