Component({
  data: {
    selected: 0,
    hidden: false,
    list: [
      {
        pagePath: "/pages/growth/growth",
        text: "成长"
      },
      {
        pagePath: "/pages/feedback/feedback",
        text: "小桥来信"
      },
      {
        pagePath: "/pages/me/me",
        text: "我的"
      }
    ]
  },
  methods: {
    switchTab: function(e) {
      var data = e.currentTarget.dataset;
      var url = data.path;
      try {
        if (wx.vibrateShort) {
          wx.vibrateShort({ type: "light" });
        }
      } catch (err) {}
      wx.switchTab({ url: url });
      this.setData({
        selected: data.index
      });
    }
  }
});
