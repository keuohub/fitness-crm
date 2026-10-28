// pages/manager/manager.js
// 徕舞普拉提 · 手机端管家智能工作台
// 全屏沉浸式原生子视图结构：彻底根除弹窗滚动穿透，所有SaaS业务功能实打实打通
var api = require("../../utils/api.js");

Page({
  data: {
    loading: true,
    loadError: "",
    managerName: "",
    managerRole: "",
    todayBookingsCount: 0,
    totalCardsCount: 0,
    todayNewMembersCount: 0,
    totalMembersCount: 0,
    portalEnabledCount: 0,
    recentActivities: [],
    topActivityText: "今日约课系统运行正常，等待新动态",
    topActivityStatus: "booked",
    topActivityTime: "实时",
    todayDateStr: "",
    todayDateIso: "",

    // 当前视图: 'home' | 'bookings' | 'schedule' | 'courses' | 'members' | 'cards' | 'venue' | 'reports'
    currentView: "home",
    navTitle: "工作台",

    // ── 预约管理 (bookings) ──
    dateTabs: [],
    selectedBookingDate: "",
    bookingSessions: [],
    loadingBookings: false,
    errorBookings: "",

    // ── 排课中心 (schedule) ──
    showScheduleForm: true,
    sessionOptions: {
      courses: [],
      coaches: [],
      rooms: []
    },
    newSessionCourseIndex: 0,
    newSessionCoachIndex: 0,
    newSessionRoomIndex: 0,
    newSessionDate: "",
    newSessionStartTime: "09:00",
    newSessionEndTime: "10:00",
    newSessionCapacity: 6,
    submittingSession: false,
    scheduleSessions: [],
    loadingScheduleSessions: false,
    errorScheduleSessions: "",

    // ── 课程管理 (courses) ──
    coursesList: [],
    loadingCourses: false,
    errorCourses: "",
    editingCourse: {
      id: 0,
      name: "",
      categoryType: "boutique",
      difficultyStars: 3,
      description: ""
    },
    submittingCourse: false,

    // ── 会员中心 (members) ──
    showNewMemberCard: false,
    newMemberName: "",
    newMemberPhone: "",
    submittingMember: false,
    memberSearchKeyword: "",
    membersList: [],
    totalMembersDb: 0,
    loadingMembers: false,
    errorMembers: "",

    // ── 会员卡项 (cards) ──
    cardsList: [],
    loadingCards: false,
    errorCards: "",

    // ── 教室场地 (venue) ──
    venueRooms: [],
    loadingVenue: false,
    errorVenue: "",

    // ── 经营报表 (reports) ──
    reportData: {},
    loadingReports: false,
    errorReports: ""
  },

  onLoad: function() {
    this.initDate();
    this.initDateTabs();
    this.loadDashboard();
    this.loadSessionOptions();
  },

  onPullDownRefresh: function() {
    var that = this;
    if (this.data.currentView === "home") {
      this.loadDashboard(function() { wx.stopPullDownRefresh(); });
    } else if (this.data.currentView === "bookings") {
      this.fetchBookings(this.data.selectedBookingDate, function() { wx.stopPullDownRefresh(); });
    } else if (this.data.currentView === "schedule") {
      this.fetchScheduleSessions(this.data.newSessionDate, function() { wx.stopPullDownRefresh(); });
    } else if (this.data.currentView === "courses") {
      this.fetchCourses(function() { wx.stopPullDownRefresh(); });
    } else if (this.data.currentView === "members") {
      this.fetchMembers(this.data.memberSearchKeyword, function() { wx.stopPullDownRefresh(); });
    } else if (this.data.currentView === "cards") {
      this.fetchCards(function() { wx.stopPullDownRefresh(); });
    } else if (this.data.currentView === "venue") {
      this.fetchVenue(function() { wx.stopPullDownRefresh(); });
    } else if (this.data.currentView === "reports") {
      this.fetchReports(function() { wx.stopPullDownRefresh(); });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  initDate: function() {
    var now = new Date();
    var days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, "0");
    var d = String(now.getDate()).padStart(2, "0");
    var dateIso = y + "-" + m + "-" + d;
    var str = y + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日 · " + days[now.getDay()];
    this.setData({
      todayDateStr: str,
      todayDateIso: dateIso,
      selectedBookingDate: dateIso,
      newSessionDate: dateIso
    });
  },

  initDateTabs: function() {
    var tabs = [];
    var daysName = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    var base = new Date();
    for (var i = -1; i <= 5; i++) {
      var d = new Date(base.getTime() + i * 86400 * 1000);
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var dt = String(d.getDate()).padStart(2, "0");
      var iso = y + "-" + m + "-" + dt;
      var dayLabel = daysName[d.getDay()];
      if (i === 0) dayLabel = "今天";
      else if (i === -1) dayLabel = "昨天";
      else if (i === 1) dayLabel = "明天";

      tabs.push({
        date: iso,
        dayLabel: dayLabel,
        displayDate: (d.getMonth() + 1) + "/" + d.getDate()
      });
    }
    this.setData({ dateTabs: tabs });
  },

  // ── 导航切换 ──
  goHomeView: function() {
    this.setData({
      currentView: "home",
      navTitle: "工作台"
    });
    this.loadDashboard();
  },

  goBackMember: function() {
    wx.switchTab({ url: "/pages/me/me" });
  },

  switchToBookings: function() {
    this.setData({
      currentView: "bookings",
      navTitle: "预约管理"
    });
    this.fetchBookings(this.data.selectedBookingDate);
  },

  switchToSchedule: function() {
    this.setData({
      currentView: "schedule",
      navTitle: "排课中心"
    });
    this.loadSessionOptions();
    this.fetchScheduleSessions(this.data.newSessionDate);
  },

  switchToCourses: function() {
    this.setData({
      currentView: "courses",
      navTitle: "课程管理",
      editingCourse: { id: 0, name: "", categoryType: "boutique", difficultyStars: 3, description: "" }
    });
    this.fetchCourses();
  },

  switchToMembers: function() {
    this.setData({
      currentView: "members",
      navTitle: "会员中心"
    });
    this.fetchMembers();
  },

  switchToCards: function() {
    this.setData({
      currentView: "cards",
      navTitle: "会员卡项"
    });
    this.fetchCards();
  },

  switchToVenue: function() {
    this.setData({
      currentView: "venue",
      navTitle: "教室场地"
    });
    this.fetchVenue();
  },

  switchToReports: function() {
    this.setData({
      currentView: "reports",
      navTitle: "经营报表"
    });
    this.fetchReports();
  },

  tapCoach: function() {
    wx.navigateTo({ url: "/pages/notes/notes" });
  },

  tapTeam: function() {
    wx.switchTab({ url: "/pages/brand/brand" });
  },

  // ── 主工作台数据加载 (P0-7 修复：取真实 totalCardsCount，删除 || 5 假数据) ──
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
            todayBookingsCount: Number(d.todayBookingsCount || 0),
            totalCardsCount: Number(d.totalCardsCount != null ? d.totalCardsCount : d.todayNewCardsCount || 0),
            todayNewMembersCount: Number(d.todayNewMembersCount || 0),
            totalMembersCount: Number(d.totalMembersCount || 0),
            portalEnabledCount: Number(d.portalEnabledCount || 0),
            recentActivities: d.recentActivities || [],
            topActivityText: topText,
            topActivityStatus: topStatus,
            topActivityTime: topTime
          });
        } else if (res.statusCode === 403) {
          that.setData({ loading: false });
          wx.showModal({
            title: "权限受限",
            content: "当前登录账号未开通会馆管家权限，仅供会馆导师与主理人使用。",
            showCancel: false,
            confirmText: "返回",
            success: function() { wx.switchTab({ url: "/pages/me/me" }); }
          });
        } else {
          var errMsg = (res.data && res.data.error) || "加载失败，请下拉刷新";
          that.setData({ loading: false, loadError: errMsg });
        }
      },
      fail: function() {
        that.setData({ loading: false, loadError: "网络连接失败，请下拉重试" });
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

  // 快捷工具
  openPcLogin: function() {
    wx.setClipboardData({
      data: "https://crm.laiwupilates.com/admin",
      success: function() {
        wx.showModal({
          title: "电脑端后台网址已复制",
          content: "网址：https://crm.laiwupilates.com/admin\n\n可直接粘贴在电脑浏览器中，使用手机号即可直接登录管理会馆。",
          showCancel: false,
          confirmText: "知道了"
        });
      }
    });
  },

  copyInviteText: function() {
    wx.setClipboardData({
      data: "微信搜索小程序【徕舞普拉提】，精品课/大器械课在线约课，课后自动消课，欢迎预约！",
      success: function() {
        wx.showModal({
          title: "邀请文案已复制",
          content: "可直接粘贴发送到学员微信群或私信好友，引导学员微信搜索【徕舞普拉提】直接约课。",
          showCancel: false,
          confirmText: "好的"
        });
      }
    });
  },

  openCheckinNotice: function() {
    wx.showModal({
      title: "智能结课消课机制",
      content: "全自研SaaS智能结课引擎已激活：\n\n• 会员预约课程后，如在开课前未主动退课，课程结束后系统自动判定为已出勤，自动从会员卡扣减对应课时。\n• 前台与授课导师无需在下课后手动逐一打钩划卡，课消资产全自动核销对齐。\n• 若会员无有效匹配卡，系统将自动标记为待补卡结算，绝不漏扣也不白送。",
      showCancel: false,
      confirmText: "我知道了"
    });
  },

  // ════════════════════════════════════════════════════════════
  // 1. 预约管理逻辑 (Bookings, P0-3 校验与文案修复)
  // ════════════════════════════════════════════════════════════
  onSelectDateTab: function(e) {
    var date = e.currentTarget.dataset.date;
    if (date === this.data.selectedBookingDate) return;
    this.setData({ selectedBookingDate: date });
    this.fetchBookings(date);
  },

  onBookingDatePick: function(e) {
    var date = e.detail.value;
    this.setData({ selectedBookingDate: date });
    this.fetchBookings(date);
  },

  retryBookings: function() {
    this.fetchBookings(this.data.selectedBookingDate);
  },

  retryScheduleSessions: function() {
    this.fetchScheduleSessions(this.data.newSessionDate);
  },

  fetchBookings: function(date, done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingBookings: true, errorBookings: "" });

    api.request({
      url: "/api/portal/manager/actions?action=bookings&date=" + (date || this.data.selectedBookingDate),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({
            bookingSessions: res.data.sessions || [],
            loadingBookings: false,
            errorBookings: ""
          });
        } else {
          var err = (res.data && res.data.error) || ("获取预约失败 (HTTP " + res.statusCode + ")");
          that.setData({ loadingBookings: false, errorBookings: err });
          wx.showToast({ title: err, icon: "none" });
        }
      },
      fail: function() {
        that.setData({ loadingBookings: false, errorBookings: "网络连接失败，请重试" });
        wx.showToast({ title: "网络连接异常", icon: "none" });
      },
      complete: cb
    });
  },

  cancelBookingAttendee: function(e) {
    var that = this;
    var bookingId = e.currentTarget.dataset.id;
    var memberName = e.currentTarget.dataset.name;

    wx.showModal({
      title: "取消预约确认",
      content: "确定要代学员【" + memberName + "】取消本节课程吗？取消后该席位将立刻释放给其他学员，学员预约额度将恢复。",
      confirmColor: "#DC2626",
      confirmText: "确认取消",
      cancelText: "保留",
      success: function(sm) {
        if (!sm.confirm) return;
        wx.showLoading({ title: "正在代客退课…" });
        api.request({
          url: "/api/portal/manager/actions?action=cancel_booking",
          method: "POST",
          data: { bookingId: bookingId, reason: "管家在小程序端代客取消" },
          success: function(res) {
            wx.hideLoading();
            if (res.statusCode === 200 && res.data && res.data.success) {
              wx.showToast({ title: res.data.message || "已取消并释放席位", icon: "success" });
              that.fetchBookings(that.data.selectedBookingDate);
              that.loadDashboard();
            } else {
              wx.showToast({ title: (res.data && res.data.error) || "取消失败", icon: "none" });
            }
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: "网络连接异常", icon: "none" });
          }
        });
      }
    });
  },

  // ════════════════════════════════════════════════════════════
  // 2. 排课中心逻辑 (Schedule, P0-10 校验与取消场次入口)
  // ════════════════════════════════════════════════════════════
  toggleScheduleForm: function() {
    this.setData({ showScheduleForm: !this.data.showScheduleForm });
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

  fetchScheduleSessions: function(date, done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingScheduleSessions: true, errorScheduleSessions: "" });

    api.request({
      url: "/api/portal/manager/actions?action=bookings&date=" + (date || this.data.newSessionDate),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({
            scheduleSessions: res.data.sessions || [],
            loadingScheduleSessions: false,
            errorScheduleSessions: ""
          });
        } else {
          var err = (res.data && res.data.error) || ("获取排课失败 (HTTP " + res.statusCode + ")");
          that.setData({ loadingScheduleSessions: false, errorScheduleSessions: err });
          wx.showToast({ title: err, icon: "none" });
        }
      },
      fail: function() {
        that.setData({ loadingScheduleSessions: false, errorScheduleSessions: "网络连接失败" });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      },
      complete: cb
    });
  },

  onSessionCourseChange: function(e) { this.setData({ newSessionCourseIndex: Number(e.detail.value) }); },
  onSessionCoachChange: function(e) { this.setData({ newSessionCoachIndex: Number(e.detail.value) }); },
  onSessionRoomChange: function(e) {
    var idx = Number(e.detail.value);
    var r = this.data.sessionOptions.rooms[idx];
    this.setData({
      newSessionRoomIndex: idx,
      newSessionCapacity: r && r.capacity ? Number(r.capacity) : 6
    });
  },
  onSessionDateChange: function(e) {
    var d = e.detail.value;
    this.setData({ newSessionDate: d });
    this.fetchScheduleSessions(d);
  },
  onSessionStartChange: function(e) { this.setData({ newSessionStartTime: e.detail.value }); },
  onSessionEndChange: function(e) { this.setData({ newSessionEndTime: e.detail.value }); },
  onSessionCapacityInput: function(e) { this.setData({ newSessionCapacity: Number(e.detail.value) || 6 }); },

  submitCreateSession: function() {
    var that = this;
    var opts = this.data.sessionOptions;
    if (!opts.courses.length) {
      wx.showToast({ title: "课程列表未就绪", icon: "none" });
      return;
    }

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
          wx.showToast({ title: "排课发布成功", icon: "success" });
          that.fetchScheduleSessions(that.data.newSessionDate);
          that.loadDashboard();
        } else {
          var err = (res.data && res.data.error) || "排课发布失败";
          wx.showModal({
            title: "排课冲突提醒",
            content: err,
            showCancel: false,
            confirmText: "知道了"
          });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingSession: false });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      }
    });
  },

  // 取消排课场次 (P0-10)
  cancelSessionItem: function(e) {
    var that = this;
    var sessionId = e.currentTarget.dataset.id;
    var title = e.currentTarget.dataset.title;

    wx.showModal({
      title: "取消排课场次确认",
      content: "确定取消该场【" + title + "】排课吗？取消后该场已有的所有学员预约将同步取消并释放席位。",
      confirmColor: "#DC2626",
      confirmText: "确认取消",
      cancelText: "保留",
      success: function(sm) {
        if (!sm.confirm) return;
        wx.showLoading({ title: "正在取消排课…" });
        api.request({
          url: "/api/portal/manager/actions?action=cancel_session",
          method: "POST",
          data: { sessionId: sessionId, reason: "管家在小程序端取消排课" },
          success: function(res) {
            wx.hideLoading();
            if (res.statusCode === 200 && res.data && res.data.success) {
              wx.showToast({ title: "场次已取消", icon: "success" });
              that.fetchScheduleSessions(that.data.newSessionDate);
              that.loadDashboard();
            } else {
              wx.showToast({ title: (res.data && res.data.error) || "取消失败", icon: "none" });
            }
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: "网络连接失败", icon: "none" });
          }
        });
      }
    });
  },

  // ════════════════════════════════════════════════════════════
  // 3. 课程管理逻辑 (Courses)
  // ════════════════════════════════════════════════════════════
  fetchCourses: function(done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingCourses: true, errorCourses: "" });

    api.request({
      url: "/api/portal/manager/actions?action=courses",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ coursesList: res.data.courses || [], loadingCourses: false, errorCourses: "" });
        } else {
          var err = (res.data && res.data.error) || ("获取课程失败 (HTTP " + res.statusCode + ")");
          that.setData({ loadingCourses: false, errorCourses: err });
          wx.showToast({ title: err, icon: "none" });
        }
      },
      fail: function() {
        that.setData({ loadingCourses: false, errorCourses: "网络连接异常" });
        wx.showToast({ title: "网络连接异常", icon: "none" });
      },
      complete: cb
    });
  },

  openEditCourse: function(e) {
    var item = e.currentTarget.dataset.item;
    this.setData({
      editingCourse: {
        id: item.id,
        name: item.name || "",
        categoryType: item.category_type || "boutique",
        difficultyStars: Number(item.difficulty_stars || 3),
        description: item.description || ""
      }
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 300 });
  },

  cancelEditCourse: function() {
    this.setData({
      editingCourse: { id: 0, name: "", categoryType: "boutique", difficultyStars: 3, description: "" }
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
    wx.showLoading({ title: "正在同步修改…" });

    api.request({
      url: "/api/portal/manager/actions?action=update_course",
      method: "POST",
      data: c,
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingCourse: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({ title: "已同步更新", icon: "success" });
          that.cancelEditCourse();
          that.fetchCourses();
        } else {
          wx.showToast({ title: (res.data && res.data.error) || "修改失败", icon: "none" });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingCourse: false });
        wx.showToast({ title: "网络连接异常", icon: "none" });
      }
    });
  },

  // ════════════════════════════════════════════════════════════
  // 4. 会员中心逻辑 (Members, P0-8 专属邀请码与PIN回显)
  // ════════════════════════════════════════════════════════════
  toggleNewMemberCard: function() {
    this.setData({ showNewMemberCard: !this.data.showNewMemberCard });
  },

  onMemberNameInput: function(e) { this.setData({ newMemberName: e.detail.value }); },
  onMemberPhoneInput: function(e) { this.setData({ newMemberPhone: e.detail.value }); },
  onMemberSearchInput: function(e) { this.setData({ memberSearchKeyword: e.detail.value }); },

  doSearchMembers: function() {
    this.fetchMembers(this.data.memberSearchKeyword);
  },

  fetchMembers: function(q, done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingMembers: true, errorMembers: "" });

    var query = q ? "&q=" + encodeURIComponent(q) : "";
    api.request({
      url: "/api/portal/manager/actions?action=members" + query,
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({
            membersList: res.data.members || [],
            totalMembersDb: res.data.total || (res.data.members ? res.data.members.length : 0),
            loadingMembers: false,
            errorMembers: ""
          });
        } else {
          var err = (res.data && res.data.error) || ("获取会员失败 (HTTP " + res.statusCode + ")");
          that.setData({ loadingMembers: false, errorMembers: err });
          wx.showToast({ title: err, icon: "none" });
        }
      },
      fail: function() {
        that.setData({ loadingMembers: false, errorMembers: "网络连接失败，请重试" });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      },
      complete: cb
    });
  },

  submitCreateMember: function() {
    var that = this;
    var name = this.data.newMemberName.trim();
    var phone = this.data.newMemberPhone.trim();

    if (!name) { wx.showToast({ title: "请输入会员姓名", icon: "none" }); return; }
    if (!phone || !/^1\d{10}$/.test(phone)) { wx.showToast({ title: "请输入有效11位手机号", icon: "none" }); return; }

    this.setData({ submittingMember: true });
    wx.showLoading({ title: "正在录入并开通…" });

    api.request({
      url: "/api/portal/manager/actions?action=create_member",
      method: "POST",
      data: { name: name, phone: phone },
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingMember: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          var portalCode = res.data.portalCode || "已开通";
          var loginPin = res.data.loginPin || phone.slice(-4);
          wx.showModal({
            title: "录入成功",
            content: "会员【" + name + "】已建档并开通约课通道！\n\n专属邀请码：" + portalCode + "\n登录验证码：" + loginPin + "\n\n会员在小程序「登录」页输入此邀请码与验证码即可直接登录约课。",
            showCancel: false,
            confirmText: "我知道了",
            success: function() {
              that.setData({
                showNewMemberCard: false,
                newMemberName: "",
                newMemberPhone: ""
              });
              that.fetchMembers();
              that.loadDashboard();
            }
          });
        } else {
          var err = (res.data && res.data.error) || "录入失败";
          wx.showModal({
            title: "录入提示",
            content: err,
            showCancel: false,
            confirmText: "知道了"
          });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingMember: false });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      }
    });
  },

  // ════════════════════════════════════════════════════════════
  // 5. 会员卡项逻辑 (Cards, P1-3 错误显式提示)
  // ════════════════════════════════════════════════════════════
  fetchCards: function(done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingCards: true, errorCards: "" });

    api.request({
      url: "/api/portal/manager/actions?action=cards",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ cardsList: res.data.cards || [], loadingCards: false, errorCards: "" });
        } else {
          var err = (res.data && res.data.error) || ("获取卡项失败 (HTTP " + res.statusCode + ")");
          that.setData({ loadingCards: false, errorCards: err });
          wx.showToast({ title: err, icon: "none" });
        }
      },
      fail: function() {
        that.setData({ loadingCards: false, errorCards: "网络连接失败" });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      },
      complete: cb
    });
  },

  // ════════════════════════════════════════════════════════════
  // 6. 教室场地逻辑 (Venue)
  // ════════════════════════════════════════════════════════════
  fetchVenue: function(done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingVenue: true, errorVenue: "" });

    api.request({
      url: "/api/portal/manager/actions?action=venue",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ venueRooms: res.data.rooms || [], loadingVenue: false, errorVenue: "" });
        } else {
          var err = (res.data && res.data.error) || ("获取教室失败 (HTTP " + res.statusCode + ")");
          that.setData({ loadingVenue: false, errorVenue: err });
          wx.showToast({ title: err, icon: "none" });
        }
      },
      fail: function() {
        that.setData({ loadingVenue: false, errorVenue: "网络连接失败" });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      },
      complete: cb
    });
  },

  // ════════════════════════════════════════════════════════════
  // 7. 经营报表逻辑 (Reports)
  // ════════════════════════════════════════════════════════════
  fetchReports: function(done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingReports: true, errorReports: "" });

    api.request({
      url: "/api/portal/manager/actions?action=reports",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ reportData: res.data.report || {}, loadingReports: false, errorReports: "" });
        } else {
          var err = (res.data && res.data.error) || ("获取报表失败 (HTTP " + res.statusCode + ")");
          that.setData({ loadingReports: false, errorReports: err });
          wx.showToast({ title: err, icon: "none" });
        }
      },
      fail: function() {
        that.setData({ loadingReports: false, errorReports: "网络连接失败" });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      },
      complete: cb
    });
  }
});
