// pages/transformation/transformation.js
// 设计原则：只展示后台真实录入的数据，不推算、不编造、不堆文案。
// 会员一眼看到：来了多少天、一共上了多少节、四类课各多少、身体变化、小桥记录。
var api = require("../../utils/api.js");
var format = require("../../utils/format.js");

function requestPromise(options) {
  return new Promise(function(resolve) {
    api.request(Object.assign({}, options, {
      success: function(res) { resolve(res); },
      fail: function(err) { resolve({ statusCode: 500, error: err }); }
    }));
  });
}

Page({
  data: {
    loading: true,
    loadError: "",
    memberId: null,
    memberName: "",
    avatarUrl: "",
    joinedAt: "",
    joinDays: null,
    totalHours: 0,
    courseCounts: [],
    latestTrainingDate: "",

    selectedAngle: "all",
    angleTabs: [
      { key: "all", label: "全部" },
      { key: "front", label: "正面" },
      { key: "side", label: "侧面" },
      { key: "back", label: "背面" }
    ],
    comparisons: [],
    shownComparisons: [],

    coachNotes: [],

    feeling: "",
    feelingSubmitting: false,
    feelingReceipt: "",
    feelingTags: [
      { name: "肩颈舒展", active: false },
      { name: "核心收紧", active: false },
      { name: "整个人轻盈了", active: false },
      { name: "体态更挺拔", active: false },
      { name: "呼吸顺畅", active: false }
    ],
    latestReply: null
  },

  onLoad: function() {
    var memberId = wx.getStorageSync("memberId");
    if (!memberId || !wx.getStorageSync("memberToken")) {
      wx.reLaunch({ url: "/pages/login/login?force=1" });
      return;
    }
    this.setData({
      memberId: Number(memberId),
      memberName: wx.getStorageSync("memberName") || ""
    });
    this.loadAll();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, hidden: false });
    }
    var now = Date.now();
    if (this.data.memberId && (!this._lastLoad || now - this._lastLoad > 3000)) {
      this._lastLoad = now;
      this.loadAll();
    }
  },

  onPullDownRefresh: function() {
    var that = this;
    this.loadAll(function() { wx.stopPullDownRefresh(); });
  },

  fullUrl: function(p) {
    if (!p) return "";
    if (p.indexOf("http") === 0) return p;
    return api.getBaseUrl() + p;
  },

  loadAll: function(done) {
    var that = this;
    var finished = typeof done === "function" ? done : function() {};
    var memberId = that.data.memberId;
    if (!memberId) { that.setData({ loading: false }); finished(); return; }

    Promise.all([
      requestPromise({ url: "/api/portal/me" }),
      requestPromise({ url: "/api/photo-comparisons?memberId=" + memberId }),
      requestPromise({ url: "/api/portal/coach-notes?memberId=" + memberId }),
      requestPromise({ url: "/api/portal/training-feelings?memberId=" + memberId })
    ]).then(function(results) {
      var resMe = results[0];
      var resCompare = results[1];
      var resNotes = results[2];
      var resFeelings = results[3];
      var payload = { loading: false, loadError: "" };

      if (resMe.statusCode === 200 && resMe.data) {
        var m = resMe.data;
        payload.memberName = m.memberName || that.data.memberName;
        payload.avatarUrl = that.fullUrl(m.avatarUrl || "");
        payload.joinedAt = m.joinedAt ? format.formatChineseDate(m.joinedAt) : "";
        payload.joinDays = (m.joinDays === null || m.joinDays === undefined) ? null : Number(m.joinDays);
        payload.totalHours = Number(m.totalHours || 0);
        payload.courseCounts = Array.isArray(m.courseCounts) ? m.courseCounts : [];
        payload.latestTrainingDate = m.lastTrainingDate ? format.formatShortDate(m.lastTrainingDate) : "";
        if (payload.memberName) wx.setStorageSync("memberName", payload.memberName);
      } else if (resMe.statusCode === 401) {
        payload.loadError = "登录已过期，请重新登录";
      } else {
        payload.loadError = "暂时无法加载，请下拉重试";
      }

      var comparisons = [];
      if (resCompare.statusCode === 200 && Array.isArray(resCompare.data)) {
        comparisons = resCompare.data
          .filter(function(c) { return c && c.photo1_url && c.photo2_url; })
          .map(function(c) {
            return {
              id: c.id,
              photo1_url: that.fullUrl(c.photo1_url),
              photo2_url: that.fullUrl(c.photo2_url),
              photo1_date: c.photo1_date ? format.formatChineseDate(c.photo1_date) : "",
              photo2_date: c.photo2_date ? format.formatChineseDate(c.photo2_date) : "",
              angle: c.photo1_type || c.photo2_type || "front",
              analysis: format.cleanMarkdown(c.analysis || "")
            };
          });
      }
      payload.comparisons = comparisons;

      var notes = [];
      if (resNotes.statusCode === 200 && Array.isArray(resNotes.data)) {
        notes = resNotes.data
          .filter(function(n) { return n && n.coachNote; })
          .slice(0, 4)
          .map(function(n) {
            return {
              id: n.id,
              date: n.createdAt ? format.formatShortDate(n.createdAt) : "",
              content: format.cleanMarkdown(n.coachNote || ""),
              tags: Array.isArray(n.tags) ? n.tags.join(" · ") : ""
            };
          });
      }
      payload.coachNotes = notes;

      if (resFeelings.statusCode === 200 && Array.isArray(resFeelings.data)) {
        var replied = resFeelings.data.filter(function(f) { return f && f.xiaoqiaoReply; });
        payload.latestReply = replied.length ? {
          date: replied[0].createdAt ? format.formatShortDate(replied[0].createdAt) : "",
          reply: format.cleanMarkdown(replied[0].xiaoqiaoReply || "")
        } : null;
      }

      that.setData(payload, function() { that.applyAngle(); });
      finished();
    }).catch(function() {
      that.setData({ loading: false, loadError: "暂时无法加载，请下拉重试" });
      finished();
    });
  },

  switchAngle: function(e) {
    this.setData({ selectedAngle: e.currentTarget.dataset.angle }, this.applyAngle);
  },

  applyAngle: function() {
    var angle = this.data.selectedAngle;
    var list = this.data.comparisons || [];
    var shown = angle === "all" ? list : list.filter(function(c) { return c.angle === angle; });
    this.setData({ shownComparisons: shown });
  },

  previewImage: function(e) {
    var src = e.currentTarget.dataset.src;
    if (!src) return;
    wx.previewImage({ urls: [src], current: src });
  },

  onFeelingInput: function(e) {
    this.setData({ feeling: e.detail.value });
  },

  toggleTag: function(e) {
    var index = Number(e.currentTarget.dataset.index);
    var tags = this.data.feelingTags.map(function(t, i) {
      return i === index ? { name: t.name, active: !t.active } : t;
    });
    this.setData({ feelingTags: tags });
  },

  submitFeeling: function() {
    var that = this;
    if (that.data.feelingSubmitting) return;
    var text = (that.data.feeling || "").trim();
    var tags = that.data.feelingTags.filter(function(t) { return t.active; }).map(function(t) { return t.name; });
    var payloadText = text || (tags.length ? tags.join("、") : "");
    if (!payloadText) {
      wx.showToast({ title: "写一句今天的身体感受吧", icon: "none" });
      return;
    }
    that.setData({ feelingSubmitting: true });
    api.request({
      url: "/api/portal/training-feelings",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { memberId: that.data.memberId, feeling: payloadText },
      success: function(res) {
        if (res.statusCode === 200 || res.statusCode === 201) {
          that.setData({
            feelingSubmitting: false,
            feeling: "",
            feelingTags: that.data.feelingTags.map(function(t) { return { name: t.name, active: false }; }),
            feelingReceipt: "已经放进小桥的便签本了。她会亲自看、亲自回，所以会比机器慢一点。"
          });
        } else {
          that.setData({
            feelingSubmitting: false,
            feelingReceipt: "这次没有提交成功，请稍后再试，或直接在微信找小桥。"
          });
        }
      },
      fail: function() {
        that.setData({
          feelingSubmitting: false,
          feelingReceipt: "网络没有连上，请稍后再试，或直接在微信找小桥。"
        });
      }
    });
  },

  goBooking: function() {
    wx.navigateTo({ url: "/pages/booking/booking" });
  },

  goFeedback: function() {
    wx.navigateTo({ url: "/pages/feedback/feedback" });
  },

  onShareAppMessage: function() {
    return { title: "我的身体手札 · 徕舞", path: "/pages/stars/stars" };
  }
});
