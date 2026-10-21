// pages/stars/stars.js
var api = require("../../utils/api.js");

var STARS_DATA = [
  {
    id: 1,
    name: "林晓",
    tag: "核心重塑",
    journey: "相伴自律 140 天 · 42 节大器械私教",
    avatarUrl: "/images/stars/member_star_1.jpg",
    quote: "“肩颈松弛下来之后，呼吸都深了，连夜里的睡眠都踏实了许多。”"
  },
  {
    id: 2,
    name: "许诺",
    tag: "体态觉知",
    journey: "相伴自律 210 天 · 68 节大器械私教",
    avatarUrl: "/images/stars/member_star_2.jpg",
    quote: "“以前总习惯性耸肩，在这里找回了背部力量，整个人自然挺拔了。”"
  },
  {
    id: 3,
    name: "宋予安",
    tag: "从容舒展",
    journey: "相伴自律 95 天 · 30 节精选普拉提",
    avatarUrl: "/images/stars/member_star_3.jpg",
    quote: "“把注意力收回到每一次呼与吸，身体比想象中更有内在的韧性。”"
  },
  {
    id: 4,
    name: "温澜",
    tag: "骨盆稳定",
    journey: "相伴自律 180 天 · 56 节维密减脂",
    avatarUrl: "/images/stars/member_star_4.jpg",
    quote: "“假胯宽纠正之后，不仅腿部线条顺畅了，走路腰也不再酸沉。”"
  },
  {
    id: 5,
    name: "苏晴",
    tag: "从容优雅",
    journey: "相伴自律 320 天 · 96 节深度蜕变",
    avatarUrl: "/images/stars/star-1.jpg",
    quote: "“在呼吸的节律里，重新找回身体原本的力量与从容。”"
  },
  {
    id: 6,
    name: "念安",
    tag: "力量深耕",
    journey: "相伴自律 260 天 · 80 节大器械私教",
    avatarUrl: "/images/stars/star-2.jpg",
    quote: "“每一次对抗与拉伸，都是与自己身体最真实踏实的对话。”"
  }
];

Page({
  data: {
    starsList: STARS_DATA,
    currentIndex: 0,
    currentStar: STARS_DATA[0]
  },

  onLoad: function() {
    this.setData({
      currentStar: this.data.starsList[0]
    });
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0,
        hidden: false
      });
    }
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
