var api = require("../../utils/api.js");

var VENUE_DATA = [];

var TEAM_DATA = [];

var OFFERINGS_DATA = [];

Page({
  data: {
    heroTitle: "了解徕舞",
    heroSubtitle: "以克制之道，唤醒身体内在的秩序与平衡",
    sec1Num: "01",
    sec1Title: "场馆空间",
    sec1En: "SPACES",
    sec1Intro: "柔和漫射日光、天然实木大器械与私密更衣室，营造沉静专注的练习氛围。",
    sec2Num: "02",
    sec2Title: "同行导师",
    sec2En: "MENTORS",
    sec2Intro: "深耕女子塑形与体态矫正，用细腻口令与精准触觉纠正，守护每次发力安全。",
    sec3Num: "03",
    sec3Title: "项目介绍",
    sec3En: "OFFERINGS",
    sec3Intro: "针对不同阶段与体态目标，由主理团队精心研发的核心训练体系。",
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
    // 首次进入由 onLoad 拉取，避免同一个页面连发两轮请求；之后每次回到页面再实时刷新
    if (this._shownBefore) {
      this.fetchAllBrandData();
    }
    this._shownBefore = true;
  },

  fullUrl: function(p) {
    if (!p) return "";
    if (p.indexOf("http") === 0) return p;
    return api.getBaseUrl() + p;
  },

  fetchAllBrandData: function() {
    var that = this;

    // 0. 同步页面主副标题与三大板块文案
    api.request({
      url: "/api/portal/brand-settings",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({
            heroTitle: res.data.heroTitle || that.data.heroTitle,
            heroSubtitle: res.data.heroSubtitle || that.data.heroSubtitle,
            sec1Num: res.data.sec1Num || that.data.sec1Num,
            sec1Title: res.data.sec1Title || that.data.sec1Title,
            sec1En: res.data.sec1En || that.data.sec1En,
            sec1Intro: res.data.sec1Intro || that.data.sec1Intro,
            sec2Num: res.data.sec2Num || that.data.sec2Num,
            sec2Title: res.data.sec2Title || that.data.sec2Title,
            sec2En: res.data.sec2En || that.data.sec2En,
            sec2Intro: res.data.sec2Intro || that.data.sec2Intro,
            sec3Num: res.data.sec3Num || that.data.sec3Num,
            sec3Title: res.data.sec3Title || that.data.sec3Title,
            sec3En: res.data.sec3En || that.data.sec3En,
            sec3Intro: res.data.sec3Intro || that.data.sec3Intro,
          });
        }
      }
    });

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

