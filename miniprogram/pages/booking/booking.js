var api = require("../../utils/api.js");

Page({
  data: {
    selectedCourse: "",
    selectedDate: "",
    selectedTime: "",
    notes: "",
    submitting: false,
    dates: [],
    timeSlots: ["09:30-10:30", "10:30-11:30", "14:30-15:30", "15:30-16:30", "17:30-18:30", "18:30-19:30", "19:30-20:30"],
    baseUrl: ""
  },

  onLoad: function() {
    var memberId = wx.getStorageSync("memberId");
    if (!memberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    var baseUrl = wx.getStorageSync("baseUrl") || api.DEFAULT_BASE_URL;
    this.setData({ baseUrl: baseUrl });
    this.generateDates();
  },

  generateDates: function() {
    var dates = [];
    var weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    var today = new Date();
    for (var i = 0; i < 7; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() + i);
      var y = d.getFullYear();
      var m = ("0" + (d.getMonth() + 1)).slice(-2);
      var day = ("0" + d.getDate()).slice(-2);
      dates.push({
        value: y + "-" + m + "-" + day,
        weekday: i === 0 ? "今天" : "周" + weekdays[d.getDay()],
        day: day
      });
    }
    this.setData({ dates: dates });
  },

  selectCourse: function(e) {
    this.setData({ selectedCourse: e.currentTarget.dataset.course });
  },

  selectDate: function(e) {
    this.setData({ selectedDate: e.currentTarget.dataset.date });
  },

  selectTime: function(e) {
    this.setData({ selectedTime: e.currentTarget.dataset.time });
  },

  onNotesInput: function(e) {
    this.setData({ notes: e.detail.value });
  },

  submitBooking: function() {
    var that = this;
    if (!that.data.selectedCourse || !that.data.selectedDate || !that.data.selectedTime) {
      wx.showToast({ title: "请完善预约信息", icon: "none" });
      return;
    }

    that.setData({ submitting: true });
    var memberId = wx.getStorageSync("memberId");

    api.request({
      url: "/api/portal/course-booking",
      method: "POST",
      data: {
        memberId: Number(memberId),
        courseType: that.data.selectedCourse,
        bookingDate: that.data.selectedDate,
        bookingTime: that.data.selectedTime,
        notes: that.data.notes
      },
      success: function(res) {
        if (res.statusCode === 200 || res.statusCode === 201) {
          wx.showToast({ title: "预约成功，等待教练确认", icon: "success" });
          setTimeout(function() { wx.navigateBack(); }, 2000);
        } else {
          that.bookingFailed();
        }
      },
      fail: function() {
        that.bookingFailed();
      }
    });
  },

  // 提交失败：如实提示并恢复按钮，绝不谎报成功
  bookingFailed: function() {
    this.setData({ submitting: false });
    wx.showToast({
      title: "网络微忙，请重试或联系小桥",
      icon: "none",
      duration: 2500
    });
  },

  onShareAppMessage: function() {
    return {
      title: "预约私教课程 · 徕舞健身",
      path: "/pages/growth/growth"
    };
  }
});
