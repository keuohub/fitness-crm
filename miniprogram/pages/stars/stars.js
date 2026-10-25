// pages/stars/stars.js
var api = require("../../utils/api.js");

var DEFAULT_STARS_DATA = [];

Page({
  data: {
    starsList: [],
    currentIndex: 0,
    currentStar: null,
    baseUrl: "",
    loading: true,
    loadError: ""
  },

  onLoad: function() {
    var baseUrl = api.getBaseUrl();
    this.setData({
      baseUrl: baseUrl,
      currentStar: this.data.starsList[0] || null
    });
    this.fetchRemoteStars();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0,
        hidden: false
      });
    }
    // 每次进入页面静默刷新一次后台最新配置
    this.fetchRemoteStars();
  },

  fullUrl: function(p) {
    if (!p) return "";
    if (p.indexOf("http") === 0) return p;
    return api.getBaseUrl() + p;
  },

  fetchRemoteStars: function() {
    var that = this;
    api.request({
      url: "/api/portal/stars",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          var formatted = res.data.map(function(s, idx) {
            var j = s.journey;
            if (!j && (s.joinDays || s.trainCount)) {
              j = "相伴自律 " + (s.joinDays || 0) + " 天 · " + (s.trainCount || 0) + " 节" + (s.courseType || "私教");
            }
            return {
              id: s.id || (idx + 1),
              name: s.name,
              journey: j || "",
              avatarUrl: that.fullUrl(s.avatarUrl),
              quote: s.quote || ""
            };
          });
          var currIndex = that.data.currentIndex;
          if (currIndex >= formatted.length) currIndex = 0;
          that.setData({
            starsList: formatted,
            currentIndex: currIndex,
            currentStar: formatted[currIndex] || null,
            loading: false,
            loadError: ""
          });
        } else {
          that.setData({ loading: false, loadError: "加载失败" });
        }
      },
      fail: function() {
        that.setData({ loading: false, loadError: "网络异常" });
      }
    });
  },

  onSwiperChange: function(e) {
    var index = e.detail.current;
    this.setData({
      currentIndex: index,
      currentStar: this.data.starsList[index]
    });
    try {
      if (wx.vibrateShort) {
        wx.vibrateShort({ type: "light" });
      }
    } catch (err) {}
  },

  jumpToSlide: function(e) {
    var index = Number(e.currentTarget.dataset.index);
    if (!isNaN(index) && index !== this.data.currentIndex) {
      this.setData({
        currentIndex: index,
        currentStar: this.data.starsList[index]
      });
      try {
        if (wx.vibrateShort) {
          wx.vibrateShort({ type: "light" });
        }
      } catch (err) {}
    }
  },

  onImageTap: function(e) {
    var current = e.currentTarget.dataset.src;
    var urls = this.data.starsList.map(function(s) {
      return s.avatarUrl;
    });
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  onShareTimeline: function() {
    return { title: "徕舞女子塑形 · 身体掌权，终生优雅" };
  },
  onShareAppMessage: function() {
    var star = this.data.currentStar || this.data.starsList[0];
    return {
      title: "徕舞之星 · " + star.name + " 的蜕变姿态",
      path: "/pages/stars/stars"
    };
  }
});
