// pages/stars/stars.js
var api = require("../../utils/api.js");

var hasShownSplashThisSession = false;

var DEFAULT_STARS = [
  { id: 1, name: "陈芳", avatarUrl: "/images/stars/member_star_1.jpg", quote: "“肩颈松弛下来之后，呼吸都深了，连夜里的睡眠都踏实了许多。”", journey: "相伴自律 365 天 · 100 节大器械私教" },
  { id: 3, name: "王晓燕", avatarUrl: "/images/stars/member_star_3.jpg", quote: "“把注意力收回到每一次呼与吸，身体比想象中更有内在的韧性。”", journey: "相伴自律 365 天 · 30 节精选普拉提" },
  { id: 4, name: "刘立想", avatarUrl: "/images/stars/member_star_4.jpg", quote: "“在呼吸的节律里，重新找回身体原本的力量与从容。”", journey: "相伴自律 365 天 · 56 节精选普拉提" },
  { id: 2, name: "袁琪", avatarUrl: "/images/stars/member_star_2.jpg", quote: "“以前总习惯性耸肩，在这里找回了背部力量，整个人自然挺拔了。”", journey: "相伴自律 365 天 · 精选普拉提" }
];

Page({
  data: {
    starsList: DEFAULT_STARS,
    currentIndex: 0,
    currentStar: DEFAULT_STARS[0],
    baseUrl: "",
    loading: false,
    loadError: "",
    showSplash: false,
    splashFadeOut: false
  },

  onLoad: function() {
    var baseUrl = api.getBaseUrl();
    var cached = wx.getStorageSync("cached_stars");
    var initialList = Array.isArray(cached) && cached.length > 0 ? cached : DEFAULT_STARS;

    var showSplash = !hasShownSplashThisSession;
    if (showSplash) {
      hasShownSplashThisSession = true;
    }

    this.setData({
      baseUrl: baseUrl,
      starsList: initialList,
      currentStar: initialList[0] || null,
      loading: false,
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

  splashToBooking: function() {
    this.skipSplash();
    wx.switchTab({ url: "/pages/booking/booking" });
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
    if (p.indexOf("member_star_1") >= 0) return "/images/stars/member_star_1.jpg";
    if (p.indexOf("member_star_2") >= 0) return "/images/stars/member_star_2.jpg";
    if (p.indexOf("member_star_3") >= 0) return "/images/stars/member_star_3.jpg";
    if (p.indexOf("member_star_4") >= 0 || p.indexOf("brand-1792570568116-z3ysm9") >= 0) return "/images/stars/member_star_4.jpg";
    if (p.indexOf("http") === 0) return p;
    // 本地包内直读，零延迟
    if (p.indexOf("/images/") === 0) return p;
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
