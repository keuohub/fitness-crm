// pages/booking/booking.js
// 徕舞女子塑形 · 会员约课系统
// 保持轻奢高雅UI，无紫色，三大分类导航，直观图文卡片，下课自动结课
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
    categories: [
      { key: "boutique", label: "精品课" },
      { key: "group", label: "团体课" },
      { key: "private", label: "私教课" },
      { key: "all", label: "全部" }
    ],
    selectedCategory: "boutique",
    sessions: [],
    shownSessions: [],
    myBookings: [],
    submitting: false,
    hasCard: null
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
      dates.push({
        value: ds,
        weekday: i === 0 ? "今天" : "周" + names[d.getDay()],
        day: ds.slice(5).replace("-", ".")
      });
    }
    this.setData({ dates: dates, selectedDate: today, weekStart: today });
    this.loadAll();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, hidden: false });
    }
    if (!this.data.loading) this.loadAll();
  },

  onPullDownRefresh: function() {
    var that = this;
    this.loadAll(function() { wx.stopPullDownRefresh(); });
  },

  selectCategory: function(e) {
    var cat = e.currentTarget.dataset.key;
    if (cat === this.data.selectedCategory) return;
    this.setData({ selectedCategory: cat }, this.applyFilter);
  },

  selectDate: function(e) {
    var date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date }, this.applyFilter);
  },

  applyFilter: function() {
    var date = this.data.selectedDate;
    var cat = this.data.selectedCategory;
    var now = new Date();
    var nowDate = fmt(now);
    var nowTime = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);

    var allForDate = (this.data.sessions || []).filter(function(s) {
      return s.sessionDate === date;
    });

    var list = allForDate.filter(function(s) {
      if (cat === "all") return true;
      var cType = s.categoryType || "boutique";
      return cType === cat;
    });

    // 如果选中的分类当天暂无课，但其他分类有课，智能展示全部或提示
    var processed = list.map(function(s) {
      var isEnded = s.sessionDate < nowDate || (s.sessionDate === nowDate && s.endTime <= nowTime);
      var stars = Number(s.difficultyStars || 3);
      if (stars < 1) stars = 1;
      if (stars > 5) stars = 5;
      var starsList = [];
      for (var j = 0; j < 5; j++) {
        starsList.push(j < stars);
      }

      // 默认封面图解析：后台配置优先 -> 本地预设课种图 -> 兜底通用普拉提图
      var cover = s.coverImage || "";
      if (!cover) {
        var key = s.courseKey || "pilates";
        if (key === "equipment") cover = "/images/courses/equipment.jpg";
        else if (key === "fat_burn") cover = "/images/courses/fat_burn.jpg";
        else if (key === "private") cover = "/images/courses/private.jpg";
        else if (key === "yoga") cover = "/images/courses/yoga.jpg";
        else cover = "/images/courses/pilates.jpg";
      }

      return Object.assign({}, s, {
        isEnded: isEnded,
        starsList: starsList,
        cover: cover
      });
    });

    this.setData({ shownSessions: processed });
  },

  loadAll: function(done) {
    var that = this;
    var finished = typeof done === "function" ? done : function() {};
    var from = that.data.weekStart;
    var to = addDays(from, 6);
    var pending = 3;
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

    // 检查会员是否有可用卡
    api.request({
      url: "/api/portal/cards",
      success: function(res) {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.cards)) {
          var usable = res.data.cards.some(function(c) {
            if (!c || c.status !== "active") return false;
            if (c.category === "count") return Number(c.remainingCount || 0) > 0;
            return true;
          });
          that.setData({ hasCard: usable });
        }
        oneDone();
      },
      fail: oneDone
    });

    // 待上课预约
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
                time: b.start_time + "–" + b.end_time,
                coachName: b.coach_name || "专属导师",
                roomName: b.room_name || "",
                waitlisted: b.status === "waitlisted"
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
    if (that.data.hasCard === false) {
      wx.showToast({ title: "还没有会员卡，请联系前台开卡后再约", icon: "none", duration: 2800 });
      return;
    }
    if (session.bookedByMe || session.waitlistedByMe) { wx.showToast({ title: "已经约过了", icon: "none" }); return; }
    var waitlist = String(e.currentTarget.dataset.waitlist || "") === "1";
    if (session.remaining <= 0 && !waitlist) { wx.showToast({ title: "名额已满，可以点候补", icon: "none" }); return; }

    wx.showModal({
      title: waitlist ? "加入候补" : "预约确认",
      content: waitlist
        ? "这节课已经满员。加入候补后，有人取消会按顺序自动补上，不占用你的课时，补上后才会算预约。"
        : "确认预约 " + session.sessionDate + " " + session.startTime + " " + session.courseName + " 吗？\n（开课后将自动扣除课时，如不来请在开课前取消）",
      confirmText: waitlist ? "加入候补" : "确认预约",
      confirmColor: "#0D0C0F",
      success: function(resConfirm) {
        if (!resConfirm.confirm) return;
        that.setData({ submitting: true });
        api.request({
          url: "/api/portal/bookings",
          method: "POST",
          header: { "Content-Type": "application/json" },
          data: {
            sessionId: id,
            waitlist: waitlist,
            idempotencyKey: "m" + (wx.getStorageSync("memberId") || "") + "-" + id + "-" + Date.now()
          },
          success: function(res) {
            that.setData({ submitting: false });
            if (res.statusCode === 201 || res.statusCode === 200) {
              var queued = res.data && res.data.waitlisted;
              wx.showToast({ title: queued ? "已加入候补" : "预约成功", icon: "success" });
              that.loadAll();
            } else {
              var msg = (res.data && res.data.error) || "预约失败";
              wx.showModal({
                title: "预约提示",
                content: msg,
                showCancel: false,
                confirmText: "我知道了",
                confirmColor: "#8A1F17"
              });
            }
          },
          fail: function() {
            that.setData({ submitting: false });
            wx.showToast({ title: "网络异常，请重试", icon: "none" });
          }
        });
      }
    });
  },

  cancel: function(e) {
    var that = this;
    var bookingId = Number(e.currentTarget.dataset.id);
    wx.showModal({
      title: "取消预约",
      content: "确定取消这节课吗？名额将即刻释放给其他学员。（开课前 2 小时内请联系前台）",
      confirmText: "取消预约",
      confirmColor: "#8A1F17",
      success: function(r) {
        if (!r.confirm) return;
        api.request({
          url: "/api/portal/bookings/cancel",
          method: "POST",
          header: { "Content-Type": "application/json" },
          data: { bookingId: bookingId, reason: "会员主动取消" },
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
  },

  onShareAppMessage: function() {
    return { title: "徕舞女子塑形 · 本周精品课表", path: "/pages/booking/booking" };
  },
  onShareTimeline: function() {
    return { title: "到徕舞 一起好状态 · 精品普拉提排课" };
  }
});
