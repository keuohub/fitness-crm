// components/next-class/next-class.js
var api = require("../../utils/api.js");
var rules = require("../../utils/booking-rules.js");

function pad2(n) {
  return ("0" + n).slice(-2);
}

function formatDateStr(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

Component({
  properties: {
    compact: {
      type: Boolean,
      value: false
    }
  },

  data: {
    isLoggedIn: false,
    loading: true,
    hasNext: false,
    nextBooking: null,
    nextDateText: "",
    nextCourseName: "",
    nextCoachName: "",
    cardShortText: "",
    weekDots: []
  },

  attached: function() {
    this.refresh();
  },

  methods: {
    refresh: function() {
      var token = wx.getStorageSync("memberToken");
      if (!token) {
        this.setData({ isLoggedIn: false, loading: false, hasNext: false });
        return;
      }
      this.setData({ isLoggedIn: true });
      this.fetchData();
    },

    fetchData: function() {
      var that = this;
      var pending = 2;
      var allBookings = [];
      var cards = [];

      function doneOne() {
        pending--;
        if (pending === 0) {
          that.computeState(allBookings, cards);
        }
      }

      api.request({
        url: "/api/portal/bookings?scope=all",
        success: function(res) {
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.bookings)) {
            allBookings = res.data.bookings;
          }
          doneOne();
        },
        fail: doneOne
      });

      api.request({
        url: "/api/portal/cards",
        success: function(res) {
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.cards)) {
            cards = res.data.cards;
          }
          doneOne();
        },
        fail: doneOne
      });
    },

    computeState: function(bookings, cards) {
      var now = new Date();
      var nowTs = now.getTime();
      var todayStr = formatDateStr(now);

      // 1. 过滤待上课程（status === 'booked' 且未开课）
      var upcoming = bookings.filter(function(b) {
        if (!b || b.status !== "booked") return false;
        var startTs = rules.sessionStartTs(b.session_date, b.start_time);
        return startTs > nowTs;
      });

      // 按时间升序排序
      upcoming.sort(function(a, b) {
        var tA = rules.sessionStartTs(a.session_date, a.start_time);
        var tB = rules.sessionStartTs(b.session_date, b.start_time);
        return tA - tB;
      });

      var next = upcoming[0] || null;
      var nextDateText = "";
      var nextCourseName = "";
      var nextCoachName = "";

      if (next) {
        var w = rules.weekdayLabel(next.session_date);
        nextDateText = (w ? w + " " : "") + (next.start_time || "");
        nextCourseName = next.course_name || "";
        nextCoachName = next.coach_name || "";
      }

      // 2. 卡信息提炼
      var cardSummary = rules.summarizeCards(cards, upcoming.length);
      var cardShortText = "";
      if (cardSummary && cardSummary.primary) {
        if (cardSummary.primary.category === "period") {
          var validText = cardSummary.primary.validUntil ? rules.formatShortDateCN(cardSummary.primary.validUntil) : "";
          cardShortText = validText ? "有效期至 " + validText : "期限卡生效中";
        } else {
          var rem = Number(cardSummary.primary.remainingCount) || 0;
          cardShortText = "卡内剩余 " + rem + " 次";
        }
      }

      // 3. 计算本周 7 个小圆点（周一至周日）
      var dayOfWeek = now.getDay(); // 0 是周日
      var daysSinceMonday = (dayOfWeek + 6) % 7;
      var mondayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);

      var bookedOrAttendedDates = {};
      bookings.forEach(function(b) {
        if (!b) return;
        if (b.status === "booked" || b.status === "attended") {
          if (b.session_date) bookedOrAttendedDates[b.session_date] = true;
        }
      });

      var weekDots = [];
      var labels = ["一", "二", "三", "四", "五", "六", "日"];
      for (var i = 0; i < 7; i++) {
        var d = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i);
        var dStr = formatDateStr(d);
        weekDots.push({
          label: labels[i],
          dateStr: dStr,
          isToday: dStr === todayStr,
          hasActive: Boolean(bookedOrAttendedDates[dStr])
        });
      }

      this.setData({
        loading: false,
        hasNext: Boolean(next),
        nextBooking: next,
        nextDateText: nextDateText,
        nextCourseName: nextCourseName,
        nextCoachName: nextCoachName,
        cardShortText: cardShortText,
        weekDots: weekDots
      });
    },

    goToMyBookings: function() {
      wx.navigateTo({ url: "/pages/my-bookings/my-bookings" });
    },

    goToBookingTab: function() {
      wx.switchTab({ url: "/pages/booking/booking" });
    }
  }
});
