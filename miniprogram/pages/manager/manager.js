// pages/manager/manager.js
// 徕舞普拉提 · 手机端管家工作台 (实打实可进行现场后台操作：查预约、代取消、录会员、改课程、加排课)
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
    todayDateIso: "",

    // 弹窗状态: 'pc' | 'invite' | 'checkin' | 'bookings' | 'courses' | 'edit_course' | 'create_member' | 'create_session'
    activeModal: null,

    // 预约详情列表 (包含每场实际预约学员)
    bookingSessions: [],
    loadingBookings: false,

    // 新会员录入表单
    newMemberName: "",
    newMemberPhone: "",
    submittingMember: false,

    // 课程列表与当前编辑课程
    coursesList: [],
    loadingCourses: false,
    editingCourse: {
      id: 0,
      name: "",
      categoryType: "boutique",
      difficultyStars: 3,
      description: ""
    },
    submittingCourse: false,

    // 快速排课表单
    sessionOptions: {
      courses: [],
      coaches: [],
      rooms: []
    },
    newSessionCourseIndex: 0,
    newSessionCoachIndex: 0,
    newSessionRoomIndex: 0,
    newSessionDate: "",
    newSessionStartTime: "10:00",
    newSessionEndTime: "11:00",
    newSessionCapacity: 6,
    submittingSession: false
  },

  onLoad: function() {
    this.initDate();
    this.loadDashboard();
    this.loadSessionOptions();
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
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, "0");
    var d = String(now.getDate()).padStart(2, "0");
    var dateIso = y + "-" + m + "-" + d;
    var str = y + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日 · " + days[now.getDay()];
    this.setData({
      todayDateStr: str,
      todayDateIso: dateIso,
      newSessionDate: dateIso
    });
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

  loadSessionOptions: function() {
    var that = this;
    api.request({
      url: "/api/portal/manager/actions?action=options",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({
            sessionOptions: {
              courses: res.data.courses || [],
              coaches: res.data.coaches || [],
              rooms: res.data.rooms || []
            }
          });
        }
      }
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

  // 弹窗关闭
  closeModal: function() {
    this.setData({ activeModal: null });
  },

  // 快捷工具
  openPcLoginModal: function() { this.setData({ activeModal: "pc" }); },
  openInviteModal: function() { this.setData({ activeModal: "invite" }); },
  openCheckinModal: function() { this.setData({ activeModal: "checkin" }); },

  copyPcUrl: function() {
    wx.setClipboardData({
      data: "https://crm.laiwupilates.com/admin",
      success: function() { wx.showToast({ title: "已复制电脑网址", icon: "success" }); }
    });
  },

  copyInviteText: function() {
    wx.setClipboardData({
      data: "微信搜索小程序【徕舞普拉提】即可在线约课与选座",
      success: function() { wx.showToast({ title: "已复制引导文案", icon: "success" }); }
    });
  },

  // ── 1. 预约管理：加载真实场次与学员名单，并支持取消 ──
  tapBookings: function() {
    var that = this;
    this.setData({ activeModal: "bookings", loadingBookings: true });
    api.request({
      url: "/api/portal/manager/actions?action=bookings&date=" + this.data.todayDateIso,
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ bookingSessions: res.data.sessions || [], loadingBookings: false });
        } else {
          that.setData({ loadingBookings: false });
        }
      },
      fail: function() {
        that.setData({ loadingBookings: false });
      }
    });
  },

  // 帮会员现场取消预约
  cancelBookingAttendee: function(e) {
    var that = this;
    var bookingId = e.currentTarget.dataset.id;
    var memberName = e.currentTarget.dataset.name;

    wx.showModal({
      title: "取消预约确认",
      content: "确定要为学员【" + memberName + "】取消本节课吗？取消后席位将立即释放，课时将自动退还。",
      confirmColor: "#DC2626",
      confirmText: "确认取消",
      cancelText: "保留",
      success: function(sm) {
        if (!sm.confirm) return;
        wx.showLoading({ title: "正在退课…" });
        api.request({
          url: "/api/portal/manager/actions?action=cancel_booking",
          method: "POST",
          data: { bookingId: bookingId, reason: "导师在小程序手动退约" },
          success: function(res) {
            wx.hideLoading();
            if (res.statusCode === 200 && res.data && res.data.success) {
              wx.showToast({ title: "已取消并释放席位", icon: "success" });
              that.tapBookings(); // 刷新名单
              that.loadDashboard(); // 刷新指标
            } else {
              wx.showToast({ title: (res.data && res.data.error) || "取消失败", icon: "none" });
            }
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: "网络异常", icon: "none" });
          }
        });
      }
    });
  },

  // ── 2. 现场录入新会员 ──
  tapMembers: function() {
    this.setData({
      activeModal: "create_member",
      newMemberName: "",
      newMemberPhone: ""
    });
  },

  onMemberNameInput: function(e) { this.setData({ newMemberName: e.detail.value }); },
  onMemberPhoneInput: function(e) { this.setData({ newMemberPhone: e.detail.value }); },

  submitCreateMember: function() {
    var that = this;
    var name = this.data.newMemberName.trim();
    var phone = this.data.newMemberPhone.trim();

    if (!name) { wx.showToast({ title: "请输入会员姓名", icon: "none" }); return; }
    if (!phone || !/^1\d{10}$/.test(phone)) { wx.showToast({ title: "请输入11位手机号", icon: "none" }); return; }

    this.setData({ submittingMember: true });
    wx.showLoading({ title: "正在录入…" });

    api.request({
      url: "/api/portal/manager/actions?action=create_member",
      method: "POST",
      data: { name: name, phone: phone },
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingMember: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showModal({
            title: "录入成功",
            content: res.data.message + "\n\n已自动激活该会员的小程序约课通道，可立即开始约课。",
            showCancel: false,
            confirmText: "好的",
            success: function() {
              that.closeModal();
              that.loadDashboard();
            }
          });
        } else {
          wx.showToast({ title: (res.data && res.data.error) || "录入失败", icon: "none" });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingMember: false });
        wx.showToast({ title: "网络请求失败", icon: "none" });
      }
    });
  },

  // ── 3. 课程管理与修改 ──
  tapCourses: function() {
    var that = this;
    this.setData({ activeModal: "courses", loadingCourses: true });
    api.request({
      url: "/api/portal/manager/actions?action=courses",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ coursesList: res.data.courses || [], loadingCourses: false });
        } else {
          that.setData({ loadingCourses: false });
        }
      },
      fail: function() {
        that.setData({ loadingCourses: false });
      }
    });
  },

  // 点击某门课打开编辑
  openEditCourse: function(e) {
    var item = e.currentTarget.dataset.item;
    this.setData({
      activeModal: "edit_course",
      editingCourse: {
        id: item.id,
        name: item.name || "",
        categoryType: item.category_type || "boutique",
        difficultyStars: Number(item.difficulty_stars || 3),
        description: item.description || ""
      }
    });
  },

  onEditCourseName: function(e) { this.setData({ "editingCourse.name": e.detail.value }); },
  onEditCourseDesc: function(e) { this.setData({ "editingCourse.description": e.detail.value }); },

  setCourseType: function(e) {
    var t = e.currentTarget.dataset.type;
    this.setData({ "editingCourse.categoryType": t });
  },

  setCourseStars: function(e) {
    var stars = Number(e.currentTarget.dataset.stars);
    this.setData({ "editingCourse.difficultyStars": stars });
  },

  submitUpdateCourse: function() {
    var that = this;
    var c = this.data.editingCourse;
    if (!c.name.trim()) { wx.showToast({ title: "课程名不能为空", icon: "none" }); return; }

    this.setData({ submittingCourse: true });
    wx.showLoading({ title: "正在保存…" });

    api.request({
      url: "/api/portal/manager/actions?action=update_course",
      method: "POST",
      data: c,
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingCourse: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({ title: "已同步更新", icon: "success" });
          that.tapCourses(); // 重新加载课程列表
        } else {
          wx.showToast({ title: (res.data && res.data.error) || "保存失败", icon: "none" });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingCourse: false });
        wx.showToast({ title: "网络异常", icon: "none" });
      }
    });
  },

  // ── 4. 快速排课加课 ──
  tapSchedule: function() {
    this.setData({ activeModal: "create_session" });
  },

  onSessionCourseChange: function(e) { this.setData({ newSessionCourseIndex: Number(e.detail.value) }); },
  onSessionCoachChange: function(e) { this.setData({ newSessionCoachIndex: Number(e.detail.value) }); },
  onSessionRoomChange: function(e) { this.setData({ newSessionRoomIndex: Number(e.detail.value) }); },
  onSessionDateChange: function(e) { this.setData({ newSessionDate: e.detail.value }); },
  onSessionStartChange: function(e) { this.setData({ newSessionStartTime: e.detail.value }); },
  onSessionEndChange: function(e) { this.setData({ newSessionEndTime: e.detail.value }); },
  onSessionCapacityInput: function(e) { this.setData({ newSessionCapacity: Number(e.detail.value) || 6 }); },

  submitCreateSession: function() {
    var that = this;
    var opts = this.data.sessionOptions;
    if (!opts.courses.length) { wx.showToast({ title: "未获取到课程列表", icon: "none" }); return; }

    var course = opts.courses[this.data.newSessionCourseIndex];
    var coach = opts.coaches[this.data.newSessionCoachIndex];
    var room = opts.rooms[this.data.newSessionRoomIndex];

    this.setData({ submittingSession: true });
    wx.showLoading({ title: "正在排课…" });

    api.request({
      url: "/api/portal/manager/actions?action=create_session",
      method: "POST",
      data: {
        courseCategoryId: course ? course.id : 1,
        coachId: coach ? coach.id : null,
        roomId: room ? room.id : null,
        sessionDate: this.data.newSessionDate,
        startTime: this.data.newSessionStartTime,
        endTime: this.data.newSessionEndTime,
        capacity: this.data.newSessionCapacity
      },
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingSession: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showModal({
            title: "排课成功",
            content: res.data.message + "\n\n小程序前端约课页面已同步上线，学员即可在线选课。",
            showCancel: false,
            confirmText: "好的",
            success: function() {
              that.closeModal();
              that.loadDashboard();
            }
          });
        } else {
          wx.showToast({ title: (res.data && res.data.error) || "排课失败", icon: "none" });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingSession: false });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      }
    });
  },

  // 其他九宫格
  tapCoach: function() { wx.navigateTo({ url: "/pages/notes/notes" }); },
  tapTeam: function() { wx.switchTab({ url: "/pages/brand/brand" }); },
  tapCards: function() { wx.navigateTo({ url: "/pages/cards/cards" }); },

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
