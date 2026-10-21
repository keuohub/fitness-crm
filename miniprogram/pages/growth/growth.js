var api = require("../../utils/api.js");
var format = require("../../utils/format.js");

function getStage(trainCount) {
  if (trainCount >= 51) return { name: "终生优雅", stage: "终生优雅", levelTitle: "身体掌权者 · 终生优雅" };
  if (trainCount >= 21) return { name: "身体掌权", stage: "身体掌权", levelTitle: "身体掌权者 · 深度蜕变" };
  if (trainCount >= 6)  return { name: "掌控新生", stage: "身体掌控", levelTitle: "身体掌控者 · 进阶自律" };
  return { name: "自律启程", stage: "自律启程", levelTitle: "身体掌权者 · 始于觉知" };
}

var WHISPERS = {
  "自律启程": {
    title: "把身体的掌控权，重新交还给自己",
    body: "生活总在向你索取配合与妥协，而在这里，每一次呼吸与发力，都是对自我最坚定的偏爱。"
  },
  "身体觉察者": {
    title: "把身体的掌控权，重新交还给自己",
    body: "生活总在向你索取配合与妥协，而在这里，每一次呼吸与发力，都是对自我最坚定的偏爱。"
  },
  "身体掌控": {
    title: "肌肉有了记忆，身姿自然挺拔松弛",
    body: "不再需要刻意挺胸收腹，核心与背部力量已成为你的内在支撑。曾经困扰你的肩颈紧绷，正悄悄变成从容与舒展。"
  },
  "身体掌控者": {
    title: "肌肉有了记忆，身姿自然挺拔松弛",
    body: "不再需要刻意挺胸收腹，核心与背部力量已成为你的内在支撑。曾经困扰你的肩颈紧绷，正悄悄变成从容与舒展。"
  },
  "身体掌权": {
    title: "在自律的时光里，你亲自重塑自己的线条",
    body: "20多次的坚持与汗水，雕刻出的不仅是紧致挺拔的体态，更是你在生活中从容不迫的底气。"
  },
  "身体掌权者": {
    title: "在自律的时光里，你亲自重塑自己的线条",
    body: "20多次的坚持与汗水，雕刻出的不仅是紧致挺拔的体态，更是你在生活中从容不迫的底气。"
  },
  "终生优雅": {
    title: "自律已成习惯，岁月对你只剩温柔偏爱",
    body: "你不再需要刻意坚持，因为挺拔与从容早已成为你的呼吸本能。坚持不易，这是你赠予自己最好的礼物。"
  },
  "终生优雅主义者": {
    title: "自律已成习惯，岁月对你只剩温柔偏爱",
    body: "你不再需要刻意坚持，因为挺拔与从容早已成为你的呼吸本能。坚持不易，这是你赠予自己最好的礼物。"
  }
};

function calcJoinDays(dateStr) {
  if (!dateStr) return 0;
  var s = String(dateStr).trim().replace(/-/g, "/");
  var t = new Date(s).getTime();
  if (isNaN(t)) {
    var match = String(dateStr).match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
      t = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10)).getTime();
    }
  }
  if (isNaN(t)) return 0;
  var diff = Math.floor((Date.now() - t) / 86400000);
  return Math.max(1, diff);
}

function formatCourseType(type, focusArea) {
  var t = String(type || "").toLowerCase().trim();
  var name = "私教";
  if (t === "pilates" || t.indexOf("普拉提") > -1) {
    name = "普拉提";
  } else if (t === "reformer" || t === "equipment" || t.indexOf("大器械") > -1 || t.indexOf("器械") > -1) {
    name = "大器械课";
  } else if (t === "fat_burn" || t === "sculpt" || t.indexOf("维密") > -1 || t.indexOf("减脂") > -1) {
    name = "维密减脂";
  } else if (t === "private" || t.indexOf("私教") > -1) {
    name = "私教";
  } else if (t === "group" || t.indexOf("团课") > -1) {
    name = "团课";
  } else if (t === "assessment" || t.indexOf("评估") > -1) {
    name = "体态评估";
  } else if (type) {
    name = type;
  }

  if (focusArea && focusArea.trim()) {
    return name + " · " + focusArea.trim();
  }
  return name;
}

