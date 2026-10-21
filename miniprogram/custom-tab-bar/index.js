Component({
  data: {
    selected: 0,
    hidden: false,
    list: [
      {
        pagePath: "/pages/stars/stars",
        text: "徕舞之星"
      },
      {
        pagePath: "/pages/brand/brand",
        text: "了解徕舞"
      },
      {
        pagePath: "/pages/transformation/transformation",
        text: "我的蜕变"
      },
      {
        pagePath: "/pages/me/me",
        text: "我的账户"
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
