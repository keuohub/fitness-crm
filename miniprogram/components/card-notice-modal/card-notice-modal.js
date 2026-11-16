var api = require("../../utils/api.js");

Component({
  data: {
    showModal: false,
    notice: null
  },

  lifetimes: {
    attached: function() {
      this.checkNewNotice();
    }
  },

  pageLifetimes: {
    show: function() {
      // 页面每次显示时检查是否有后台新开的卡（且当前未展示）
      if (!this.data.showModal) {
        this.checkNewNotice();
      }
    }
  },

  methods: {
    noop: function() {},

    checkNewNotice: function() {
      var that = this;
      var memberId = wx.getStorageSync("memberId");
      var token = wx.getStorageSync("memberToken");
      // 未登录不请求
      if (!memberId || !token) return;

      api.request({
        url: "/api/portal/cards/new-notice",
        method: "GET",
        success: function(res) {
          if (res.statusCode === 200 && res.data && res.data.hasNotice && res.data.notice) {
            var n = res.data.notice;
            // 校验本地是否刚刚在这个会话确认过
            var ackKey = "ack_notice_" + n.noticeId;
            if (wx.getStorageSync(ackKey)) {
              return;
            }
            that.setData({
              showModal: true,
              notice: n
            });
          }
        },
        fail: function() {
          // 静默失败，不打扰会员
        }
      });
    },

    acknowledgeNotice: function() {
      var n = this.data.notice;
      if (!n || !n.noticeId) return;

      wx.setStorageSync("ack_notice_" + n.noticeId, 1);

      api.request({
        url: "/api/portal/cards/new-notice",
        method: "POST",
        data: { noticeId: n.noticeId, cardId: n.cardId },
        success: function() {},
        fail: function() {}
      });
    },

    handleClose: function() {
      this.acknowledgeNotice();
      this.setData({ showModal: false });
      this.triggerEvent("close");
    },

    handleGoBooking: function() {
      this.acknowledgeNotice();
      this.setData({ showModal: false });
      this.triggerEvent("confirm");
      wx.switchTab({ url: "/pages/booking/booking" });
    }
  }
});