// 月度之星必须来自后台（monthly_stars 表），不再内置虚构会员兜底。
// 为空时页面自动收起该模块，而不是拿别人的名字和写真顶上。
var LOCAL_STARS = [];

var LOCAL_VENUES = [
  { id: 1, imageUrl: "/images/venue/venue-1.jpg" },
  { id: 2, imageUrl: "/images/venue/venue-2.jpg" },
  { id: 3, imageUrl: "/images/venue/venue-3.jpg" },
  { id: 4, imageUrl: "/images/venue/venue-4.jpg" }
];

var LOCAL_TEAM = [
  { id: 1, name: "小桥", roleTitle: "徕舞主理人", avatarUrl: "/images/team/team-1.jpg", bio: "慢下来，用呼吸唤醒身体的每一寸记忆。" },
  { id: 2, name: "嘉敏", roleTitle: "普拉提导师", avatarUrl: "/images/team/team-2.jpg", bio: "专注当下每一次发力，感受从容舒展的蜕变。" },
  { id: 3, name: "若琳", roleTitle: "普拉提导师", avatarUrl: "/images/team/team-3.jpg", bio: "在对抗与平衡中，雕刻坚韧而柔软的内在力量。" }
];

function requestPromise(options) {
  return new Promise(function(resolve) {
    api.request(Object.assign({}, options, {
      success: function(res) {
        resolve(res);
      },
      fail: function(err) {
        resolve({ statusCode: 500, error: err });
      }
    }));
  });
}

