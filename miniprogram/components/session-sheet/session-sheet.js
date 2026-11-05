// components/session-sheet/session-sheet.js
var rules = require("../../utils/booking-rules.js");
var api = require("../../utils/api.js");
var cc = require("../../utils/course-categories.js");

function pad2(n) {
  return ("0" + n).slice(-2);
}

Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
      observer: function(val) {
        if (val) this.onOpen();
      }
    },
    session: {
      type: Object,
      value: null,
      observer: function(val) {
        if (val) this.parseSession(val);
      }
    },
    loggedIn: {
      type: Boolean,
      value: false
    },
    cardSummary: {
      type: Object,
      value: null
    },
    submitting: {
      type: Boolean,
      value: false
    },
    errorMessage: {
      type: String,
      value: ""
    },
    // BRIEF_05：按名字匹配到的 team_members 行（可为 null）
    coach: {
      type: Object,
      value: null,
      observer: function(val) {
        this.parseCoach(val);
      }
    },
    // BRIEF_05：该分类 offering 介绍 { summary, target, highlight }
    intro: {
      type: Object,
      value: null
    }
  },

  data: {
    dateText: "",
    duration: 0,
    canCancel: false,
    isEnded: false,
    starsList: [true, true, true, false, false],
    noticeExpanded: false,
    noticeItems: rules.NOTICE_ITEMS,
    imgFailed: false,
    bars: [true, true, false],
    coachAvatar: "",
    coachAvatarFailed: false,
    coachInitial: "",
    bioExpanded: false
  },

  methods: {
    noop: function() {},

    parseCoach: function(c) {
      this.setData({
        coachAvatar: c && c.avatarUrl ? api.fullUrl(c.avatarUrl) : "",
        coachAvatarFailed: false,
        coachInitial: c && c.name ? String(c.name).slice(0, 1) : "",
        bioExpanded: false
      });
    },

    onCoachAvatarError: function() {
      this.setData({ coachAvatarFailed: true });
    },

    toggleBio: function() {
      this.setData({ bioExpanded: !this.data.bioExpanded });
    },

    onImgError: function() {
      this.setData({ imgFailed: true });
    },

    onOpen: function() {
      var seen = Boolean(wx.getStorageSync("bookingNoticeSeen"));
      this.setData({ noticeExpanded: !seen });
      if (this.data.session) {
        this.parseSession(this.data.session);
      }
    },

    parseSession: function(s) {
      if (!s) return;
      var dateText = rules.formatDateCN(s.sessionDate);
      var duration = rules.durationMinutes(s.startTime, s.endTime);
      var canCancel = rules.canCancel(s.sessionDate, s.startTime);

      var now = new Date();
      var nowDate = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
      var nowTime = pad2(now.getHours()) + ":" + pad2(now.getMinutes());
      var isEnded = (s.sessionDate < nowDate) || (s.sessionDate === nowDate && s.endTime <= nowTime);

      var diff = Number(s.difficultyStars) || 3;
      if (diff < 1) diff = 1;
      if (diff > 5) diff = 5;
      var starsList = [];
      for (var i = 0; i < 5; i++) {
        starsList.push(i < diff);
      }

      this.setData({
        dateText: dateText,
        duration: duration,
        canCancel: canCancel,
        isEnded: isEnded,
        starsList: starsList,
        bars: cc.difficultyBars(s.difficultyStars),
        dateLine: (s.sessionDate || "").slice(5).replace("-", "/") + " " + rules.weekdayLabel(s.sessionDate) + " " + s.startTime + "-" + s.endTime,
        imgFailed: false
      });
    },

    toggleNotice: function() {
      var next = !this.data.noticeExpanded;
      this.setData({ noticeExpanded: next });
      if (next) {
        try { wx.setStorageSync("bookingNoticeSeen", "1"); } catch (e) {}
      }
    },

    markNoticeSeen: function() {
      this.setData({ noticeExpanded: false });
      try { wx.setStorageSync("bookingNoticeSeen", "1"); } catch (e) {}
    },

    onClose: function() {
      this.triggerEvent("close");
    },

    onReserve: function() {
      if (this.data.submitting || !this.data.session) return;
      this.triggerEvent("reserve", { session: this.data.session });
    },

    onCancelBooking: function() {
      if (!this.data.session) return;
      this.triggerEvent("cancel", { session: this.data.session });
    },

    onLoginTap: function() {
      this.triggerEvent("login", { session: this.data.session });
    }
  }
});
