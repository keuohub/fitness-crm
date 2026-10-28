var api = require("../../utils/api.js");

Page({
  data: {
    loading: true,
    error: "",
    companionshipDays: null,
    streakWeeks: 0,
    attendedCount: 0,
    measurements: [],
    notes: [],
    weightBars: [],
    weightKg: "",
    waistCm: "",
    saving: false
  },

  onLoad: function() {
    if (!wx.getStorageSync("memberToken")) {
      wx.reLaunch({ url: "/pages/login/login?force=1" });
      return;
    }
    this.load();
  },

  load: function() {
    var that = this;
    api.request({
      url: "/api/portal/growth",
      success: function(res) {
        if (res.statusCode !== 200 || !res.data) {
          that.setData({ loading: false, error: "成长记录暂时打不开，请稍后重试" });
          return;
        }
        var list = res.data.measurements || [];
        var weights = list.filter(function(m) { return m.weight_kg != null; });
        var max = weights.reduce(function(n, m) { return Math.max(n, Number(m.weight_kg)); }, 0);
        var bars = weights.slice(-8).map(function(m) {
          return { date: String(m.measured_on).slice(5), height: max ? Math.max(8, Math.round(Number(m.weight_kg) / max * 100)) : 8, value: m.weight_kg };
        });
        that.setData({
          loading: false,
          error: "",
          companionshipDays: res.data.companionshipDays,
          streakWeeks: res.data.streakWeeks || 0,
          attendedCount: res.data.attendedCount || 0,
          measurements: list.slice().reverse().slice(0, 12),
          notes: res.data.notes || [],
          weightBars: bars
        });
      },
      fail: function() { that.setData({ loading: false, error: "网络没有连上" }); }
    });
  },

  onWeight: function(e) { this.setData({ weightKg: e.detail.value }); },
  onWaist: function(e) { this.setData({ waistCm: e.detail.value }); },

  save: function() {
    var that = this;
    if (that.data.saving) return;
    that.setData({ saving: true, error: "" });
    api.request({
      url: "/api/portal/growth",
      method: "POST",
      data: { weightKg: that.data.weightKg, waistCm: that.data.waistCm },
      success: function(res) {
        that.setData({ saving: false });
        if (res.statusCode === 201) {
          that.setData({ weightKg: "", waistCm: "" });
          wx.showToast({ title: "已记下", icon: "success" });
          that.load();
        } else {
          that.setData({ error: (res.data && res.data.error) || "没有保存" });
        }
      },
      fail: function() { that.setData({ saving: false, error: "网络没有连上" }); }
    });
  },

  choosePhoto: function() {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      success: function(pick) {
        var token = wx.getStorageSync("memberToken") || "";
        wx.uploadFile({
          url: api.getBaseUrl() + "/api/portal/growth/photo",
          filePath: pick.tempFilePaths[0],
          name: "file",
          header: { Authorization: "Bearer " + token },
          success: function(res) {
            if (res.statusCode === 201) wx.showToast({ title: "照片已私密保存", icon: "success" });
            else wx.showToast({ title: "照片没有传上", icon: "none" });
          },
          fail: function() { wx.showToast({ title: "网络没有连上", icon: "none" }); }
        });
      }
    });
  }
});
