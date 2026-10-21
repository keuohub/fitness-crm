var api = require("../../utils/api.js");
var format = require("../../utils/format.js");

function enrichLetterContent(rawText) {
  // 不再生成任何模板正文：后台给什么就展示什么，没有就显示空状态
  return rawText || "";
}

Page({
  data: {
    latestFeedback: null,
    historyFeedbacks: [],
    latestExpanded: true, // 默认展开首封信件，呈现充实温度
    loading: true,
    error: "",
    baseUrl: "",
    memberId: null,
    memberName: "",
    joinDays: 0,
    trainCount: 0
  },

  onLoad: function() {
    var memberId = wx.getStorageSync("memberId");
    if (!memberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    var baseUrl = wx.getStorageSync("baseUrl") || api.DEFAULT_BASE_URL;
    var memberName = wx.getStorageSync("memberName") || "身体掌权者";
    var joinDays = Number(wx.getStorageSync("joinDays") || 0);
    var trainCount = Number(wx.getStorageSync("trainCount") || 0);

    this.setData({
      baseUrl: baseUrl,
      memberId: Number(memberId),
      memberName: memberName,
      joinDays: joinDays,
      trainCount: trainCount
    });
    this.loadData();
    this.loadTrainings();

    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"]
      });
    }
  },

  apiHeaders: function() {
    return {
      "Content-Type": "application/json",
      "X-Portal-Member-Id": String(this.data.memberId)
    };
  },

  loadTrainings: function() {
    var that = this;
    var memberId = that.data.memberId;
    api.request({
      url: "/api/trainings?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          that.setData({ trainCount: res.data.length });
          wx.setStorageSync("trainCount", res.data.length);
        }
      }
    });
  },

  loadData: function() {
    var that = this;
    var memberId = that.data.memberId;
    var memberName = that.data.memberName;

    api.request({
      url: "/api/ai/period-report?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var reports = Array.isArray(res.data) ? res.data : (res.data.reports || []);
          var items = reports.map(function(r) {
            var rawClean = format.cleanMarkdown(r.content || "");
            var fullRichContent = enrichLetterContent(rawClean, memberName, r.reportType);
            return {
              id: r.id || Math.random(),
              reportType: r.reportType || "feedback",
              typeLabel: format.formatReportType(r.reportType),
              date: format.formatChineseDate(r.generatedAt || r.createdAt),
              content: fullRichContent,
              summary: fullRichContent.slice(0, 150) + (fullRichContent.length > 150 ? "..." : ""),
              expanded: false
            };
          });
          var latest = items.length > 0 ? items[0] : null;
          var history = items.length > 1 ? items.slice(1) : [];
          that.setData({ latestFeedback: latest, historyFeedbacks: history, loading: false });
        } else {
          that.setData({ latestFeedback: null, historyFeedbacks: [], loading: false });
        }
      },
      fail: function() {
        that.setData({ latestFeedback: null, historyFeedbacks: [], loading: false });
      }
    });
  },

  fallbackDemo: function() {
    var that = this;
    var isDemo = wx.getStorageSync("isDemoMode") === true;
    if (!isDemo) {
      that.setData({ loading: false });
      return;
    }
    var reportStr = wx.getStorageSync("demo_reports") || "[]";
    var reports = JSON.parse(reportStr).map(function(r) {
      var rawClean = format.cleanMarkdown(r.content || "");
      var fullRichContent = enrichLetterContent(rawClean, "知意", r.reportType);
      return {
        id: Math.random(),
        reportType: r.reportType || "feedback",
        typeLabel: format.formatReportType(r.reportType),
        date: format.formatChineseDate(r.generatedAt || r.createdAt),
        content: fullRichContent,
        summary: fullRichContent.slice(0, 150) + "...",
        expanded: false
      };
    });
    var latest = reports.length > 0 ? reports[0] : null;
    var history = reports.length > 1 ? reports.slice(1) : [];
    that.setData({ latestFeedback: latest, historyFeedbacks: history, loading: false });
  },

  toggleLatest: function() {
    this.setData({ latestExpanded: !this.data.latestExpanded });
  },

  toggleItem: function(e) {
    var index = e.currentTarget.dataset.index;
    var items = this.data.historyFeedbacks;
    items[index].expanded = !items[index].expanded;
    this.setData({ historyFeedbacks: items });
  },

  goToFeeling: function() {
    // growth 不是 tabBar 页面，switchTab 到这里会静默失败（点了没反应）
    var pages = getCurrentPages();
    if (pages && pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: "/pages/stars/stars" });
  },

  contactXiaoqiao: function() {
    wx.setClipboardData({
      data: "Laiwu0010",
      success: function() {
        wx.showModal({
          title: "小桥专属微信已复制",
          content: "已为你复制小桥微信号【Laiwu0010】。\n随时交流身体体感、饮食疑惑与私教排课。",
          showCancel: false,
          confirmText: "知道了"
        });
      }
    });
  },

  endLoadingQuietly: function() {
    this.setData({ loading: false });
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, hidden: false });
    }

    var currentMemberId = Number(wx.getStorageSync("memberId") || 0);
    if (!currentMemberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }

    var memberName = wx.getStorageSync("memberName") || "身体掌权者";
    var joinDays = Number(wx.getStorageSync("joinDays") || 0);
    var trainCount = Number(wx.getStorageSync("trainCount") || 0);

    this.setData({
      memberName: memberName,
      joinDays: joinDays,
      trainCount: trainCount
    });

    if (this.data.memberId !== currentMemberId) {
      this.setData({
        memberId: currentMemberId,
        latestFeedback: null,
        historyFeedbacks: [],
        loading: true
      });
      this.loadData();
      this.loadTrainings();
    }
  },

  onPullDownRefresh: function() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage: function() {
    return {
      title: "小桥的来信 · 徕舞私享手札",
      path: "/pages/stars/stars"
    };
  },

  onShareTimeline: function() {
    return {
      title: "小桥的来信 · 徕舞私享手札",
      query: ""
    };
  }
});