Page({
  data: {
    memberName: "",
    joinDays: 0,
    trainCount: 0,
    questionnaireCount: 0,
    photoCount: 0,
    feedbackCount: 0,
    stageName: "自律启程",
    levelTitle: "身体掌权者 · 始于觉知",
    // 兜底寄语：接口失败或数据未到时，卡片也不会塌成空的
    whisperTitle: "身体从不说谎",
    whisperBody: "坚持不易，你流过的每一滴汗，都在悄悄重塑你的挺拔与自信。",
    recentTrainings: [],
    latestFeedback: null,
    feeling: "",
    feelingSubmitting: false,
    feelingReply: "",
    feelingTags: ["肩颈舒展", "核心收紧", "整个人轻盈了", "体态更挺拔", "呼吸顺畅"],
    selectedFeelingTags: [],
    loading: true,
    photoComparisons: [],
    selectedAngle: "front",
    angleTabs: [
      { key: "front", label: "正面" },
      { key: "side", label: "侧面" },
      { key: "back", label: "背面" }
    ],
    pinnedComparison: null,
    historyComparisons: [],
    photos: [],
    coachMessage: '',
    coachNoteTags: [],
    coachNoteDate: '',
    showShareModal: false,
    shareComparison: null,
    baseUrl: "",
    memberId: null,
    showSplash: true,
    splashFadeOut: false,
    formattedDays: "0",
    // 月度之星全屏画报（在即刻开启后无缝切入，或点击头部月度之星胶囊随时唤起）
    showStarsModal: false,
    currentStarIndex: 0,
    starsClosing: false,
    monthlyStarsList: [],
    venueList: LOCAL_VENUES,
    teamList: LOCAL_TEAM
  },

  onLoad: function() {
    var memberId = wx.getStorageSync("memberId");
    if (!memberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    var baseUrl = wx.getStorageSync("baseUrl") || api.DEFAULT_BASE_URL;
    var memberName = wx.getStorageSync("memberName") || "";
    var isDemo = wx.getStorageSync("isDemoMode") === true || memberName === "陈知意";
    var cachedDays = wx.getStorageSync("joinDays") || (isDemo ? 365 : 0);
    var formattedDays = String(cachedDays).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    this.setData({
      baseUrl: baseUrl,
      memberId: Number(memberId),
      memberName: memberName || "你",
      joinDays: cachedDays,
      formattedDays: formattedDays
    });

    this.loadAllPageAssets();

    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"]
      });
    }
  },

  apiHeaders: function() {
    return {
      "Content-Type": "application/json",
      "X-Portal-Member-Id": String(this.data.memberId)
    };
  },

  // 后端返回 /member-photos/xxx.jpg 这类相对路径，这里补成完整地址
  fullUrl: function(p) {
    if (!p) return "";
    if (p.indexOf("http") === 0) return p;
    return (this.data.baseUrl || "") + p;
  },

  // 聚合原子数据加载器：单次并发请求全部资产，彻底消除 CLS 布局抖动
  loadAllPageAssets: function(callback) {
    var that = this;
    var memberId = that.data.memberId;
    if (!memberId) {
      that.setData({ loading: false });
      if (typeof callback === "function") callback();
      return;
    }
    var baseUrl = that.data.baseUrl || api.DEFAULT_BASE_URL;
    var headers = that.apiHeaders();

    var pMe = requestPromise({ url: "/api/portal/me", header: headers });
    var pTrainings = requestPromise({ url: "/api/trainings?memberId=" + memberId, header: headers });
    var pReports = requestPromise({ url: "/api/ai/period-report?memberId=" + memberId, header: headers });
    var pQuestionnaire = requestPromise({ url: "/api/questionnaire?memberId=" + memberId, header: headers });
    var pCoachNote = requestPromise({ url: "/api/portal/coach-notes?memberId=" + memberId, header: headers });
    var pPhotoCompare = requestPromise({ url: "/api/portal/photo-compare?memberId=" + memberId + "&limit=50", header: headers });
    var pPhotos = requestPromise({ url: "/api/photos?memberId=" + memberId, header: headers });
    var pStars = requestPromise({ url: "/api/portal/stars", header: headers });
    var pVenue = requestPromise({ url: "/api/portal/venue", header: headers });
    var pTeam = requestPromise({ url: "/api/portal/team", header: headers });

    Promise.all([
      pMe, pTrainings, pReports, pQuestionnaire, pCoachNote,
      pPhotoCompare, pPhotos, pStars, pVenue, pTeam
    ]).then(function(results) {
      var resMe = results[0];
      var resTrainings = results[1];
      var resReports = results[2];
      var resQuestionnaire = results[3];
      var resCoachNote = results[4];
      var resPhotoCompare = results[5];
      var resPhotos = results[6];
      var resStars = results[7];
      var resVenue = results[8];
      var resTeam = results[9];

      var payload = { loading: false };

      // 1. 会员信息与天数计算
      var memberName = wx.getStorageSync("memberName") || that.data.memberName || "你";
      var isDemo = wx.getStorageSync("isDemoMode") === true || memberName === "陈知意" || that.data.memberName === "陈知意";
      var joinDays = 0;
      if (isDemo) {
        joinDays = 365;
      } else if (resMe.statusCode === 200 && resMe.data) {
        var m = resMe.data;
        var nm = m.memberName || m.name || memberName;
        memberName = nm;
        if (m.joinedAt || m.createdAt) {
          joinDays = calcJoinDays(m.joinedAt || m.createdAt);
        }
      } else {
        joinDays = wx.getStorageSync("joinDays") || 0;
      }

      // 2. 训练历程
      var trainings = (resTrainings.statusCode === 200 && Array.isArray(resTrainings.data)) ? resTrainings.data : [];
      var trainCount = trainings.length;
      var stageInfo = getStage(trainCount);
      var serverStage = (resMe.statusCode === 200 && resMe.data && resMe.data.stage) ? resMe.data.stage : null;
      if (serverStage) {
        stageInfo = { name: serverStage.name, stage: serverStage.name, levelTitle: serverStage.levelTitle };
      }
      var whisper = serverStage
        ? { title: serverStage.whisperTitle, body: serverStage.whisperBody }
        : (WHISPERS[stageInfo.stage] || WHISPERS["觉知启程"]);

      // 核心容灾：若会员入会日期未填但已有训练记录，自动从第一次开练日期倒推天数
      if ((!joinDays || joinDays === 0) && trainings.length > 0) {
        var earliest = trainings[trainings.length - 1];
        if (earliest && earliest.trainingDate) {
          var deducedDays = calcJoinDays(earliest.trainingDate);
          if (deducedDays > 0) {
            joinDays = deducedDays;
          }
        }
      }
      if (joinDays > 0) {
        wx.setStorageSync("joinDays", joinDays);
      }

      var recentTrainings = trainings.slice(0, 5).map(function(t) {
        var rawType = String(t.type || "");
        var category = "一对一私教";
        var badgeClass = "badge-private";
        if (rawType.indexOf("普拉提") > -1 || rawType.toLowerCase().indexOf("pilates") > -1) {
          category = "普拉提大器械";
          badgeClass = "badge-pilates";
        } else if (rawType.indexOf("减脂") > -1 || rawType.indexOf("维密") > -1) {
          category = "维密急速塑形";
          badgeClass = "badge-sculpt";
        } else if (rawType.indexOf("团课") > -1 || rawType.indexOf("大器械") > -1) {
          category = "大器械韵律";
          badgeClass = "badge-group";
        }
        return {
          id: t.id,
          date: format.formatShortDate(t.trainingDate),
          type: formatCourseType(t.type, t.focusArea),
          category: category,
          badgeClass: badgeClass,
          focusArea: t.focusArea ? t.focusArea.trim() : "",
          duration: (t.durationMinutes || 60) + "分钟"
        };
      });

      payload.memberName = memberName;
      payload.joinDays = joinDays;
      payload.formattedDays = String(joinDays).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      payload.trainCount = trainCount;
      payload.stageName = stageInfo.name;
      payload.levelTitle = stageInfo.levelTitle;
      payload.whisperTitle = whisper.title;
      payload.whisperBody = whisper.body;
      payload.recentTrainings = recentTrainings;

      // 3. AI 反馈
      var reports = [];
      if (resReports.statusCode === 200 && resReports.data) {
        reports = Array.isArray(resReports.data) ? resReports.data : (resReports.data.reports || []);
      }
      payload.feedbackCount = reports.length;
      if (reports.length > 0) {
        var r = reports[0];
        var cleanSummary = format.cleanMarkdown(r.content || "");
        payload.latestFeedback = {
          type: format.formatReportType(r.reportType),
          date: format.formatChineseDate(r.generatedAt || r.createdAt),
          summary: cleanSummary.slice(0, 120) + (cleanSummary.length > 120 ? "..." : "")
        };
      } else {
        payload.latestFeedback = null;
      }

      // 4. 问卷
      var questionnaires = (resQuestionnaire.statusCode === 200 && Array.isArray(resQuestionnaire.data)) ? resQuestionnaire.data : [];
      payload.questionnaireCount = questionnaires.length;

      // 5. 小桥私语手札
      if (resCoachNote.statusCode === 200 && Array.isArray(resCoachNote.data) && resCoachNote.data.length > 0) {
        var latestNote = resCoachNote.data[0];
        payload.coachMessage = format.cleanMarkdown(latestNote.aiMessage || "");
        payload.coachNoteTags = latestNote.tags || [];
        payload.coachNoteDate = format.formatChineseDate(latestNote.createdAt);
      }

      // 6. 体态对比档案
      var photoComparisons = [];
      if (resPhotoCompare.statusCode === 200 && Array.isArray(resPhotoCompare.data) && resPhotoCompare.data.length > 0) {
        photoComparisons = resPhotoCompare.data.map(function(c) {
          return {
            id: c.id,
            photo1_url: that.fullUrl(c.photo1_url),
            photo2_url: that.fullUrl(c.photo2_url),
            photo1_type: c.photo1_type || "front",
            photo2_type: c.photo2_type || "front",
            photo1_date: format.formatChineseDate(c.photo1_date),
            photo2_date: format.formatChineseDate(c.photo2_date),
            analysis: format.cleanMarkdown(c.analysis || "")
          };
        });
      }
      payload.photoComparisons = photoComparisons;

      // 计算当前视角的置顶对比与历史对比
      var angle = that.data.selectedAngle || "front";
      var angleComparisons = photoComparisons.filter(function(c) {
        return that.normalizeAngle(c.photo1_type || c.photo2_type) === angle;
      });

      if (angleComparisons.length === 0) {
        payload.pinnedComparison = null;
        payload.historyComparisons = [];
      } else {
        var pinnedIndex = 0;
        var maxSpan = -1;
        for (var i = 0; i < angleComparisons.length; i++) {
          var d1 = angleComparisons[i].photo1_date ? new Date(angleComparisons[i].photo1_date).getTime() : 0;
          var d2 = angleComparisons[i].photo2_date ? new Date(angleComparisons[i].photo2_date).getTime() : 0;
          var span = d2 - d1;
          if (span > maxSpan) {
            maxSpan = span;
            pinnedIndex = i;
          }
        }
        payload.pinnedComparison = angleComparisons[pinnedIndex];
        payload.historyComparisons = angleComparisons.filter(function(item, idx) {
          return idx !== pinnedIndex;
        });
      }

      // 7. 会员全部照片
      var photos = [];
      if (resPhotos.statusCode === 200 && Array.isArray(resPhotos.data) && resPhotos.data.length > 0) {
        photos = resPhotos.data.map(function(p) {
          return {
            id: p.id,
            url: that.fullUrl(p.filePath),
            takenAt: p.takenAt || "",
            type: p.photoType || ""
          };
        });
      }
      payload.photos = photos;
      payload.photoCount = photos.length;

      // 8. 月度之星
      if (resStars.statusCode === 200 && Array.isArray(resStars.data) && resStars.data.length > 0) {
        payload.monthlyStarsList = resStars.data.map(function(item) {
          var url = item.avatarUrl || "";
          if (url.indexOf("/brand/") === 0) {
            url = baseUrl + url;
          }
          return Object.assign({}, item, { avatarUrl: url });
        });
      }

      // 9. 场馆空间
      if (resVenue.statusCode === 200 && Array.isArray(resVenue.data) && resVenue.data.length > 0) {
        payload.venueList = resVenue.data.map(function(item) {
          var url = item.imageUrl || "";
          if (url.indexOf("/brand/") === 0) {
            url = baseUrl + url;
          }
          return Object.assign({}, item, { imageUrl: url });
        });
      }

      // 10. 徕舞团队
      if (resTeam.statusCode === 200 && Array.isArray(resTeam.data) && resTeam.data.length > 0) {
        payload.teamList = resTeam.data.map(function(item) {
          var url = item.avatarUrl || "";
          if (url.indexOf("/brand/") === 0) {
            url = baseUrl + url;
          }
          return Object.assign({}, item, { avatarUrl: url });
        });
      }

      // 原子级别统一更新：杜绝 CLS 布局跳动
      that.setData(payload, function() {
        if (typeof callback === "function") callback();
      });
    }).catch(function() {
      that.setData({ loading: false });
      if (typeof callback === "function") callback();
    });
  },

  // 兼容调用别名
  loadData: function() { this.loadAllPageAssets(); },
  loadCoachNote: function() { this.loadAllPageAssets(); },
  loadPhotoComparisons: function() { this.loadAllPageAssets(); },
  loadPhotos: function() { this.loadAllPageAssets(); },
  loadBrandAssets: function() { this.loadAllPageAssets(); },

  normalizeAngle: function(type) {
    if (!type) return "front";
    var t = String(type).toLowerCase();
    if (t === "side") return "side";
    if (t === "back") return "back";
    return "front";
  },

  updateAngleComparisons: function(angle) {
    var that = this;
    var all = that.data.photoComparisons || [];
    var filtered = all.filter(function(c) {
      return that.normalizeAngle(c.photo1_type || c.photo2_type) === angle;
    });

    if (filtered.length === 0) {
      that.setData({
        selectedAngle: angle,
        pinnedComparison: null,
        historyComparisons: []
      });
      return;
    }

    var pinnedIndex = 0;
    var maxSpan = -1;
    for (var i = 0; i < filtered.length; i++) {
      var d1 = filtered[i].photo1_date ? new Date(filtered[i].photo1_date).getTime() : 0;
      var d2 = filtered[i].photo2_date ? new Date(filtered[i].photo2_date).getTime() : 0;
      var span = d2 - d1;
      if (span > maxSpan) {
        maxSpan = span;
        pinnedIndex = i;
      }
    }

    var pinned = filtered[pinnedIndex];
    var history = filtered.filter(function(item, idx) {
      return idx !== pinnedIndex;
    });

    that.setData({
      selectedAngle: angle,
      pinnedComparison: pinned,
      historyComparisons: history
    });
  },

  switchAngle: function(e) {
    var angle = e.currentTarget.dataset.angle;
    if (!angle || angle === this.data.selectedAngle) return;
    try {
      if (wx.vibrateShort) {
        wx.vibrateShort({ type: "light" });
      }
    } catch (err) {}
    this.updateAngleComparisons(angle);
  },

  // 点对比图里任意一张，全屏看大图（可双指放大、左右滑动）
  previewPhoto: function(e) {
    var ds = e.currentTarget.dataset;
    var urls = [];
    if (ds.p1 || ds.p2) {
      urls = [ds.p1, ds.p2].filter(function(u) { return !!u; });
    } else if (typeof ds.cidx !== "undefined" && this.data.photoComparisons && this.data.photoComparisons[ds.cidx]) {
      var item = this.data.photoComparisons[ds.cidx];
      urls = [item.photo1_url, item.photo2_url].filter(function(u) { return !!u; });
    }
    if (!urls.length && ds.src) urls = [ds.src];
    if (!urls.length) return;
    wx.previewImage({ urls: urls, current: ds.src || urls[0] });
  },

  // 点照片墙任意一张，按整组照片左右滑动查看
  previewPhotoAt: function(e) {
    var urls = this.data.photos.map(function(p) { return p.url; }).filter(function(u) { return !!u; });
    if (!urls.length) return;
    wx.previewImage({ urls: urls, current: urls[e.currentTarget.dataset.index] });
  },

  // 点选体感快捷便签标签：追加或反选
  toggleFeelingTag: function(e) {
    var tag = e.currentTarget.dataset.tag;
    if (!tag) return;
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    } catch (err) {}
    var selected = this.data.selectedFeelingTags || [];
    var idx = selected.indexOf(tag);
    var newSelected = selected.slice();
    var currentText = this.data.feeling;

    // 标签写成「人话」而不是 # 井号串：
    // 会员只点标签就提交时，后端拿到的是可读的一句话，而不是 "#肩颈舒展 #核心收紧 #..."
    if (idx >= 0) {
      newSelected.splice(idx, 1);
      currentText = currentText
        .split("，")
        .filter(function(part) { return part && part !== tag; })
        .join("，");
    } else {
      newSelected.push(tag);
      if (currentText.indexOf(tag) === -1) {
        currentText = currentText ? (currentText + "，" + tag) : tag;
      }
    }
    this.setData({
      selectedFeelingTags: newSelected,
      feeling: currentText
    });
  },

  // 打开自律画报级分享弹窗（通过 poster-modal 组件完全解耦呈现）
  openShareModal: function(e) {
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    } catch (err) {}
    var target = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.item) || this.data.pinnedComparison;
    if (!target && this.data.photoComparisons && this.data.photoComparisons.length > 0) {
      target = this.data.photoComparisons[0];
    }
    this.setData({
      shareComparison: target,
      showShareModal: true
    });
    this.setTabBarHidden(true);
  },

  closeShareModal: function() {
    this.setData({ showShareModal: false });
    this.setTabBarHidden(false);
  },

  onFeelingInput: function(e) {
    this.setData({ feeling: e.detail.value });
  },

  submitFeeling: function() {
    var that = this;
    if (that.data.feelingSubmitting) return;
    var feeling = (that.data.feeling || "").trim();
    if (!feeling) {
      wx.showToast({ title: "请先写下身体感受", icon: "none" });
      return;
    }
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: "medium" });
    } catch (err) {}
    that.setData({ feelingSubmitting: true });

    api.request({
      url: "/api/portal/training-feelings",
      method: "POST",
      header: that.apiHeaders(),
      data: { memberId: that.data.memberId, feeling: feeling },
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({
            feelingSubmitting: false,
            feeling: "",
            selectedFeelingTags: [],
            feelingReply: res.data.xiaoqiaoReply || "已妥善收入你的专属手札。每一次用心的记录，都是蜕变的印记。小桥一直在你身边。"
          });
          wx.showToast({
            title: "已发给小桥",
            icon: "success",
            duration: 2000
          });
        } else { that.feelingFailed(); }
      },
      fail: function() { that.feelingFailed(); }
    });
  },

  feelingFailed: function() {
    this.setData({ feelingSubmitting: false });
    wx.showToast({
      title: "网络微忙，请重试或微信联系小桥",
      icon: "none",
      duration: 2500
    });
  },

  openStarsModal: function() {
    if (!this.data.monthlyStarsList || this.data.monthlyStarsList.length === 0) {
      wx.showToast({ title: "本期之星正在收录", icon: "none" });
      return;
    }
    if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    this.setData({
      showStarsModal: true,
      currentStarIndex: 0,
      starsClosing: false
    });
    this.setTabBarHidden(true);
  },

  closeStarsModal: function() {
    var that = this;
    if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    this.setData({
      starsClosing: true
    });
    setTimeout(function() {
      that.setData({
        showStarsModal: false,
        starsClosing: false
      });
      that.setTabBarHidden(false);
    }, 280);
  },

  onStarSwiperChange: function(e) {
    var current = e.detail.current;
    this.setData({ currentStarIndex: current });
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: "light" });
    }
  },

  previewVenueImage: function(e) {
    var current = e.currentTarget.dataset.src;
    var urls = this.data.venueList.map(function(v) { return v.imageUrl; });
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  previewTeamImage: function(e) {
    var current = e.currentTarget.dataset.src;
    var urls = this.data.teamList.map(function(t) { return t.avatarUrl; });
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  noop: function() {},

  setTabBarHidden: function(hidden) {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ hidden: hidden });
    }
  },

  skipSplash: function() {
    var that = this;
    if (that._splashTimer) {
      clearTimeout(that._splashTimer);
      that._splashTimer = null;
    }
    if (!that.data.showSplash) return;
    if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    that.setData({ splashFadeOut: true });
    setTimeout(function() {
      that.setData({
        showSplash: false,
        splashFadeOut: false,
        showStarsModal: true,
        starsClosing: false,
        currentStarIndex: 0
      });
      that.setTabBarHidden(true);
    }, 450);
  },

  onReady: function() {
    this.setTabBarHidden(this.data.showSplash || this.data.showStarsModal);
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, hidden: this.data.showSplash || this.data.showStarsModal });
    }

    var currentMemberId = Number(wx.getStorageSync("memberId") || 0);
    if (!currentMemberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }

    // 账号切换检测：如果当前内存里的 memberId 与 storage 不一致，立即刷新整页数据
    if (this.data.memberId !== currentMemberId) {
      var memberName = wx.getStorageSync("memberName") || "";
      var isDemo = wx.getStorageSync("isDemoMode") === true || memberName === "陈知意";
      var cachedDays = wx.getStorageSync("joinDays") || (isDemo ? 365 : 0);

      this.setData({
        memberId: currentMemberId,
        memberName: memberName || "你",
        joinDays: cachedDays,
        trainCount: 0,
        recentTrainings: [],
        photoComparisons: [],
        pinnedComparison: null,
        historyComparisons: [],
        photos: [],
        loading: true
      });

      this.loadAllPageAssets();
    }
  },

  onPullDownRefresh: function() {
    this.loadAllPageAssets(function() {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage: function(res) {
    var memberName = this.data.memberName || "";
    var title = memberName ? (memberName + "的身体蜕变手札 · 徕舞健身") : "身体从不说谎 · 徕舞成长手札";
    if (res && res.from === "button" && this.data.shareComparison) {
      title = memberName ? (memberName + "的体态蜕变对比 · 徕舞健身") : "体态美学蜕变对比 · 徕舞健身";
    }
    return {
      title: title,
      path: "/pages/growth/growth"
    };
  },

  onShareTimeline: function() {
    var memberName = this.data.memberName || "";
    var title = memberName ? (memberName + "的身体蜕变手札 · 徕舞健身") : "身体从不说谎 · 徕舞成长手札";
    return {
      title: title,
      query: ""
    };
  }
});
