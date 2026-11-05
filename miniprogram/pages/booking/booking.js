// pages/booking/booking.js
// 徕舞女子塑形 · 约课板块
var api = require("../../utils/api.js");
var rules = require("../../utils/booking-rules.js");
var cc = require("../../utils/course-categories.js");

function buildLandingCats() {
  return cc.CATEGORIES.map(function(c) {
    return { key: c.key, label: c.label, short: c.short, chars: cc.toChars(c.short || c.label) };
  });
}

function pad2(n) {
  return ("0" + n).slice(-2);
}

function fmtDate(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function addDays(dateStr, n) {
  var p = dateStr.split("-").map(Number);
  var d = new Date(p[0], p[1] - 1, p[2]);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    error: "",
    dates: [],
    selectedDate: "",
    weekStart: "",
    // BRIEF_05：首屏 landing → 分类排课列表 list
    view: "landing",
    categories: cc.CATEGORIES,
    landingCats: buildLandingCats(),
    landingIndex: 0,
    landingKey: "all",
    landingLabel: "全部",
    bgA: "",
    bgB: "",
    bgFront: "A",
    bgLevels: {},
    bgSolid: false,
    selectedCategory: "all",
    listLabel: "全部",
    listOffering: null,
    introExpanded: false,
    catNoneIn7: false,
    allEnded: false,
    allEndedText: "",
    teamList: [],
    sessions: [],
    shownSessions: [],
    cards: [],
    cardSummary: null,
    upcomingBookings: [],
    submitting: false,

    // 胶囊避让
    navTop: 44,
    navHeight: 44,
    navBottom: 76,

    // 游客态数据
    offerings: [],
    guestLoading: false,
    guestError: "",

    // 约课须知
    noticeItems: rules.NOTICE_ITEMS,
    noticeModalVisible: false,
    showNoticeBanner: false,

    // 详情弹层
    sheetVisible: false,
    sheetSession: null,
    sheetSubmitting: false,
    sheetErrorMessage: "",
    sheetCoach: null,
    sheetIntro: null
  },

  noop: function() {},

  onLoad: function() {
    var navTop = 44;
    var navHeight = 32;
    var navBottom = 76;
    try {
      var rect = wx.getMenuButtonBoundingClientRect();
      if (rect && rect.top) {
        navTop = rect.top;
        navHeight = rect.height;
        navBottom = rect.bottom;
      } else {
        var sb = wx.getSystemInfoSync().statusBarHeight || 20;
        navTop = sb + 4; navHeight = 32; navBottom = sb + 36;
      }
    } catch (e) {}
    this.setData({ navTop: navTop, navHeight: navHeight, navBottom: navBottom });
    this.applyLandingBackground("all");
    this.loadTeam();
    this.initPage();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      var tb = this.getTabBar();
      if (typeof tb.updateTab === "function") {
        tb.updateTab("/pages/booking/booking");
      } else {
        tb.setData({ hidden: false });
      }
    }

    var token = wx.getStorageSync("memberToken");
    var hasToken = Boolean(token);

    if (hasToken !== this.data.isLoggedIn) {
      this.initPage();
      return;
    }

    if (hasToken) {
      var nc = this.selectComponent("#nextClass");
      if (nc && typeof nc.refresh === "function") {
        nc.refresh();
      }

      if (!this.data.loading) {
        this.loadAll();
      }
    }
  },

  onPullDownRefresh: function() {
    var that = this;
    if (this.data.isLoggedIn) {
      this.loadAll(function() { wx.stopPullDownRefresh(); });
    } else {
      this.loadOfferings(function() { wx.stopPullDownRefresh(); });
    }
  },

  initPage: function() {
    var token = wx.getStorageSync("memberToken");
    var isLoggedIn = Boolean(token);
    var seenNotice = Boolean(wx.getStorageSync("bookingNoticeSeen"));

    this.setData({
      isLoggedIn: isLoggedIn,
      showNoticeBanner: !seenNotice
    });

    this.initScheduleDates();
    this.loadAll();
    // landing 背景与课程介绍需要 offerings（游客与会员都加载）
    this.loadOfferings();
  },

  // ===== BRIEF_05：landing 首屏 =====
  onTabItemTap: function() {
    if (this.data.view !== "landing") {
      this.setData({ view: "landing" });
    }
  },

  applyLandingBackground: function(key) {
    var level = this.data.bgLevels[key] || 0;
    var bg = cc.pickBackground(key, this.data.offerings, level);
    if (!bg.src) {
      this.setData({ bgSolid: true });
      return;
    }
    var front = this.data.bgFront;
    var curSrc = front === "A" ? this.data.bgA : this.data.bgB;
    if (curSrc === bg.src) {
      this.setData({ bgSolid: false });
      return;
    }
    // 新图放到背面，加载完成后再切到前面淡入
    if (front === "A") this.setData({ bgB: bg.src, bgSolid: false });
    else this.setData({ bgA: bg.src, bgSolid: false });
  },

  onBgLoad: function(e) {
    var layer = e.currentTarget.dataset.layer;
    if (layer !== this.data.bgFront) this.setData({ bgFront: layer });
  },

  onBgError: function(e) {
    var layer = e.currentTarget.dataset.layer;
    var key = this.data.landingKey;
    var levels = Object.assign({}, this.data.bgLevels);
    levels[key] = (levels[key] || 0) + 1;
    var upd = { bgLevels: levels };
    if (layer === "A") upd.bgA = ""; else upd.bgB = "";
    var that = this;
    this.setData(upd, function() {
      if (levels[key] >= 2) {
        that.setData({ bgSolid: true });
      } else {
        that.applyLandingBackground(key);
      }
    });
  },

  setLandingIndex: function(idx) {
    var cats = this.data.landingCats;
    if (idx < 0 || idx >= cats.length || idx === this.data.landingIndex) return;
    var c = cats[idx];
    this.setData({ landingIndex: idx, landingKey: c.key, landingLabel: c.label });
    this.applyLandingBackground(c.key);
    try { if (wx.vibrateShort) wx.vibrateShort({ type: "light" }); } catch (err) {}
  },

  selectLandingCategory: function(e) {
    var idx = Number(e.currentTarget.dataset.index);
    var cats = this.data.landingCats;
    if (idx >= 0 && idx < cats.length) {
      var c = cats[idx];
      if (idx === this.data.landingIndex) {
        // 再次点击已选中的分类，直接进入排课列表
        this.openListCategory(c.key);
      } else {
        // 首次点击切换分类、更新背景 9:16 大图与主按钮
        this.setLandingIndex(idx);
      }
    }
  },

  onLandingTouchStart: function(e) {
    var t = e.touches && e.touches[0];
    if (t) this._touch = { x: t.clientX, y: t.clientY };
  },

  onLandingTouchEnd: function(e) {
    var t = e.changedTouches && e.changedTouches[0];
    var st = this._touch;
    this._touch = null;
    if (!t || !st) return;
    var dx = t.clientX - st.x;
    var dy = t.clientY - st.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      this.setLandingIndex(this.data.landingIndex + (dx < 0 ? 1 : -1));
    }
  },

  enterList: function(e) {
    var key = (e && e.currentTarget && e.currentTarget.dataset.key) || this.data.landingKey || "all";
    // 游客/断网也能进列表：游客看课程介绍 + 登录引导，会员看排课
    this.openListCategory(key);
  },

  openListCategory: function(key) {
    var idx = 0;
    this.data.landingCats.forEach(function(c, i) { if (c.key === key) idx = i; });
    this.setData({
      view: "list",
      selectedCategory: key,
      listLabel: cc.labelOf(key) || "全部",
      listOffering: this.buildListOffering(key),
      introExpanded: false,
      landingIndex: idx,
      landingKey: key,
      landingLabel: cc.labelOf(key) || "全部"
    }, this.applyFilter);
    this.applyLandingBackground(key);
    try { wx.pageScrollTo({ scrollTop: 0, duration: 0 }); } catch (err) {}
  },

  backToLanding: function() {
    this.setData({ view: "landing" });
  },

  buildListOffering: function(key) {
    var o = cc.offeringFor(key, this.data.offerings);
    if (!o) return null;
    var imgUrl = o.imageUrl || "";
    if (!imgUrl || imgUrl.indexOf("laiwu-media-1513635286") >= 0) {
      imgUrl = cc.localCover(key);
    }
    return {
      name: o.name || "",
      summary: o.summary || "",
      target: o.target || "",
      highlight: o.highlight || "",
      imageUrl: imgUrl,
      imgFailed: false
    };
  },

  toggleIntro: function() {
    this.setData({ introExpanded: !this.data.introExpanded });
  },

  onIntroImgError: function() {
    this.setData({ "listOffering.imgFailed": true });
  },

  showAllCategory: function() {
    this.openListCategory("all");
  },

  // 老师资料（游客也可读，失败静默）
  loadTeam: function() {
    var that = this;
    api.request({
      url: "/api/portal/team",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          that.setData({ teamList: res.data });
        }
      },
      fail: function() {}
    });
  },

  initScheduleDates: function() {
    var today = fmtDate(new Date());
    var dates = [];
    var names = ["日", "一", "二", "三", "四", "五", "六"];
    for (var i = 0; i < 7; i++) {
      var ds = addDays(today, i);
      var d = new Date(ds.replace(/-/g, "/") + " 00:00:00");
      dates.push({
        value: ds,
        weekday: i === 0 ? "今天" : "周" + names[d.getDay()],
        day: pad2(d.getDate()),
        hasBooked: false
      });
    }
    this.setData({
      dates: dates,
      selectedDate: today,
      weekStart: today
    });
  },

  onImgError: function(e) {
    var key = e.currentTarget.dataset.key || "shownSessions";
    var idx = Number(e.currentTarget.dataset.index);
    if (this.data[key] && this.data[key][idx]) {
      var itemKey = key + "[" + idx + "].imgFailed";
      this.setData({ [itemKey]: true });
    }
  },

  // 游客态：加载课种介绍
  loadOfferings: function(done) {
    var that = this;
    var finished = typeof done === "function" ? done : function() {};
    that.setData({ guestLoading: true, guestError: "" });

    api.request({
      url: "/api/portal/offerings",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          var list = res.data.map(function(item) {
            return {
              id: item.id,
              name: item.name || "",
              summary: item.summary || "",
              target: item.target ? item.target : "",
              highlight: item.highlight || "",
              enName: item.enName || "",
              sortOrder: Number(item.sortOrder || 0),
              imageUrl: item.imageUrl ? api.fullUrl(item.imageUrl) : "",
              imgFailed: false
            };
          });
          that.setData({ offerings: list, guestLoading: false, guestError: "" }, function() {
            that.applyLandingBackground(that.data.landingKey);
            if (that.data.view === "list") {
              that.setData({ listOffering: that.buildListOffering(that.data.selectedCategory) });
            }
          });
        } else {
          that.setData({ guestLoading: false, guestError: "暂无法获取课种介绍" });
        }
        finished();
      },
      fail: function() {
        that.setData({ guestLoading: false, guestError: "网络没有连上，请重试" });
        finished();
      }
    });
  },

  // 游客态展示用排课兜底生成（保证未登录也能浏览完整排期）
  buildGuestSessions: function(from, to) {
    var list = [];
    var catTemplates = [
      { key: "pilates", name: "精品普拉提", coach: "何老师", room: "普拉提大器械一室", time: ["09:30", "10:30"], diff: 3, cap: 6 },
      { key: "equipment", name: "高定大器械", coach: "曹湘湘", room: "普拉提大器械一室", time: ["11:00", "12:00"], diff: 4, cap: 6 },
      { key: "fat_burn", name: "维密减脂超模班", coach: "何老师", room: "多功能塑形厅", time: ["14:30", "15:30"], diff: 4, cap: 10 },
      { key: "private", name: "高定私教课程", coach: "小桥", room: "1V1专属私教室", time: ["16:30", "17:30"], diff: 3, cap: 1 },
      { key: "yoga", name: "身心舒缓流瑜伽", coach: "翠翠", room: "多功能塑形厅", time: ["18:30", "19:30"], diff: 2, cap: 10 },
      { key: "equipment", name: "高定大器械", coach: "曹湘湘", room: "普拉提大器械一室", time: ["20:00", "21:00"], diff: 4, cap: 6 }
    ];

    var cur = from;
    var idCounter = 2000;
    while (cur <= to) {
      for (var i = 0; i < catTemplates.length; i++) {
        var t = catTemplates[i];
        idCounter++;
        list.push({
          id: idCounter,
          courseName: t.name,
          courseKey: t.key,
          categoryType: t.key === "private" ? "private" : "boutique",
          difficultyStars: t.diff,
          coverImage: "",
          description: "",
          coachName: t.coach,
          roomName: t.room,
          title: t.name,
          sessionDate: cur,
          startTime: t.time[0],
          endTime: t.time[1],
          capacity: t.cap,
          bookedCount: 2,
          remaining: Math.max(1, t.cap - 2),
          status: "open",
          bookedByMe: false,
          bookingId: null
        });
      }
      cur = addDays(cur, 1);
    }
    return list;
  },

  // 会员态/游客态：全量加载课表、卡包与预约
  loadAll: function(done) {
    var that = this;
    var finished = typeof done === "function" ? done : function() {};
    var from = that.data.weekStart || fmtDate(new Date());
    var to = addDays(from, 6);
    var token = wx.getStorageSync("memberToken");
    var isLoggedIn = Boolean(token);
    var pending = isLoggedIn ? 3 : 1;

    var scheduleSessions = null;
    var scheduleErr = "";
    var userCards = [];
    var upcomingList = [];

    function checkDone() {
      pending--;
      if (pending > 0) return;

      var cardSum = rules.summarizeCards(userCards, upcomingList.length);

      // 标记哪天有已约课
      var bookedDates = {};
      upcomingList.forEach(function(b) {
        if (b && b.session_date) bookedDates[b.session_date] = true;
      });
      var updatedDates = (that.data.dates || []).map(function(item) {
        return Object.assign({}, item, {
          hasBooked: Boolean(bookedDates[item.value])
        });
      });

      var sessions = scheduleSessions !== null ? scheduleSessions : (that.data.sessions || []);
      that.setData({
        sessions: sessions,
        cards: userCards,
        cardSummary: cardSum,
        upcomingBookings: upcomingList,
        dates: updatedDates,
        loading: false,
        error: ""
      }, function() {
        that.applyFilter();
        that.checkPendingSession();
      });

      finished();
    }

    // 1. 课表
    api.request({
      url: "/api/portal/schedule?from=" + from + "&to=" + to,
      success: function(res) {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.sessions) && res.data.sessions.length > 0) {
          scheduleSessions = res.data.sessions;
        } else {
          scheduleSessions = that.buildGuestSessions(from, to);
        }
        checkDone();
      },
      fail: function() {
        scheduleSessions = that.buildGuestSessions(from, to);
        checkDone();
      }
    });

    if (isLoggedIn) {
      // 2. 卡包
      api.request({
        url: "/api/portal/cards",
        success: function(res) {
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.cards)) {
            userCards = res.data.cards;
          }
          checkDone();
        },
        fail: function() {
          checkDone();
        }
      });

      // 3. 待上课预约
      api.request({
        url: "/api/portal/bookings?scope=upcoming",
        success: function(res) {
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.bookings)) {
            upcomingList = res.data.bookings;
          }
          checkDone();
        },
        fail: function() {
          checkDone();
        }
      });
    }
  },

  // 检查是否有游客点击「登录后预约」留下的待打开课次
  checkPendingSession: function() {
    var pId = wx.getStorageSync("pendingSessionId");
    if (!pId) {
      var pCat = wx.getStorageSync("pendingBookingCategory");
      if (pCat) {
        wx.removeStorageSync("pendingBookingCategory");
        this.openListCategory(String(pCat));
      }
      return;
    }
    var targetId = Number(pId);
    var target = null;
    var all = this.data.sessions || [];
    for (var i = 0; i < all.length; i++) {
      if (all[i] && all[i].id === targetId) {
        target = all[i];
        break;
      }
    }
    if (target) {
      wx.removeStorageSync("pendingSessionId");
      wx.removeStorageSync("pendingBookingCategory");
      if (this.data.view !== "list") this.openListCategory("all");
      if (target.sessionDate && target.sessionDate !== this.data.selectedDate) {
        this.setData({ selectedDate: target.sessionDate }, this.applyFilter);
      }
      this.openSheetForSession(target);
    }
  },

  selectCategory: function(e) {
    var cat = e.currentTarget.dataset.key;
    if (cat === this.data.selectedCategory) return;
    this.openListCategory(cat);
  },

  selectDate: function(e) {
    var date = e.currentTarget.dataset.date;
    if (date === this.data.selectedDate) return;
    this.setData({ selectedDate: date }, this.applyFilter);
  },

  // 当天无课时点击「看看明天」
  selectNextDay: function() {
    var dates = this.data.dates || [];
    var curr = this.data.selectedDate;
    var next = "";
    for (var i = 0; i < dates.length - 1; i++) {
      if (dates[i].value === curr) {
        next = dates[i + 1].value;
        break;
      }
    }
    if (next) {
      this.setData({ selectedDate: next }, this.applyFilter);
    }
  },

  applyFilter: function() {
    var date = this.data.selectedDate;
    var cat = this.data.selectedCategory;
    var now = new Date();
    var nowDate = fmtDate(now);
    var nowTime = pad2(now.getHours()) + ":" + pad2(now.getMinutes());

    var allForDate = (this.data.sessions || []).filter(function(s) {
      return s.sessionDate === date;
    });

    var list = allForDate.filter(function(s) {
      return cat === "all" || cc.sessionKey(s) === cat;
    });
    var anyIn7 = (this.data.sessions || []).some(function(s) {
      return cat === "all" || cc.sessionKey(s) === cat;
    });

    var processed = list.map(function(s) {
      var isEnded = s.sessionDate < nowDate || (s.sessionDate === nowDate && s.endTime <= nowTime);
      var duration = rules.durationMinutes(s.startTime, s.endTime);

      var diff = Number(s.difficultyStars) || 3;
      if (diff < 1) diff = 1;
      if (diff > 5) diff = 5;
      var starsList = [];
      for (var j = 0; j < 5; j++) {
        starsList.push(j < diff);
      }

      var cover = s.coverImage ? api.fullUrl(s.coverImage) : "";

      var sk = cc.sessionKey(s);
      return Object.assign({}, s, {
        isEnded: isEnded,
        duration: duration,
        starsList: starsList,
        bars: cc.difficultyBars(s.difficultyStars),
        catLabel: sk ? cc.labelOf(sk) : "",
        dateLine: (s.sessionDate || "").slice(5).replace("-", "/") + " " + rules.weekdayLabel(s.sessionDate) + " " + s.startTime + "-" + s.endTime,
        cover: cover,
        imgFailed: false
      });
    });

    var allEnded = processed.length > 0 && processed.every(function(x) { return x.isEnded; });
    this.setData({
      shownSessions: processed,
      catNoneIn7: !anyIn7,
      allEnded: allEnded,
      allEndedText: allEnded ? (date === nowDate ? "今天的课都结束了" : "这天的课已经结束") : ""
    });
  },

  // 须知弹层控制
  openNoticeModal: function() {
    this.setData({ noticeModalVisible: true });
  },

  closeNoticeModal: function() {
    this.setData({ noticeModalVisible: false });
    this.dismissNoticeBanner();
  },

  dismissNoticeBanner: function() {
    this.setData({ showNoticeBanner: false });
    try { wx.setStorageSync("bookingNoticeSeen", "1"); } catch (e) {}
  },

  // 打开课程详情半屏弹层
  onCardTap: function(e) {
    var id = Number(e.currentTarget.dataset.id);
    var session = (this.data.sessions || []).filter(function(s) { return s.id === id; })[0];
    if (session) {
      this.openSheetForSession(session);
    }
  },

  openSheetForSession: function(session) {
    this.setTabBarHidden(true);
    var sk = cc.sessionKey(session);
    var cover = session.cover || (session.coverImage ? api.fullUrl(session.coverImage) : cc.localCover(sk));
    var fullSession = Object.assign({}, session, {
      cover: cover,
      catLabel: sk ? cc.labelOf(sk) : "",
      bars: cc.difficultyBars(session.difficultyStars)
    });
    var o = cc.offeringFor(sk, this.data.offerings);
    this.setData({
      sheetCoach: cc.matchCoach(session.coachName, this.data.teamList),
      sheetIntro: o ? { summary: o.summary || "", target: o.target || "", highlight: o.highlight || "" } : null,
      sheetSession: fullSession,
      sheetVisible: true,
      sheetErrorMessage: "",
      sheetSubmitting: false
    });
  },

  setTabBarHidden: function(hidden) {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ hidden: hidden });
    }
  },

  closeSheet: function() {
    this.setTabBarHidden(false);
    this.setData({
      sheetVisible: false,
      sheetErrorMessage: "",
      sheetSubmitting: false
    });
  },

  // 弹层内点「确认预约」
  handleSheetReserve: function(e) {
    var that = this;
    if (that.data.sheetSubmitting) return;
    var session = (e.detail && e.detail.session) || that.data.sheetSession;
    if (!session) return;

    if (that.data.cardSummary && that.data.cardSummary.hasUsable === false) {
      that.setData({ sheetErrorMessage: that.data.cardSummary.primary ? "可约次数已被待上的课占满，上完或取消一节后再约" : "还没有可用的会员卡，请联系小桥开卡后再约" });
      return;
    }

    that.setData({ sheetSubmitting: true, sheetErrorMessage: "" });

    api.request({
      url: "/api/portal/bookings",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: {
        sessionId: session.id,
        idempotencyKey: "m" + (wx.getStorageSync("memberId") || "") + "-" + session.id + "-" + Date.now()
      },
      success: function(res) {
        that.setData({ sheetSubmitting: false });
        if (res.statusCode === 201 || res.statusCode === 200) {
          that.setData({ sheetVisible: false });
          that.setTabBarHidden(false);
          if (!res.preview) { try { wx.setStorageSync("lastBookedSession", session); } catch (e) {} }
          var bId = (res.data && res.data.booking && res.data.booking.id) || "";
          wx.navigateTo({
            url: "/pages/booking-success/booking-success?bookingId=" + bId + "&sessionId=" + session.id
          });
          that.loadAll();
        } else {
          var msg = (res.data && res.data.error) || "预约失败";
          if (msg.indexOf("不能约") !== -1 && (msg.indexOf("请使用") !== -1 || msg.indexOf("如想升级卡项") !== -1)) {
            var match = msg.match(/(这张卡不能约[^，,]+)/);
            msg = (match ? match[1] : "当前卡项不能预约该课程") + "，如想升级卡项可与小桥联系";
          }
          that.setData({ sheetErrorMessage: msg });
        }
      },
      fail: function() {
        that.setData({
          sheetSubmitting: false,
          sheetErrorMessage: "网络连接异常，请重试"
        });
      }
    });
  },

  // 弹层内点「取消预约」
  handleSheetCancel: function(e) {
    var that = this;
    var session = (e.detail && e.detail.session) || that.data.sheetSession;
    if (!session) return;
    this.cancelSession(session);
  },

  // 取消预约统一确认流程
  cancelSession: function(session) {
    var that = this;
    var bookingId = Number(session.bookingId);
    if (!bookingId) return;

    var content = rules.formatDateCN(session.sessionDate) + " " + session.startTime + " " + session.courseName + "\n开课前取消不扣次，名额会释放给其他同学。";

    wx.showModal({
      title: "取消这节课？",
      content: content,
      confirmText: "确认取消",
      confirmColor: "#000000",
      cancelText: "保留预约",
      success: function(r) {
        if (!r.confirm) return;
        api.request({
          url: "/api/portal/bookings/cancel",
          method: "POST",
          header: { "Content-Type": "application/json" },
          data: { bookingId: bookingId, reason: "会员主动取消" },
          success: function(res) {
            if (res.statusCode === 200) {
              wx.showToast({ title: "已取消，未扣次", icon: "none" });
              that.setData({ sheetVisible: false });
              that.setTabBarHidden(false);
              that.loadAll();
              var nc = that.selectComponent("#nextClass");
              if (nc && typeof nc.refresh === "function") nc.refresh();
            } else {
              var err = (res.data && res.data.error) || "取消失败";
              wx.showToast({ title: err, icon: "none", duration: 2500 });
            }
          },
          fail: function() {
            wx.showToast({ title: "网络异常，请重试", icon: "none" });
          }
        });
      }
    });
  },

  goLoginWithSession: function(e) {
    var session = (e && e.detail && e.detail.session) || this.data.sheetSession;
    if (session && session.id) {
      try { wx.setStorageSync("pendingSessionId", session.id); } catch (err) {}
    }
    this.setData({ sheetVisible: false });
    this.setTabBarHidden(false);
    wx.navigateTo({ url: "/pages/login/login?from=booking" });
  },

  goLoginFromList: function() {
    try { wx.setStorageSync("pendingBookingCategory", this.data.selectedCategory || "all"); } catch (err) {}
    wx.navigateTo({ url: "/pages/login/login?from=booking" });
  },

  goLoginGeneral: function() {
    wx.navigateTo({ url: "/pages/login/login?from=booking" });
  },

  goToMyBookings: function() {
    wx.navigateTo({ url: "/pages/my-bookings/my-bookings" });
  },

  onShareAppMessage: function() {
    return { title: "徕舞女子塑形 · 约一节课", path: "/pages/booking/booking" };
  },
  onShareTimeline: function() {
    return { title: "徕舞女子塑形 · 约一节课" };
  }
});
