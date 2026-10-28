// pages/stars/stars.js
var api = require("../../utils/api.js");

var hasShownSplashThisSession = false;

Page({
  data: {
    starsList: [],
    currentIndex: 0,
    currentStar: null,
    baseUrl: "",
    loading: true,
    loadError: "",
    showSplash: false,
    splashFadeOut: false
  },

  onLoad: function() {
    var baseUrl = api.getBaseUrl();
    var cached = wx.getStorageSync("cached_stars");
    var initialList = Array.isArray(cached) && cached.length > 0 ? cached : [];

    var showSplash = !hasShownSplashThisSession;
    if (showSplash) {
      hasShownSplashThisSession = true;
    }

    this.setData({
      baseUrl: baseUrl,
      starsList: initialList,
      currentStar: initialList[0] || null,
      loading: initialList.length === 0,
      showSplash: showSplash,
      splashFadeOut: false
    });

    if (showSplash) {
      this.setTabBarHidden(true);
      var that = this;
      this._splashTimer = setTimeout(function() {
        that.skipSplash();
      }, 2400);
    }

    this.fetchRemoteStars();
  },

  setTabBarHidden: function(hidden) {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ hidden: hidden });
    }
  },

  noop: function() {},

  skipSplash: function() {
    var that = this;
    if (this._splashTimer) {
      clearTimeout(this._splashTimer);
      this._splashTimer = null;
    }
    if (!this.data.showSplash || this.data.splashFadeOut) return;
    if (wx.vibrateShort) {
      try { wx.vibrateShort({ type: "light" }); } catch (e) {}
    }
    this.setData({ splashFadeOut: true });
    setTimeout(function() {
      that.setData({
        showSplash: false,
        splashFadeOut: false
      });
      that.setTabBarHidden(false);
    }, 450);
  },

  onShow: function() {
    if (this.data.showSplash) {
      this.setTabBarHidden(true);
    } else if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0,
        hidden: false
      });
    }
    // 超过 30 秒才在 onShow 时静默拉取，彻底消除刚进页面时的并发双发
    var now = Date.now();
    if (!this._lastFetch || now - this._lastFetch > 30000) {
      this.fetchRemoteStars();
    }
  },

  fullUrl: function(p) {
    if (!p) return "";
    if (p.indexOf("http") === 0) return p;
    return api.getBaseUrl() + p;
  },

  fetchRemoteStars: function() {
    var that = this;
    this._lastFetch = Date.now();
    api.request({
      url: "/api/portal/stars",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
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
          wx.setStorageSync("cached_stars", formatted);
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
          that.setData({ loading: false, loadError: that.data.starsList.length ? "" : "加载失败" });
        }
      },
      fail: function() {
        that.setData({ loading: false, loadError: that.data.starsList.length ? "" : "网络异常" });
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
    var star = this.data.currentStar || (this.data.starsList && this.data.starsList[0]);
    var title = star && star.name ? ("徕舞之星 · " + star.name + " 的蜕变姿态") : "徕舞之星 · 真实学员蜕变姿态";
    return {
      title: title,
      path: "/pages/stars/stars"
    };
  }
});
