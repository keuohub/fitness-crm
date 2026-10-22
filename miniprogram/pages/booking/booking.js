// pages/booking/booking.js
// 会员约课：真实课表、余位、预约、取消。只操作自己的预约。
var api = require("../../utils/api.js");

function fmt(d) {
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}
function addDays(dateStr, n) {
  var p = dateStr.split("-").map(Number);
  var d = new Date(p[0], p[1] - 1, p[2]);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

Page({
  data: {
    loading: true,
    error: "",
    dates: [],
    selectedDate: "",
    weekStart: "",
    sessions: [],
    shownSessions: [],
    myBookings: [],
    submitting: false
  },

  onLoad: function() {
    if (!wx.getStorageSync("memberToken")) {
      wx.reLaunch({ url: "/pages/login/login?force=1" });
      return;
    }
    var today = fmt(new Date());
    var dates = [];
    var names = ["日", "一", "二", "三", "四", "五", "六"];
    for (var i = 0; i < 7; i++) {
      var ds = addDays(today, i);
      var d = new Date(ds + "T00:00:00");
      dates.push({ value: ds, weekday: i === 0 ? "今天" : "周" + names[d.getDay()], day: ds.slice(5) });
    }
    this.setData({ dates: dates, selectedDate: today, weekStart: today });
    this.loadAll();
  },

  onShow: function() {
    if (!this.data.loading) this.loadAll();
  },

  onPullDownRefresh: function() {
    var that = this;
    this.loadAll(function() { wx.stopPullDownRefresh(); });
  },

  selectDate: function(e) {
    var date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date }, this.applyFilter);
  },

  applyFilter: function() {
    var date = this.data.selectedDate;
    var list = (this.data.sessions || []).filter(function(s) { return s.sessionDate === date; });
    this.setData({ shownSessions: list });
  },

  loadAll: function(done) {
    var that = this;
    var finished = typeof done === "function" ? done : function() {};
    var from = that.data.weekStart;
    var to = addDays(from, 6);
    var pending = 2;
    function oneDone() { pending--; if (pending === 0) finished(); }

    api.request({
      url: "/api/portal/schedule?from=" + from + "&to=" + to,
      success: function(res) {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.sessions)) {
          that.setData({ sessions: res.data.sessions, loading: false, error: "" }, that.applyFilter);
        } else if (res.statusCode === 401) {
          that.setData({ loading: false, error: "登录已过期，请重新登录" });
        } else {
          that.setData({ loading: false, error: "课表加载失败，请下拉重试" });
        }
        oneDone();
      },
      fail: function() {
        that.setData({ loading: false, error: "网络没有连上，请下拉重试" });
        oneDone();
      }
    });

    api.request({
      url: "/api/portal/bookings?scope=upcoming",
      success: function(res) {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.bookings)) {
          that.setData({
            myBookings: res.data.bookings.map(function(b) {
              return {
                id: b.id,
                courseName: b.course_name,
                date: b.session_date,
                time: b.start_time + "-" + b.end_time,
                coachName: b.coach_name,
                roomName: b.room_name || ""
              };
            })
          });
        }
        oneDone();
      },
      fail: oneDone
    });
  },

  reserve: function(e) {
    var that = this;
    if (that.data.submitting) return;
    var id = Number(e.currentTarget.dataset.id);
    var session = that.data.sessions.filter(function(s) { return s.id === id; })[0];
    if (!session) return;
    if (session.bookedByMe) { wx.showToast({ title: "已经约过了", icon: "none" }); return; }
    if (session.remaining <= 0) { wx.showToast({ title: "名额已满", icon: "none" }); return; }
    that.setData({ submitting: true });
    api.request({
      url: "/api/portal/bookings",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: {
        sessionId: id,
        idempotencyKey: "m" + (wx.getStorageSync("memberId") || "") + "-" + id + "-" + Date.now()
      },
      success: function(res) {
        that.setData({ submitting: false });
        if (res.statusCode === 201 || res.statusCode === 200) {
          wx.showToast({ title: "预约成功", icon: "success" });
          that.loadAll();
        } else {
          wx.showToast({ title: (res.data && res.data.error) || "预约失败", icon: "none", duration: 2500 });
        }
      },
      fail: function() {
        that.setData({ submitting: false });
        wx.showToast({ title: "网络异常，请重试", icon: "none" });
      }
    });
  },

  cancel: function(e) {
    var that = this;
    var bookingId = Number(e.currentTarget.dataset.id);
    wx.showModal({
      title: "取消预约",
      content: "确定取消这节课吗？开课前 2 小时内请联系前台。",
      confirmText: "取消预约",
      confirmColor: "#9E2A2B",
      success: function(r) {
        if (!r.confirm) return;
        api.request({
          url: "/api/portal/bookings/cancel",
          method: "POST",
          header: { "Content-Type": "application/json" },
          data: { bookingId: bookingId, reason: "会员取消" },
          success: function(res) {
            if (res.statusCode === 200) {
              wx.showToast({ title: "已取消", icon: "success" });
              that.loadAll();
            } else {
              wx.showToast({ title: (res.data && res.data.error) || "取消失败", icon: "none", duration: 2500 });
            }
          },
          fail: function() { wx.showToast({ title: "网络异常", icon: "none" }); }
        });
      }
    });
  }
});
