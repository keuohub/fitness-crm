var api = require("../../utils/api.js");
var format = require("../../utils/format.js");

Page({
  data: { loading: true, error: "", cards: [] },

  onLoad: function() {
    if (!wx.getStorageSync("memberToken")) {
      wx.reLaunch({ url: "/pages/login/login?force=1" });
      return;
    }
    this.load();
  },

  onShow: function() {
    if (this.data.cards.length) this.load();
  },

  onPullDownRefresh: function() {
    var that = this;
    this.load(function() { wx.stopPullDownRefresh(); });
  },

  load: function(done) {
    var that = this;
    var finished = typeof done === "function" ? done : function() {};
    api.request({
      url: "/api/portal/cards",
      success: function(res) {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.cards)) {
          var cards = res.data.cards.map(function(c) {
            var statusMap = { active: "有效", frozen: "已冻结", exhausted: "已用完", expired: "已过期" };
            return {
              id: c.id,
              name: c.name,
              // 年卡身份：接口按「期限卡且有效期≥365天或名称含年卡」判定
              isAnnual: c.isAnnualCard === true,
              categoryText: c.category === "count" ? "次数卡" : "期限卡",
              statusText: statusMap[c.status] || c.status,
              status: c.status,
              courseScopeText: (c.courseCategoryNames && c.courseCategoryNames.length > 0)
                ? c.courseCategoryNames.join(" · ")
                : "",
              remainingText: c.category === "count" ? (c.remainingCount || 0) + " 次" : "不限次",
              renewalText: (function() {
                if (c.status !== "active") return "";
                if (c.category === "count" && Number(c.remainingCount) > 0 && Number(c.remainingCount) <= 3) {
                  return "还剩 " + c.remainingCount + " 次，续卡请联系小桥";
                }
                if (c.validUntil) {
                  var today = new Date();
                  var end = new Date(String(c.validUntil).slice(0, 10).replace(/-/g, "/"));
                  var days = Math.round((end.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
                  if (days >= 0 && days <= 14) return "还有 " + days + " 天到期，续卡请联系小桥";
                }
                return "";
              })(),
              validText: c.validUntil ? (c.validUntil + " 到期") : "长期有效",
              purchasedText: c.purchasedAt ? format.formatChineseDate(c.purchasedAt) : "",
              transactions: (c.transactions || []).slice(0, 5).map(function(t) {
                var typeMap = { purchase: "开卡/续卡", deduct: "消课", refund: "退回", expire: "过期", adjust: "调整" };
                return {
                  id: t.id,
                  label: typeMap[t.type] || t.type,
                  amount: t.amount > 0 ? "+" + t.amount : String(t.amount),
                  note: t.note || "",
                  date: t.createdAt ? format.formatShortDate(t.createdAt) : ""
                };
              })
            };
          });
          that.setData({ loading: false, error: "", cards: cards });
        } else if (res.statusCode === 401) {
          that.setData({ loading: false, error: "登录已过期，请重新登录" });
        } else {
          that.setData({ loading: false, error: "暂时无法加载，请下拉重试" });
        }
        finished();
      },
      fail: function() {
        that.setData({ loading: false, error: "网络没有连上，请下拉重试" });
        finished();
      }
    });
  }
,
  onShareAppMessage: function() {
    return { title: "徕舞女子塑形 · 我的会员卡", path: "/pages/brand/brand" };
  },
  onShareTimeline: function() {
    return { title: "徕舞女子塑形 · 身体掌权，终生优雅" };
  }
});
