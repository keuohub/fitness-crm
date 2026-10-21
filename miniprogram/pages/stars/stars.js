// pages/stars/stars.js
var api = require("../../utils/api.js");

var DEFAULT_STARS_DATA = [
  {
    id: 1,
    name: "林晓",
    journey: "相伴自律 140 天 · 42 节大器械私教",
    avatarUrl: "/images/stars/member_star_1.jpg",
    quote: "“肩颈松弛下来之后，呼吸都深了，连夜里的睡眠都踏实了许多。”"
  },
  {
    id: 2,
    name: "许诺",
    journey: "相伴自律 210 天 · 68 节大器械私教",
    avatarUrl: "/images/stars/member_star_2.jpg",
    quote: "“以前总习惯性耸肩，在这里找回了背部力量，整个人自然挺拔了。”"
  },
  {
    id: 3,
    name: "宋予安",
    journey: "相伴自律 95 天 · 30 节精选普拉提",
    avatarUrl: "/images/stars/member_star_3.jpg",
    quote: "“把注意力收回到每一次呼与吸，身体比想象中更有内在的韧性。”"
  },
  {
    id: 4,
    name: "温澜",
    journey: "相伴自律 180 天 · 56 节维密减脂",
    avatarUrl: "/images/stars/member_star_4.jpg",
    quote: "“假胯宽纠正之后，不仅腿部线条顺畅了，走路腰也不再酸沉。”"
  },
  {
    id: 5,
    name: "苏晴",
    journey: "相伴自律 320 天 · 96 节深度蜕变",
    avatarUrl: "/images/stars/star-1.jpg",
    quote: "“在呼吸的节律里，重新找回身体原本的力量与从容。”"
  },
  {
    id: 6,
    name: "念安",
    journey: "相伴自律 260 天 · 80 节大器械私教",
    avatarUrl: "/images/stars/star-2.jpg",
    quote: "“每一次对抗与拉伸，都是与自己身体最真实踏实的对话。”"
  }
];

Page({
  data: {
    starsList: DEFAULT_STARS_DATA,
    currentIndex: 0,
    currentStar: DEFAULT_STARS_DATA[0],
    baseUrl: ""
  },

  onLoad: function() {
    var baseUrl = wx.getStorageSync("baseUrl") || api.DEFAULT_BASE_URL;
    this.setData({
      baseUrl: baseUrl,
      currentStar: this.data.starsList[0]
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
    if (p.indexOf("/images/") === 0) return p;
    if (p.indexOf("/brand/uploads/") === 0) {
      return p.replace("/brand/uploads/", "/images/uploads/");
    }
    var base = this.data.baseUrl || api.DEFAULT_BASE_URL;
    if (p.indexOf("/brand/") === 0) {
      // 优先映射到本地高精图，若本地不存在则走网络
      var localMap = {
        "/brand/stars/member_star_1.jpg": "/images/stars/member_star_1.jpg",
        "/brand/stars/member_star_2.jpg": "/images/stars/member_star_2.jpg",
        "/brand/stars/member_star_3.jpg": "/images/stars/member_star_3.jpg",
        "/brand/stars/member_star_4.jpg": "/images/stars/member_star_4.jpg",
        "/brand/stars/star-1.jpg": "/images/stars/star-1.jpg",
        "/brand/stars/star-2.jpg": "/images/stars/star-2.jpg"
      };
      if (localMap[p]) return localMap[p];
      return base + p;
    }
    return base + p;
  },

  fetchRemoteStars: function() {
    var that = this;
    api.request({
      url: "/api/portal/stars",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          var formatted = res.data.map(function(s, idx) {
            var j = s.journey;
            if (!j && (s.joinDays || s.trainCount)) {
              j = "相伴自律 " + (s.joinDays || 0) + " 天 · " + (s.trainCount || 0) + " 节" + (s.courseType || "大器械私教");
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
          if (currIndex >= formatted.length) {
            currIndex = 0;
          }

          that.setData({
            starsList: formatted,
            currentIndex: currIndex,
            currentStar: formatted[currIndex]
          });
        }
      },
      fail: function() {
        // 网络请求失败保持默认兜底，不做报错阻断
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

  onShareAppMessage: function() {
    var star = this.data.currentStar || this.data.starsList[0];
    return {
      title: "徕舞之星 · " + star.name + " 的蜕变姿态",
      path: "/pages/stars/stars"
    };
  }
});
