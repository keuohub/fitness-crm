var navUtil = require("../../utils/nav.js");
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
    editingSessionId: 0,
    sessionOptions: {
      courses: [],
      coaches: [],
      rooms: [],
      cardTypes: []
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
      id: -1,
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
    showIssueCardModal: false,
    selectedIssueMember: null,
    selectedIssueCardTypeIndex: 0,
    customIssueCount: "",
    submittingIssueCard: false,
    memberSearchKeyword: "",
    membersList: [],
    totalMembersDb: 0,
    loadingMembers: false,
    errorMembers: "",

    // ── 会员详情 (memberDetail) ──
    loadingMemberDetail: false,
    errorMemberDetail: "",
    currentDetailMemberId: 0,
    detailMember: {},
    detailCards: [],
    detailActiveCard: null,
    detailStat: {},
    detailRecent: [],
    detailUpcoming: [],
    checkinSubmitting: false,

    // ── 会员卡项 (cards) ──
    cardsList: [],
    loadingCards: false,
    errorCards: "",
    cardTab: "cards", // 'cards' (持卡列表) | 'types' (卡种规则库)
    cardTypesList: [],
    loadingCardTypes: false,
    showNewCardTypeForm: false,
    newCardTypeName: "",
    newCardTypeCategory: "count",
    newCardTypeCount: 10,
    newCardTypeDays: 90,
    newCardTypePrice: "",
    submittingCardType: false,
    cardSearchKeyword: "",

    // ── 教室场地 (venue) ──
    venueRooms: [],
    loadingVenue: false,
    errorVenue: "",
    showNewRoomForm: false,
    newRoomName: "",
    newRoomCapacity: 6,
    submittingRoom: false,

    // ── 教练团队 (coaches) ──
    coachesList: [],
    loadingCoaches: false,
    errorCoaches: "",
    showNewCoachForm: false,
    newCoachName: "",
    newCoachTitle: "资深塑形教练",
    submittingCoach: false,

    // ── 账号权限与操作留痕寻迹 (admins & audit) ──
    isManagerLoggedIn: false,
    managerUsername: "",
    managerPassword: "",
    managerLoginSubmitting: false,
    managerLoginError: "",
    currentManagerUser: null,
    adminsTab: "logs", // 'logs' (留痕寻迹) | 'accounts' (专用管理员)
    adminsList: [],
    loadingAdmins: false,
    auditLogsList: [],
    loadingAuditLogs: false,
    auditLogsTotal: 0,

    // ── 代客约课 (bookForMember) ──
    showBookForMemberModal: false,
    bookForMemberSession: null,
    bookForMemberKeyword: "",
    bookForMemberCandidates: [],
    selectedBookMember: null,
    submittingBookForMember: false,

    // ── 经营报表 (reports) ──
    reportData: {},
    loadingReports: false,
    errorReports: ""
  },

  checkManagerAccess: function() {
    var mgrToken = wx.getStorageSync("managerToken");
    var mgrProfile = wx.getStorageSync("managerProfile");
    if (mgrToken && mgrProfile && mgrProfile.id !== 11 && mgrProfile.username !== "xiaoqiao") {
      this.setData({
        isManagerLoggedIn: true,
        currentManagerUser: mgrProfile,
        managerName: mgrProfile.name || "管理员",
        managerRole: mgrProfile.role || "admin",
        navTitle: "工作台"
      });
      return true;
    }
    // 未登录管理员：停留在本页展示管理员专属密码登录界面，杜绝普通会员手机号免密进入
    this.setData({
      isManagerLoggedIn: false,
      loading: false,
      currentManagerUser: null,
      navTitle: "管家安全登录"
    });
    return false;
  },

  onManagerUsernameInput: function(e) {
    this.setData({ managerUsername: e.detail.value, managerLoginError: "" });
  },

  onManagerPasswordInput: function(e) {
    this.setData({ managerPassword: e.detail.value, managerLoginError: "" });
  },

  fillPresetAccount: function(e) {
    var user = e.currentTarget.dataset.user;
    this.setData({ managerUsername: user, managerLoginError: "" });
  },

  submitManagerLogin: function() {
    var that = this;
    var username = (this.data.managerUsername || "").trim();
    var password = (this.data.managerPassword || "").trim();
    if (!username) {
      this.setData({ managerLoginError: "请输入管理员专用账号" });
      return;
    }
    if (!password) {
      this.setData({ managerLoginError: "请输入登录口令密码" });
      return;
    }
    this.setData({ managerLoginSubmitting: true, managerLoginError: "" });
    api.request({
      url: "/api/portal/manager/auth",
      method: "POST",
      data: { username: username, password: password },
      success: function(res) {
        if (res && res.statusCode === 200 && res.data && res.data.ok) {
          wx.setStorageSync("managerToken", res.data.token);
          wx.setStorageSync("managerProfile", res.data.admin);
          that.setData({
            isManagerLoggedIn: true,
            currentManagerUser: res.data.admin,
            managerName: res.data.admin.name || "管理员",
            managerRole: res.data.admin.role || "admin",
            managerPassword: "",
            managerLoginSubmitting: false,
            loading: true,
            navTitle: "工作台"
          });
          wx.showToast({ title: "安全验证成功", icon: "success" });
          that.initDate();
          that.initDateTabs();
          that.loadDashboard();
          that.loadSessionOptions();
        } else {
          var errMsg = (res && res.data && res.data.error) || "登录失败，账号或密码错误";
          that.setData({ managerLoginError: errMsg, managerLoginSubmitting: false });
        }
      },
      fail: function() {
        that.setData({ managerLoginError: "网络连接失败，请重试", managerLoginSubmitting: false });
      }
    });
  },

  doManagerLogout: function() {
    var that = this;
    wx.showModal({
      title: "退出管理工作台",
      content: "确认安全退出当前管理员账号？退出后需重新验证账号密码。",
      confirmText: "安全退出",
      confirmColor: "#B92E32",
      success: function(res) {
        if (res.confirm) {
          wx.removeStorageSync("managerToken");
          wx.removeStorageSync("managerProfile");
          that.setData({
            isManagerLoggedIn: false,
            currentManagerUser: null,
            currentView: "home",
            navTitle: "管家安全登录",
            loading: false,
          });
          wx.showToast({ title: "已安全退出", icon: "none" });
        }
      }
    });
  },

  onAdminsTabChange: function(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ adminsTab: tab });
    if (tab === "logs") {
      this.fetchAuditLogs();
    } else {
      this.fetchAdmins();
    }
  },

  fetchAuditLogs: function(done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingAuditLogs: true });
    api.request({
      url: "/api/portal/manager/actions?action=audit_logs",
      success: function(res) {
        if (res && res.statusCode === 200 && res.data) {
          that.setData({
            auditLogsList: res.data.logs || [],
            auditLogsTotal: res.data.total || 0,
            loadingAuditLogs: false,
          });
        } else {
          that.setData({ loadingAuditLogs: false });
        }
      },
      fail: function() {
        that.setData({ loadingAuditLogs: false });
      },
      complete: cb
    });
  },

  onLoad: function() {
    this.setData({ nav: navUtil.getNavMetrics() });
    if (!this.checkManagerAccess()) return;
    this.initDate();
    this.initDateTabs();
    this.loadDashboard();
    this.loadSessionOptions();
  },

  onShow: function() {
    if (!this.checkManagerAccess()) return;
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      var tb = this.getTabBar();
      if (typeof tb.updateTab === "function") {
        tb.updateTab("/pages/manager/manager");
      } else {
        tb.setData({ hidden: false });
      }
    }
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
    } else if (this.data.currentView === "memberDetail") {
      this.fetchMemberDetail(this.data.currentDetailMemberId);
      wx.stopPullDownRefresh();
    } else if (this.data.currentView === "coaches") {
      this.fetchCoaches(function() { wx.stopPullDownRefresh(); });
    } else if (this.data.currentView === "admins") {
      this.fetchAdmins(function() { wx.stopPullDownRefresh(); });
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
    wx.switchTab({ url: "/pages/stars/stars" });
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
      navTitle: "排课中心",
      editingSessionId: 0
    });
    this.loadSessionOptions();
    this.fetchScheduleSessions(this.data.newSessionDate);
  },

  switchToCourses: function() {
    this.setData({
      currentView: "courses",
      navTitle: "课程管理",
      editingCourse: { id: -1, name: "", categoryType: "boutique", difficultyStars: 3, description: "" }
    });
    this.fetchCourses();
  },

  switchToMembers: function() {
    this.setData({
      currentView: "members",
      navTitle: "会员中心",
      showIssueCardModal: false,
      selectedIssueMember: null
    });
    this.loadSessionOptions();
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
      navTitle: "教室场地",
      showNewRoomForm: false
    });
    this.fetchVenue();
  },

  switchToCoaches: function() {
    this.setData({
      currentView: "coaches",
      navTitle: "教练团队",
      showNewCoachForm: false
    });
    this.fetchCoaches();
  },

  switchToAdmins: function() {
    this.setData({
      currentView: "admins",
      navTitle: "账号与留痕",
      adminsTab: "logs"
    });
    this.fetchAuditLogs();
    this.fetchAdmins();
  },

  switchToReports: function() {
    this.setData({
      currentView: "reports",
      navTitle: "经营报表"
    });
    this.fetchReports();
  },

  tapCoach: function() {
    this.switchToCoaches();
  },

  tapTeam: function() {
    this.switchToAdmins();
  },

  // ════════════════════════════════════════════════════════════
  // 0. 会员详情（点进一个人看全部）
  // 约刻的会员信息页只有 6 个只读字段、点行无反应，馆长想查"她还剩几次、
  // 上次来是什么时候"只能导出表格翻。这里把档案、卡、到课画像一次给全。
  // ════════════════════════════════════════════════════════════
  openMemberDetail: function(e) {
    var id = Number(e.currentTarget.dataset.id || 0);
    if (!id) return;
    var prev = this.data.currentView || "members";
    this.setData({
      currentView: "memberDetail",
      prevDetailView: prev,
      navTitle: "会员详情",
      currentDetailMemberId: id,
      loadingMemberDetail: true,
      errorMemberDetail: "",
      detailMember: {},
      detailCards: [],
      detailActiveCard: null,
      detailStat: {},
      detailRecent: [],
      detailUpcoming: []
    });
    this.fetchMemberDetail(id);
  },

  retryMemberDetail: function() {
    this.fetchMemberDetail(this.data.currentDetailMemberId);
  },

  goBackToMembers: function() {
    // 回退到点进来的来源页面（如果在今日预约点进来就回今日预约，在会员列表点进来就回会员列表）
    var prev = this.data.prevDetailView || "members";
    var title = prev === "home" ? "管家工作台" : "会员中心";
    this.setData({ currentView: prev, navTitle: title });
  },

  fetchMemberDetail: function(id) {
    if (!id) return;
    var that = this;
    this.setData({ loadingMemberDetail: true, errorMemberDetail: "" });
    api.request({
      url: "/api/portal/manager/actions?action=member_detail&id=" + id,
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var d = res.data;
          that.setData({
            loadingMemberDetail: false,
            errorMemberDetail: "",
            detailMember: d.member || {},
            detailCards: d.cards || [],
            detailActiveCard: d.activeCard || null,
            detailStat: d.stat || {},
            detailRecent: d.recent || [],
            detailUpcoming: d.upcoming || []
          });
        } else {
          that.setData({
            loadingMemberDetail: false,
            errorMemberDetail: (res.data && res.data.error) || ("读取失败 HTTP " + res.statusCode)
          });
        }
      },
      fail: function() {
        that.setData({ loadingMemberDetail: false, errorMemberDetail: "网络连接失败，点击重试" });
      }
    });
  },

  callMember: function() {
    var phone = this.data.detailMember && this.data.detailMember.phone;
    if (!phone) {
      wx.showToast({ title: "没留手机号", icon: "none" });
      return;
    }
    wx.makePhoneCall({ phoneNumber: String(phone) });
  },

  openIssueCardForDetail: function() {
    var m = this.data.detailMember;
    if (!m || !m.id) return;
    this.openIssueCardWithMember({ id: m.id, name: m.name, phone: m.phone });
  },

  // ── 签到 / 标记未到 ──
  // 约刻的名单每行一个「签到」，点了就扣次记出勤。我们原来只有教练能签
  // （且必须是这节课的教练），馆长拿手机签不了。这里按约刻的方式开放给馆长。
  doCheckin: function(e) {
    var that = this;
    var bookingId = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name || "该学员";
    var card = e.currentTarget.dataset.card || "会员卡";

    wx.showActionSheet({
      itemList: ["已到课（扣 1 节）", "未到 / 旷课（同样扣 1 节）"],
      success: function(res) {
        var status = res.tapIndex === 0 ? "attended" : "no_show";
        var confirmText = status === "attended"
          ? "确认【" + name + "】已到课？\n\n将从「" + card + "」扣 1 节课时。"
          : "确认【" + name + "】没来？\n\n按馆内规则，旷课同样扣 1 次课时，并计入未到记录。";
        wx.showModal({
          title: status === "attended" ? "签到确认" : "未到确认",
          content: confirmText,
          confirmText: status === "attended" ? "确认签到" : "确认未到",
          confirmColor: status === "attended" ? "#B92E32" : "#8A8A8E",
          success: function(sm) {
            if (!sm.confirm) return;
            that.submitCheckin(bookingId, status);
          }
        });
      }
    });
  },

  submitCheckin: function(bookingId, status) {
    var that = this;
    if (this.data.checkinSubmitting) return;
    this.setData({ checkinSubmitting: true });
    wx.showLoading({ title: status === "attended" ? "正在签到扣次…" : "正在标记…" });

    api.request({
      url: "/api/portal/manager/actions?action=checkin",
      method: "POST",
      data: { bookingId: Number(bookingId), status: status },
      success: function(res) {
        wx.hideLoading();
        that.setData({ checkinSubmitting: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({ title: res.data.message || "已处理", icon: "none" });
          // 名单、工作台、会员详情三处都可能受影响，一起刷
          that.fetchBookings(that.data.selectedBookingDate);
          that.loadDashboard();
          if (that.data.currentView === "memberDetail" && that.data.currentDetailMemberId) {
            that.fetchMemberDetail(that.data.currentDetailMemberId);
          }
        } else {
          wx.showModal({
            title: "没签上",
            content: (res.data && res.data.error) || "签到失败，请重试",
            showCancel: false,
            confirmText: "知道了"
          });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ checkinSubmitting: false });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      }
    });
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
            confirmText: "知道了",
            success: function() { wx.switchTab({ url: "/pages/stars/stars" }); }
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
              rooms: res.data.rooms || [],
              cardTypes: res.data.cardTypes || []
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

  decCapacity: function() {
    var cur = Number(this.data.newSessionCapacity) || 6;
    if (cur > 1) {
      this.setData({ newSessionCapacity: cur - 1 });
    }
  },

  incCapacity: function() {
    var cur = Number(this.data.newSessionCapacity) || 6;
    var room = this.data.sessionOptions.rooms[this.data.newSessionRoomIndex];
    var max = (room && room.capacity) ? Number(room.capacity) : 20;
    if (cur < max) {
      this.setData({ newSessionCapacity: cur + 1 });
    } else {
      wx.showToast({ title: "已达教室上限 " + max + " 人", icon: "none" });
    }
  },

  setCapacityPreset: function(e) {
    var cap = Number(e.currentTarget.dataset.cap) || 6;
    var room = this.data.sessionOptions.rooms[this.data.newSessionRoomIndex];
    if (room && room.capacity && cap > Number(room.capacity)) {
      wx.showToast({ title: "超过当前教室上限 (" + room.capacity + "人)", icon: "none" });
      return;
    }
    this.setData({ newSessionCapacity: cap });
  },

  startEditSession: function(e) {
    var item = e.currentTarget.dataset.item;
    var opts = this.data.sessionOptions;
    var courseIdx = 0;
    var coachIdx = 0;
    var roomIdx = 0;

    for (var i = 0; i < opts.courses.length; i++) {
      if (opts.courses[i].name === item.course_name) { courseIdx = i; break; }
    }
    for (var j = 0; j < opts.coaches.length; j++) {
      if (opts.coaches[j].name === item.coach_name) { coachIdx = j; break; }
    }
    for (var k = 0; k < opts.rooms.length; k++) {
      if (opts.rooms[k].name === item.room_name) { roomIdx = k; break; }
    }

    this.setData({
      showScheduleForm: true,
      editingSessionId: item.id,
      newSessionDate: item.session_date,
      newSessionCourseIndex: courseIdx,
      newSessionCoachIndex: coachIdx,
      newSessionRoomIndex: roomIdx,
      newSessionStartTime: item.start_time,
      newSessionEndTime: item.end_time,
      newSessionCapacity: Number(item.capacity) || 6
    });

    wx.pageScrollTo({ scrollTop: 0, duration: 250 });
  },

  cancelEditSession: function() {
    this.setData({ editingSessionId: 0 });
  },

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

    var isEdit = this.data.editingSessionId > 0;
    var action = isEdit ? "update_session" : "create_session";

    this.setData({ submittingSession: true });
    wx.showLoading({ title: isEdit ? "正在保存修改…" : "正在发布排课…" });

    api.request({
      url: "/api/portal/manager/actions?action=" + action,
      method: "POST",
      data: {
        sessionId: this.data.editingSessionId,
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
          wx.showToast({ title: isEdit ? "场次已更新" : "排课发布成功", icon: "success" });
          that.setData({ editingSessionId: 0 });
          that.fetchScheduleSessions(that.data.newSessionDate);
          that.loadDashboard();
        } else {
          var err = (res.data && res.data.error) || (isEdit ? "更新失败" : "排课发布失败");
          wx.showModal({
            title: isEdit ? "场次修改提醒" : "排课冲突提醒",
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

  openCreateCourse: function() {
    this.setData({
      editingCourse: {
        id: 0,
        name: "",
        categoryType: "boutique",
        difficultyStars: 3,
        description: ""
      }
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 250 });
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
    wx.pageScrollTo({ scrollTop: 0, duration: 250 });
  },

  cancelEditCourse: function() {
    this.setData({
      editingCourse: { id: -1, name: "", categoryType: "boutique", difficultyStars: 3, description: "" }
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

    var isNew = c.id === 0;
    var action = isNew ? "create_course" : "update_course";

    this.setData({ submittingCourse: true });
    wx.showLoading({ title: isNew ? "正在创建课程…" : "正在同步修改…" });

    api.request({
      url: "/api/portal/manager/actions?action=" + action,
      method: "POST",
      data: c,
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingCourse: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({ title: isNew ? "课程创建成功" : "已同步更新", icon: "success" });
          that.cancelEditCourse();
          that.fetchCourses();
          that.loadSessionOptions();
        } else {
          var err = (res.data && res.data.error) || (isNew ? "创建失败" : "修改失败");
          wx.showToast({ title: err, icon: "none" });
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
          var createdMem = res.data.member;
          wx.showModal({
            title: "录入成功",
            content: "会员【" + name + "】已建档并开通约课通道！\n\n专属邀请码：" + portalCode + "\n登录验证码：" + loginPin + "\n\n是否立即为该学员办理发卡？",
            showCancel: true,
            cancelText: "稍后发卡",
            confirmText: "立即发卡",
            success: function(sm) {
              that.setData({
                showNewMemberCard: false,
                newMemberName: "",
                newMemberPhone: ""
              });
              that.fetchMembers();
              that.loadDashboard();
              if (sm.confirm && createdMem) {
                that.openIssueCardWithMember(createdMem);
              }
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

  // 现场发卡逻辑 (Issue Card)
  openIssueCard: function(e) {
    var member = e.currentTarget.dataset.item;
    this.openIssueCardWithMember(member);
  },

  openIssueCardWithMember: function(member) {
    var cardTypes = this.data.sessionOptions.cardTypes || [];
    var defaultTotal = (cardTypes[0] && cardTypes[0].total_count) ? String(cardTypes[0].total_count) : "10";
    this.setData({
      showIssueCardModal: true,
      selectedIssueMember: member,
      selectedIssueCardTypeIndex: 0,
      customIssueCount: defaultTotal
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 250 });
  },

  closeIssueCard: function() {
    this.setData({
      showIssueCardModal: false,
      selectedIssueMember: null
    });
  },

  onIssueCardTypeChange: function(e) {
    var idx = Number(e.detail.value);
    var cardTypes = this.data.sessionOptions.cardTypes || [];
    var ct = cardTypes[idx];
    this.setData({
      selectedIssueCardTypeIndex: idx,
      customIssueCount: ct && ct.total_count ? String(ct.total_count) : ""
    });
  },

  onCustomIssueCountInput: function(e) {
    this.setData({ customIssueCount: e.detail.value });
  },

  submitIssueCard: function() {
    var that = this;
    var member = this.data.selectedIssueMember;
    var cardTypes = this.data.sessionOptions.cardTypes || [];
    var ct = cardTypes[this.data.selectedIssueCardTypeIndex];

    if (!member) { wx.showToast({ title: "未指定学员", icon: "none" }); return; }
    if (!ct) { wx.showToast({ title: "请选择会员卡类型", icon: "none" }); return; }

    this.setData({ submittingIssueCard: true });
    wx.showLoading({ title: "正在开卡…" });

    api.request({
      url: "/api/portal/manager/actions?action=issue_card",
      method: "POST",
      data: {
        memberId: member.id,
        cardTypeId: ct.id,
        customCount: this.data.customIssueCount ? Number(this.data.customIssueCount) : null
      },
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingIssueCard: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showModal({
            title: "开卡成功",
            content: res.data.message || ("已为【" + member.name + "】开通【" + ct.name + "】"),
            showCancel: false,
            confirmText: "好的",
            success: function() {
              that.closeIssueCard();
              that.fetchMembers();
              that.loadDashboard();
              // 从会员详情页开的卡，开完要立刻看到新卡，否则还得退出去再点进来
              if (that.data.currentView === "memberDetail" && that.data.currentDetailMemberId) {
                that.fetchMemberDetail(that.data.currentDetailMemberId);
              }
            }
          });
        } else {
          var err = (res.data && res.data.error) || "开卡失败";
          wx.showModal({ title: "开卡提示", content: err, showCancel: false });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingIssueCard: false });
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

  onCardTabChange: function(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ cardTab: tab });
    if (tab === "types" && this.data.cardTypesList.length === 0) {
      this.fetchCardTypes();
    }
  },

  fetchCardTypes: function(done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingCardTypes: true });

    api.request({
      url: "/api/portal/manager/actions?action=card_types",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ cardTypesList: res.data.cardTypes || [], loadingCardTypes: false });
        } else {
          that.setData({ loadingCardTypes: false });
        }
      },
      fail: function() {
        that.setData({ loadingCardTypes: false });
      },
      complete: cb
    });
  },

  openNewCardTypeForm: function() {
    this.setData({
      showNewCardTypeForm: true,
      newCardTypeName: "",
      newCardTypeCategory: "count",
      newCardTypeCount: 10,
      newCardTypeDays: 90,
      newCardTypePrice: ""
    });
  },

  closeNewCardTypeForm: function() {
    this.setData({ showNewCardTypeForm: false });
  },

  onCardTypeCategoryChange: function(e) {
    this.setData({ newCardTypeCategory: e.currentTarget.dataset.cat });
  },

  onNewCardTypeNameInput: function(e) {
    this.setData({ newCardTypeName: e.detail.value });
  },

  onNewCardTypeCountInput: function(e) {
    this.setData({ newCardTypeCount: Number(e.detail.value) || 1 });
  },

  onNewCardTypeDaysInput: function(e) {
    this.setData({ newCardTypeDays: Number(e.detail.value) || 1 });
  },

  onNewCardTypePriceInput: function(e) {
    this.setData({ newCardTypePrice: e.detail.value });
  },

  submitCreateCardType: function() {
    var that = this;
    if (!this.data.newCardTypeName.trim()) {
      wx.showToast({ title: "请输入卡种名称", icon: "none" });
      return;
    }
    this.setData({ submittingCardType: true });
    wx.showLoading({ title: "正在创建卡种…" });

    api.request({
      url: "/api/portal/manager/actions?action=create_card_type",
      method: "POST",
      data: {
        name: this.data.newCardTypeName.trim(),
        category: this.data.newCardTypeCategory,
        totalCount: this.data.newCardTypeCount,
        validityDays: this.data.newCardTypeDays,
        price: Number(this.data.newCardTypePrice) || 0
      },
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingCardType: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({ title: "卡种创建成功", icon: "success" });
          that.closeNewCardTypeForm();
          that.fetchCardTypes();
          that.loadSessionOptions();
        } else {
          var err = (res.data && res.data.error) || "创建失败";
          wx.showModal({ title: "创建提示", content: err, showCancel: false });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingCardType: false });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      }
    });
  },

  toggleCardTypeStatus: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var currentActive = e.currentTarget.dataset.active;
    var nextActive = currentActive ? 0 : 1;
    var name = e.currentTarget.dataset.name;

    wx.showModal({
      title: "卡种状态调整",
      content: "确认要" + (nextActive ? "重新启用" : "停用") + "卡种【" + name + "】吗？" + (nextActive ? "" : "停用后前台开卡不再展示该卡种。"),
      confirmText: nextActive ? "启用" : "停用",
      confirmColor: nextActive ? "#16794A" : "#B92E32",
      success: function(m) {
        if (!m.confirm) return;
        wx.showLoading({ title: "正在更新…" });
        api.request({
          url: "/api/portal/manager/actions?action=toggle_card_type",
          method: "POST",
          data: { id: id, isActive: nextActive },
          success: function(res) {
            wx.hideLoading();
            if (res.statusCode === 200 && res.data && res.data.success) {
              wx.showToast({ title: res.data.message || "更新成功", icon: "success" });
              that.fetchCardTypes();
              that.loadSessionOptions();
            } else {
              wx.showToast({ title: (res.data && res.data.error) || "操作失败", icon: "none" });
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

  doReturnCard: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var member = e.currentTarget.dataset.member;
    var cardName = e.currentTarget.dataset.card;

    wx.showModal({
      title: "办理退卡/停卡",
      content: "确定要为【" + member + "】办理卡项【" + cardName + "】的退卡/停用吗？\n办理后该卡将立即置为失效状态并记录退卡流水。",
      confirmText: "确认退卡",
      confirmColor: "#B92E32",
      success: function(m) {
        if (!m.confirm) return;
        wx.showLoading({ title: "正在办理…" });
        api.request({
          url: "/api/portal/manager/actions?action=return_card",
          method: "POST",
          data: { cardId: id, reason: "管家端现场办理退卡" },
          success: function(res) {
            wx.hideLoading();
            if (res.statusCode === 200 && res.data && res.data.success) {
              wx.showToast({ title: "退卡办理成功", icon: "success" });
              that.fetchCards();
              that.loadDashboard();
            } else {
              wx.showModal({ title: "办理失败", content: (res.data && res.data.error) || "未知错误", showCancel: false });
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

  openNewRoomForm: function() {
    this.setData({ showNewRoomForm: true, newRoomName: "", newRoomCapacity: 6 });
  },

  closeNewRoomForm: function() {
    this.setData({ showNewRoomForm: false });
  },

  onNewRoomNameInput: function(e) {
    this.setData({ newRoomName: e.detail.value });
  },

  onNewRoomCapacityInput: function(e) {
    this.setData({ newRoomCapacity: Number(e.detail.value) || 1 });
  },

  submitCreateRoom: function() {
    var that = this;
    if (!this.data.newRoomName.trim()) {
      wx.showToast({ title: "请输入教室名称", icon: "none" });
      return;
    }
    this.setData({ submittingRoom: true });
    wx.showLoading({ title: "正在添加教室…" });

    api.request({
      url: "/api/portal/manager/actions?action=create_room",
      method: "POST",
      data: {
        name: this.data.newRoomName.trim(),
        capacity: this.data.newRoomCapacity
      },
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingRoom: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({ title: "教室添加成功", icon: "success" });
          that.closeNewRoomForm();
          that.fetchVenue();
          that.loadSessionOptions();
        } else {
          wx.showModal({ title: "添加提示", content: (res.data && res.data.error) || "添加失败", showCancel: false });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingRoom: false });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      }
    });
  },

  // ════════════════════════════════════════════════════════════
  // 6.5. 教练导师团队逻辑 (Coaches)
  // ════════════════════════════════════════════════════════════
  fetchCoaches: function(done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingCoaches: true, errorCoaches: "" });

    api.request({
      url: "/api/portal/manager/actions?action=coaches",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ coachesList: res.data.coaches || [], loadingCoaches: false, errorCoaches: "" });
        } else {
          that.setData({ loadingCoaches: false, errorCoaches: "获取教练列表失败" });
        }
      },
      fail: function() {
        that.setData({ loadingCoaches: false, errorCoaches: "网络连接失败" });
      },
      complete: cb
    });
  },

  openNewCoachForm: function() {
    this.setData({ showNewCoachForm: true, newCoachName: "", newCoachTitle: "资深塑形教练" });
  },

  closeNewCoachForm: function() {
    this.setData({ showNewCoachForm: false });
  },

  onNewCoachNameInput: function(e) {
    this.setData({ newCoachName: e.detail.value });
  },

  onNewCoachTitleInput: function(e) {
    this.setData({ newCoachTitle: e.detail.value });
  },

  submitCreateCoach: function() {
    var that = this;
    if (!this.data.newCoachName.trim()) {
      wx.showToast({ title: "请输入教练姓名", icon: "none" });
      return;
    }
    this.setData({ submittingCoach: true });
    wx.showLoading({ title: "正在添加导师…" });

    api.request({
      url: "/api/portal/manager/actions?action=create_coach",
      method: "POST",
      data: {
        name: this.data.newCoachName.trim(),
        roleTitle: this.data.newCoachTitle.trim()
      },
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingCoach: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({ title: "教练添加成功", icon: "success" });
          that.closeNewCoachForm();
          that.fetchCoaches();
          that.loadSessionOptions();
        } else {
          wx.showModal({ title: "添加提示", content: (res.data && res.data.error) || "添加失败", showCancel: false });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingCoach: false });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      }
    });
  },

  toggleCoachStatus: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var currentStatus = e.currentTarget.dataset.status;
    var nextStatus = currentStatus === "active" ? "inactive" : "active";
    var name = e.currentTarget.dataset.name;

    wx.showModal({
      title: "教练状态管理",
      content: "确认要" + (nextStatus === "active" ? "重新启用" : "停用") + "教练【" + name + "】吗？",
      confirmText: nextStatus === "active" ? "启用" : "停用",
      confirmColor: nextStatus === "active" ? "#16794A" : "#B92E32",
      success: function(m) {
        if (!m.confirm) return;
        wx.showLoading({ title: "正在更新…" });
        api.request({
          url: "/api/portal/manager/actions?action=toggle_coach",
          method: "POST",
          data: { id: id, status: nextStatus },
          success: function(res) {
            wx.hideLoading();
            if (res.statusCode === 200 && res.data && res.data.success) {
              wx.showToast({ title: res.data.message || "更新成功", icon: "success" });
              that.fetchCoaches();
              that.loadSessionOptions();
            } else {
              wx.showToast({ title: (res.data && res.data.error) || "操作失败", icon: "none" });
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
  // 6.7. 管理员与系统权限 (Admins)
  // ════════════════════════════════════════════════════════════
  fetchAdmins: function(done) {
    var that = this;
    var cb = typeof done === "function" ? done : function() {};
    this.setData({ loadingAdmins: true });

    api.request({
      url: "/api/portal/manager/actions?action=admins",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({ adminsList: res.data.admins || [], loadingAdmins: false });
        } else {
          that.setData({ loadingAdmins: false });
        }
      },
      fail: function() {
        that.setData({ loadingAdmins: false });
      },
      complete: cb
    });
  },

  // ════════════════════════════════════════════════════════════
  // 6.8. 代客约课业务逻辑 (Book For Member)
  // ════════════════════════════════════════════════════════════
  openBookForMember: function(e) {
    var session = e.currentTarget.dataset.session;
    var list = this.data.membersList;
    this.setData({
      showBookForMemberModal: true,
      bookForMemberSession: session,
      bookForMemberKeyword: "",
      selectedBookMember: null,
      bookForMemberCandidates: list && list.length > 0 ? list.slice(0, 10) : []
    });
    if (!list || list.length === 0) {
      this.fetchMembers();
    }
  },

  closeBookForMember: function() {
    this.setData({
      showBookForMemberModal: false,
      bookForMemberSession: null,
      selectedBookMember: null
    });
  },

  onBookForMemberSearch: function(e) {
    var kw = String(e.detail.value || "").trim().toLowerCase();
    this.setData({ bookForMemberKeyword: kw });
    if (!kw) {
      this.setData({ bookForMemberCandidates: this.data.membersList.slice(0, 10) });
      return;
    }
    var filtered = this.data.membersList.filter(function(m) {
      return (m.name && m.name.toLowerCase().indexOf(kw) >= 0) ||
             (m.phone && m.phone.indexOf(kw) >= 0) ||
             (m.code && m.code.toLowerCase().indexOf(kw) >= 0);
    });
    this.setData({ bookForMemberCandidates: filtered.slice(0, 15) });
  },

  selectBookMember: function(e) {
    var m = e.currentTarget.dataset.member;
    this.setData({ selectedBookMember: m });
  },

  submitBookForMember: function() {
    var that = this;
    var session = this.data.bookForMemberSession;
    var member = this.data.selectedBookMember;
    if (!session || !member) {
      wx.showToast({ title: "请先选择学员", icon: "none" });
      return;
    }
    this.setData({ submittingBookForMember: true });
    wx.showLoading({ title: "正在办理代约…" });

    api.request({
      url: "/api/portal/manager/actions?action=book_for_member",
      method: "POST",
      data: {
        sessionId: session.id,
        memberId: member.id
      },
      success: function(res) {
        wx.hideLoading();
        that.setData({ submittingBookForMember: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showModal({
            title: "代约成功",
            content: res.data.message || ("已成功为【" + member.name + "】代约本课程"),
            showCancel: false,
            success: function() {
              that.closeBookForMember();
              that.fetchBookings(that.data.selectedBookingDate);
              that.loadDashboard();
            }
          });
        } else {
          var err = (res.data && res.data.error) || "代客约课失败";
          wx.showModal({ title: "约课提示", content: err, showCancel: false });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.setData({ submittingBookForMember: false });
        wx.showToast({ title: "网络连接失败", icon: "none" });
      }
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
