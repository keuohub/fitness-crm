var api = require("../../utils/api.js");

var VENUE_DATA = [];

var TEAM_DATA = [];

var OFFERINGS_DATA = [];

Page({
  data: {
    venueList: VENUE_DATA,
    teamList: TEAM_DATA,
    offeringsList: OFFERINGS_DATA,
    baseUrl: ""
  },

  onLoad: function() {
    this.setData({ baseUrl: api.getBaseUrl() });
    this.fetchAllBrandData();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1,
        hidden: false
      });
    }
    // 每次进入页面实时同步后台最新数据
    this.fetchAllBrandData();
  },

  fullUrl: function(p) {
    if (!p) return "";
    if (p.indexOf("http") === 0) return p;
    return api.getBaseUrl() + p;
  },

  goBooking: function() {
    wx.navigateTo({ url: "/pages/booking/booking" });
  },

  copyConciergeWechat: function() {
    var account = wx.getStorageSync("conciergeWechat") || "Laiwu0010";
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

  fetchAllBrandData: function() {
    var that = this;

    // 1. 同步空间列表
    api.request({
      url: "/api/portal/venue",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          var mapped = res.data.map(function(v) {
            return {
              id: v.id,
              imageUrl: that.fullUrl(v.imageUrl),
              tag: v.tag || "01 / 空间实景",
              name: v.name || v.title || "空间实景",
              desc: v.desc || ""
            };
          });
          that.setData({ venueList: mapped });
        }
      }
    });

    // 2. 同步导师阵容
    api.request({
      url: "/api/portal/team",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          var mappedTeam = res.data.map(function(t) {
            return {
              id: t.id,
              name: t.name,
              roleTitle: t.roleTitle,
              avatarUrl: that.fullUrl(t.avatarUrl),
              experience: t.experience || "",
              creds: t.creds || "",
              quote: t.quote || (t.bio ? "“" + t.bio + "”" : "")
            };
          });
          that.setData({ teamList: mappedTeam });
        }
      }
    });

    // 3. 同步体系课程类目 (5大核心类目)
    api.request({
      url: "/api/portal/offerings",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          var mappedOfferings = res.data.map(function(o) {
            return {
              id: o.id,
              num: o.num,
              name: o.name,
              enName: o.enName,
              summary: o.summary,
              target: o.target,
              highlight: o.highlight,
              imageUrl: that.fullUrl(o.imageUrl || o.image_url || "")
            };
          });
          that.setData({ offeringsList: mappedOfferings });
        }
      }
    });
  },

  previewVenueImage: function(e) {
    var current = e.currentTarget.dataset.src;
    var urls = this.data.venueList.map(function(v) {
      return v.imageUrl;
    });
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  previewTeamImage: function(e) {
    var current = e.currentTarget.dataset.src;
    var urls = this.data.teamList.map(function(t) {
      return t.avatarUrl;
    });
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  onShareAppMessage: function() {
    return {
      title: "了解徕舞 · 专注体态与身心平衡的私享空间",
      path: "/pages/brand/brand"
    };
  }
});

