// pages/my-bookings/my-bookings.js
var api = require("../../utils/api.js");
var rules = require("../../utils/booking-rules.js");

function formatCancelledAt(str) {
  if (!str) return "已取消";
  // cancelled_at 为带时区的时间戳（如 2026-11-03T05:00:00.000Z），用 ISO 解析转本地；iOS 支持标准 ISO
  var d = new Date(String(str));
  if (!isNaN(d.getTime())) return (d.getMonth() + 1) + "月" + d.getDate() + "日 取消";
  var m = String(str).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return parseInt(m[2], 10) + "月" + parseInt(m[3], 10) + "日 取消";
  return "已取消";
}

function parseDateBlock(dateStr) {
  if (!dateStr) return { day: "--", weekday: "" };
  var d = new Date(String(dateStr).replace(/-/g, "/") + " 00:00:00");
  if (isNaN(d.getTime())) return { day: "--", weekday: "" };
  var day = ("0" + d.getDate()).slice(-2);
  var weekday = rules.weekdayLabel(dateStr);
  return { day: day, weekday: weekday };
}

Page({
  data: {
    loading: true,
    loadError: "",
    currentTab: "upcoming", // upcoming | attended | cancelled
    cardHeaderText: "",
    upcomingList: [],
    attendedList: [],
    cancelledList: [],
    cancellingId: null
  },

  onLoad: function() {
    if (!wx.getStorageSync("memberToken")) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    this.loadAll();
  },

  onShow: function() {
    if (!this.data.loading && wx.getStorageSync("memberToken")) {
      this.loadAll();
    }
  },

  onPullDownRefresh: function() {
    var that = this;
    this.loadAll(function() {
      wx.stopPullDownRefresh();
    });
  },

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab;
    if (tab && tab !== this.data.currentTab) {
      this.setData({ currentTab: tab });
    }
  },

  loadAll: function(done) {
    var that = this;
    var finished = typeof done === "function" ? done : function() {};
    var pending = 2;
    var hasError = false;

    var allBookings = [];
    var cards = [];

    function checkDone() {
      pending--;
      if (pending > 0) return;

      if (hasError && allBookings.length === 0) {
        that.setData({
          loading: false,
          loadError: "加载失败，请下拉或点击重试"
        });
        finished();
        return;
      }

      that.processData(allBookings, cards);
      that.setData({ loading: false, loadError: "" });
      finished();
    }

    // 1. 获取全部预约
    api.request({
      url: "/api/portal/bookings?scope=all",
      success: function(res) {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.bookings)) {
          allBookings = res.data.bookings;
        } else {
          hasError = true;
        }
        checkDone();
      },
      fail: function() {
        hasError = true;
        checkDone();
      }
    });

    // 2. 获取卡包信息以展示顶部卡次
    api.request({
      url: "/api/portal/cards",
      success: function(res) {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.cards)) {
          cards = res.data.cards;
        }
        checkDone();
      },
      fail: function() {
        checkDone();
      }
    });
  },

  processData: function(bookings, cards) {
    var nowTs = Date.now();
    var upcoming = [];
    var attended = [];
    var cancelled = [];

    for (var i = 0; i < bookings.length; i++) {
      var b = bookings[i];
      if (!b) continue;

      var startTs = rules.sessionStartTs(b.session_date, b.start_time);
      var endTs = rules.sessionEndTs(b.session_date, b.end_time);
      var dateBlock = parseDateBlock(b.session_date);
      var canCancel = rules.canCancel(b.session_date, b.start_time);

      var item = {
        id: b.id,
        session_id: b.session_id,
        course_name: b.course_name || "普拉提课程",
        coach_name: b.coach_name || "",
        room_name: b.room_name || "",
        session_date: b.session_date,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status,
        day: dateBlock.day,
        weekday: dateBlock.weekday,
        startTs: startTs,
        endTs: endTs,
        canCancel: canCancel,
        cancelledAtText: formatCancelledAt(b.cancelled_at)
      };

      if (b.status === "cancelled") {
        cancelled.push(item);
      } else if (b.status === "attended") {
        item.statusTag = "attended";
        item.statusTagText = "已完成";
        attended.push(item);
      } else if (b.status === "unsettled") {
        item.statusTag = "unsettled";
        item.statusTagText = "待前台结算";
        attended.push(item);
      } else if (b.status === "booked") {
        // 若 status 为 booked 但当前时间已超过结束时间，归为已完成（待结课）
        if (endTs > 0 && endTs <= nowTs) {
          item.statusTag = "pending_settle";
          item.statusTagText = "待结课";
          attended.push(item);
        } else {
          upcoming.push(item);
        }
      }
    }

    // 待上课按开课时间升序排序
    upcoming.sort(function(a, b) { return a.startTs - b.startTs; });

    // 已完成按结课时间倒序排序
    attended.sort(function(a, b) { return b.endTs - a.endTs; });

    // 已取消按日期倒序排序
    cancelled.sort(function(a, b) { return b.startTs - a.startTs; });

    // 顶部卡次信息
    var cardSummary = rules.summarizeCards(cards, upcoming.length);
    var cardHeaderText = "";
    if (cardSummary && cardSummary.primary) {
      if (cardSummary.primary.category === "period") {
        var vStr = cardSummary.primary.validUntil ? rules.formatShortDateCN(cardSummary.primary.validUntil) : "";
        cardHeaderText = (cardSummary.primary.name || "期限卡") + (vStr ? " · 有效期至 " + vStr : "");
      } else {
        var rem = Number(cardSummary.primary.remainingCount) || 0;
        cardHeaderText = "卡内剩余 " + rem + " 次";
      }
    }

    this.setData({
      cardHeaderText: cardHeaderText,
      upcomingList: upcoming,
      attendedList: attended,
      cancelledList: cancelled
    });
  },

  handleCancel: function(e) {
    var that = this;
    var item = e.currentTarget.dataset.item;
    if (!item) return;

    var content = rules.formatDateCN(item.session_date) + " " + item.start_time + " " + item.course_name + "\n开课前取消不扣次，名额会释放给其他同学。";

    wx.showModal({
      title: "取消这节课？",
      content: content,
      confirmText: "确认取消",
      confirmColor: "#000000",
      cancelText: "保留预约",
      success: function(res) {
        if (!res.confirm) return;

        that.setData({ cancellingId: item.id });
        api.request({
          url: "/api/portal/bookings/cancel",
          method: "POST",
          header: { "Content-Type": "application/json" },
          data: { bookingId: item.id, reason: "会员主动取消" },
          success: function(resCancel) {
            that.setData({ cancellingId: null });
            if (resCancel.statusCode === 200) {
              wx.showToast({ title: "已取消，未扣次", icon: "none" });
              that.loadAll();
            } else {
              var err = (resCancel.data && resCancel.data.error) || "取消失败";
              wx.showToast({ title: err, icon: "none", duration: 2500 });
            }
          },
          fail: function() {
            that.setData({ cancellingId: null });
            wx.showToast({ title: "网络异常，请重试", icon: "none" });
          }
        });
      }
    });
  },

  goToBooking: function() {
    wx.switchTab({ url: "/pages/booking/booking" });
  }
});
