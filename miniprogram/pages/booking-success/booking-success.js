// pages/booking-success/booking-success.js
var api = require("../../utils/api.js");
var rules = require("../../utils/booking-rules.js");
var subscribe = require("../../utils/subscribe.js");

var WARM_NOTES = [
  "到时候见。提前十分钟到，换好衣服，先喝口水。",
  "这一节是留给你自己的一小时。",
  "记得带上水杯和一双干净的袜子。"
];

Page({
  data: {
    loading: true,
    loadError: "",
    bookingId: null,
    sessionId: null,
    sessionInfo: null,
    cardInfoText: "",
    warmNote: "",
    reminderOn: false
  },

  onLoad: function(options) {
    var bId = options && options.bookingId ? Number(options.bookingId) : null;
    var sId = options && options.sessionId ? Number(options.sessionId) : null;
    var randomNote = WARM_NOTES[Math.floor(Math.random() * WARM_NOTES.length)];

    this.setData({
      bookingId: bId,
      sessionId: sId,
      warmNote: randomNote
    });

    this.loadData();
  },

  handleRetry: function() {
    this.setData({ loading: true, loadError: "" });
    this.loadData();
  },

  loadData: function() {
    var that = this;
    var targetBookingId = that.data.bookingId;
    var targetSessionId = that.data.sessionId;

    var matchedBooking = null;
    var upcomingCount = 1;
    var cards = [];
    var pending = 2;
    var hasError = false;

    function finish() {
      pending--;
      if (pending > 0) return;

      // 组装课次数据，若接口未找到则用 storage lastBookedSession 兜底
      var fallback = wx.getStorageSync("lastBookedSession") || null;
      var info = null;

      if (matchedBooking) {
        var duration = rules.durationMinutes(matchedBooking.start_time, matchedBooking.end_time);
        info = {
          courseName: matchedBooking.course_name || "",
          sessionDate: matchedBooking.session_date || "",
          dateCN: rules.formatDateCN(matchedBooking.session_date),
          startTime: matchedBooking.start_time || "",
          endTime: matchedBooking.end_time || "",
          durationMinutes: duration,
          coachName: matchedBooking.coach_name || "",
          roomName: matchedBooking.room_name || "",
          cancelDeadlineText: rules.cancelDeadlineText(matchedBooking.session_date, matchedBooking.start_time)
        };
      } else if (fallback) {
        var fbDuration = rules.durationMinutes(fallback.startTime, fallback.endTime);
        info = {
          courseName: fallback.courseName || "",
          sessionDate: fallback.sessionDate || "",
          dateCN: rules.formatDateCN(fallback.sessionDate),
          startTime: fallback.startTime || "",
          endTime: fallback.endTime || "",
          durationMinutes: fbDuration,
          coachName: fallback.coachName || "",
          roomName: fallback.roomName || "",
          cancelDeadlineText: rules.cancelDeadlineText(fallback.sessionDate, fallback.startTime)
        };
      }

      if (!info) {
        that.setData({
          loading: false,
          loadError: "信息没取到，但预约已经成功"
        });
        return;
      }

      // 计算卡次文案：次卡「卡内剩余 X 次，含这节在内已约 N 节，下课后扣 1 次」；期限卡「期限卡有效期至 M月D日」
      var cardSummary = rules.summarizeCards(cards, upcomingCount);
      var cardInfoText = "";
      if (cardSummary && cardSummary.primary) {
        var p = cardSummary.primary;
        if (p.category === "period") {
          var validText = p.validUntil ? rules.formatShortDateCN(p.validUntil) : "";
          cardInfoText = (p.name || "期限卡") + (validText ? " · 有效期至 " + validText : " · 生效中");
        } else {
          var rem = Number(p.remainingCount) || 0;
          cardInfoText = "卡内剩余 " + rem + " 次，含这节在内已约 " + upcomingCount + " 节，下课后扣 1 次";
        }
      }

      that.setData({
        loading: false,
        loadError: "",
        sessionInfo: info,
        cardInfoText: cardInfoText
      });
    }

    // 1. 获取 upcoming 预约列表匹配课次
    api.request({
      url: "/api/portal/bookings?scope=upcoming",
      success: function(res) {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.bookings)) {
          var list = res.data.bookings;
          upcomingCount = list.length || 1;
          for (var i = 0; i < list.length; i++) {
            var b = list[i];
            if ((targetBookingId && b.id === targetBookingId) || (targetSessionId && b.session_id === targetSessionId)) {
              matchedBooking = b;
              break;
            }
          }
        }
        finish();
      },
      fail: function() {
        hasError = true;
        finish();
      }
    });

    // 2. 重新拉取卡包（触发后端扣次并拿到最新余次）
    api.request({
      url: "/api/portal/cards",
      success: function(res) {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.cards)) {
          cards = res.data.cards;
        }
        finish();
      },
      fail: function() {
        hasError = true;
        finish();
      }
    });
  },

  /**
   * 开启上课提醒。
   * 必须在用户点击手势里调 wx.requestSubscribeMessage，所以只能挂在按钮 bindtap 上。
   * 模板 ID 还没配置时，不假装成功，直接引导到手机日历。
   */
  tapReminder: function () {
    var that = this;

    subscribe.request(["classReminder"], function (result) {
      if (result && result.skipped) {
        wx.showModal({
          title: "提醒服务正在开通",
          content: "微信模板消息还在配置中。先用手机日历提醒你？到点手机会响。",
          confirmText: "加入日历",
          cancelText: "不用了",
          success: function (res) {
            if (res.confirm) that.addToCalendar();
          }
        });
        return;
      }

      if (!result || !result.ok) {
        wx.showToast({ title: "没开成功，可以加入手机日历", icon: "none", duration: 2500 });
        return;
      }

      if (result.accepted && result.accepted.length > 0) {
        that.setData({ reminderOn: true });
        wx.showToast({ title: "已开启，开课前提醒你", icon: "success", duration: 2200 });
      } else {
        wx.showToast({ title: "你拒绝了提醒，可随时再来点一次", icon: "none", duration: 2500 });
      }
    });
  },

  addToCalendar: function() {
    var info = this.data.sessionInfo;
    if (!info) return;

    var startTs = rules.sessionStartTs(info.sessionDate, info.startTime);
    var endTs = rules.sessionEndTs(info.sessionDate, info.endTime);
    if (!endTs || endTs <= startTs) {
      endTs = startTs + 3600 * 1000;
    }

    if (wx.addPhoneCalendar) {
      wx.addPhoneCalendar({
        title: "徕舞 · " + (info.courseName || "塑形课程"),
        startTime: Math.floor(startTs / 1000),
        endTime: Math.floor(endTs / 1000),
        location: info.roomName || "徕舞",
        alarm: true,
        alarmOffset: 3600,
        success: function() {
          wx.showToast({ title: "已加入手机日历", icon: "success" });
        },
        fail: function(err) {
          var errMsg = err && err.errMsg ? err.errMsg : "";
          if (errMsg.indexOf("cancel") !== -1) return;
          wx.showToast({ title: "当前微信版本不支持，可截图保存", icon: "none", duration: 2500 });
        }
      });
    } else {
      wx.showToast({ title: "当前微信版本不支持，可截图保存", icon: "none", duration: 2500 });
    }
  },

  goToMyBookings: function() {
    wx.redirectTo({ url: "/pages/my-bookings/my-bookings" });
  },

  goToBooking: function() {
    wx.switchTab({ url: "/pages/booking/booking" });
  }
});
