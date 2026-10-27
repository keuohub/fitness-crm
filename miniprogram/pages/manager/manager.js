// pages/manager/manager.js
// 徕舞普拉提 · 手机端管家工作台 (仅具备管理权限人员可见)
var api = require("../../utils/api.js");

Page({
  data: {
    loading: true,
    loadError: "",
    managerName: "",
    managerRole: "",
    todayBookingsCount: 0,
    todayNewCardsCount: 0,
    todayNewMembersCount: 0,
    totalMembersCount: 0,
    portalEnabledCount: 0,
    recentActivities: [],
    topActivityText: "今日约课系统运行正常，等待新动态",
    topActivityStatus: "booked",
    topActivityTime: "实时",
    todaySessions: [],
    todayDateStr: "",
    
    // 当前激活的九宫格抽屉/弹层
    activeModal: null, // 'pc' | 'invite' | 'checkin' | 'bookings' | 'courses' | 'stats'
  },

  onLoad: function() {
    this.initDate();
    this.loadDashboard();
  },

  onPullDownRefresh: function() {
    var that = this;
    this.loadDashboard(function() {
      wx.stopPullDownRefresh();
    });
  },

  initDate: function() {
    var now = new Date();
    var days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    var str = now.getFullYear() + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日 · " + days[now.getDay()];
    this.setData({ todayDateStr: str });
  },

  loadDashboard: function(done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};

    api.request({
      url: "/api/portal/manager/dashboard",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var d = res.data;
          var top = d.recentActivities && d.recentActivities.length > 0 ? d.recentActivities[0] : null;
          var topText = "今日约课系统运行正常，等待新动态";
          var topStatus = "booked";
          var topTime = "实时";

          if (top) {
            var action = top.status === "cancelled" ? "取消预约" : "预约课程";
            topText = top.member_name + " " + action + " " + top.course_name;
            topStatus = top.status;
            topTime = that.formatRelativeTime(top.updated_at || top.created_at);
          }

          that.setData({
            loading: false,
            loadError: "",
            managerName: d.managerName || "馆长",
            managerRole: d.managerRole || "owner",
            todayBookingsCount: d.todayBookingsCount || 0,
            todayNewCardsCount: d.todayNewCardsCount || 0,
            todayNewMembersCount: d.todayNewMembersCount || 0,
            totalMembersCount: d.totalMembersCount || 0,
            portalEnabledCount: d.portalEnabledCount || 0,
            recentActivities: d.recentActivities || [],
            topActivityText: topText,
            topActivityStatus: topStatus,
            topActivityTime: topTime,
            todaySessions: d.todaySessions || []
          });
        } else if (res.statusCode === 403) {
          that.setData({ loading: false });
          wx.showModal({
            title: "权限不足",
            content: "当前登录账号未开通管家端管理权限，仅供会馆导师与馆长使用。",
            showCancel: false,
            confirmText: "返回",
            success: function() {
              wx.switchTab({ url: "/pages/me/me" });
            }
          });
        } else {
          that.setData({ loading: false, loadError: "加载失败，请下拉刷新" });
        }
      },
      fail: function() {
        that.setData({ loading: false, loadError: "网络连接失败，请重试" });
      },
      complete: cb
    });
  },

  formatRelativeTime: function(isoStr) {
    if (!isoStr) return "刚刚";
    var now = Date.now();
    var t = new Date(isoStr).getTime();
    var diff = Math.floor((now - t) / 1000);
    if (diff < 60) return "刚刚";
    if (diff < 3600) return Math.floor(diff / 60) + "分钟前";
    if (diff < 86400) return Math.floor(diff / 3600) + "小时前";
    return Math.floor(diff / 86400) + "天前";
  },

  // 快捷工具弹窗
  openPcLoginModal: function() {
    this.setData({ activeModal: "pc" });
  },

  openInviteModal: function() {
    this.setData({ activeModal: "invite" });
  },

  openCheckinModal: function() {
    this.setData({ activeModal: "checkin" });
  },

  closeModal: function() {
    this.setData({ activeModal: null });
  },

  copyPcUrl: function() {
    var url = "https://crm.laiwupilates.com/admin";
    wx.setClipboardData({
      data: url,
      success: function() {
        wx.showToast({ title: "已复制电脑网址", icon: "success" });
      }
    });
  },

  copyInviteText: function() {
    var text = "微信搜索小程序【徕舞普拉提】即可在线约课与选座";
    wx.setClipboardData({
      data: text,
      success: function() {
        wx.showToast({ title: "已复制引导文案", icon: "success" });
      }
    });
  },

  // 九宫格点击交互
  tapBookings: function() {
    this.setData({ activeModal: "bookings" });
  },

  tapSchedule: function() {
    wx.switchTab({ url: "/pages/booking/booking" });
  },

  tapCourses: function() {
    this.setData({ activeModal: "courses" });
  },

  tapCoach: function() {
    wx.navigateTo({ url: "/pages/notes/notes" });
  },

  tapMembers: function() {
    var count = this.data.totalMembersCount;
    var portal = this.data.portalEnabledCount;
    wx.showModal({
      title: "会员CRM档案",
      content: "当前在籍活跃会员 " + count + " 位，其中 " + portal + " 人已开通微信小程序免密约课。\n\n如需录入新会员或批量导入，可使用手机电脑端后台操作。",
      showCancel: false,
      confirmText: "我知道了"
    });
  },

  tapTeam: function() {
    wx.switchTab({ url: "/pages/brand/brand" });
  },

  tapCards: function() {
    wx.navigateTo({ url: "/pages/cards/cards" });
  },

  tapVenue: function() {
    wx.showModal({
      title: "教室与场地",
      content: "徕舞普拉提配备：\n• 大器械核心塑形教室（6席）\n• 垫上与小器械教室（8席）\n• 1V1专属VIP私教套房（2席）\n\n系统排课自动依据教室容量防超约。",
      showCancel: false,
      confirmText: "我知道了"
    });
  },

  tapReports: function() {
    var bookings = this.data.todayBookingsCount;
    var cards = this.data.todayNewCardsCount;
    var members = this.data.todayNewMembersCount;
    wx.showModal({
      title: "经营数据概览",
      content: "今日预约：" + bookings + " 节\n今日发卡：" + cards + " 张\n今日入会：" + members + " 人\n\n课后系统自动对出勤会员结课扣次，保障账目清晰。",
      showCancel: false,
      confirmText: "我知道了"
    });
  },

  // 切回会员端
  goBackMember: function() {
    wx.switchTab({ url: "/pages/me/me" });
  }
});
