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
        pagePath: "/pages/booking/booking",
        text: "开始约课"
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
  attached: function() {
    // 按当前路由反推选中项，避免每页 onShow 硬编码 + 首帧错高亮
    var pages = getCurrentPages();
    var route = pages.length ? "/" + pages[pages.length - 1].route : "/pages/stars/stars";
    var idx = this.data.list.findIndex(function(item) { return item.pagePath === route; });
    if (idx >= 0) this.setData({ selected: idx });
  },

  methods: {
    updateTab: function(targetRoute) {
      var route = targetRoute;
      if (!route) {
        var pages = getCurrentPages();
        route = pages.length ? "/" + pages[pages.length - 1].route : "/pages/stars/stars";
      }
      if (route.charAt(0) !== "/") {
        route = "/" + route;
      }
      var idx = this.data.list.findIndex(function(item) {
        return item.pagePath === route;
      });
      this.setData({
        selected: idx >= 0 ? idx : 0,
        hidden: false
      });
    },

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
