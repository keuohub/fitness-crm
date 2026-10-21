// pages/transformation/transformation.js
var api = require("../../utils/api.js");
var format = require("../../utils/format.js");

function getStage(trainCount) {
  if (trainCount >= 51) return { name: "终生优雅", stage: "终生优雅", levelTitle: "身体掌权者 · 终生优雅" };
  if (trainCount >= 21) return { name: "身体掌权", stage: "身体掌权", levelTitle: "身体掌权者 · 深度蜕变" };
  if (trainCount >= 6)  return { name: "掌控新生", stage: "身体掌控", levelTitle: "身体掌控者 · 进阶自律" };
  return { name: "自律启程", stage: "自律启程", levelTitle: "身体掌权者 · 始于觉知" };
}

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
    name = "精选普拉提";
  } else if (t === "reformer" || t === "equipment" || t.indexOf("大器械") > -1 || t.indexOf("器械") > -1) {
    name = "高定大器械";
  } else if (t === "fat_burn" || t === "sculpt" || t.indexOf("维密") > -1 || t.indexOf("减脂") > -1) {
    name = "维密减脂超模班";
  } else if (t === "yoga" || t.indexOf("瑜伽") > -1) {
    name = "瑜伽";
  } else if (t === "private" || t.indexOf("私教") > -1) {
    name = "私教";
  } else if (type) {
    name = type;
  }

  if (focusArea && focusArea.trim()) {
    return name + " · " + focusArea.trim();
  }
  return name;
}

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
    loading: true,
    loadError: "",
    memberId: null,
    baseUrl: "",
    memberName: "",
    avatarUrl: "",
    joinDays: null,
    formattedDays: "",
    trainCount: 0,
    questionnaireCount: 0,
    photoCount: 0,
    stageName: "",
    levelTitle: "",
    targetGoal: 0,
    progressPercent: 0,
    whisperText: "",

    selectedAngle: "front",
    angleTabs: [
      { key: "front", label: "正面" },
      { key: "side", label: "侧面" },
      { key: "back", label: "背面" }
    ],
    photoComparisons: [],
    pinnedComparison: null,
    historyComparisons: [],

    recentTrainings: [],
    coachNotes: [],
    feeling: "",
    feelingSubmitting: false,
    feelingReply: "",
    feelingTags: ["肩颈舒展", "核心收紧", "整个人轻盈了", "体态更挺拔", "呼吸顺畅"],
    selectedFeelingTags: [],

    showShareModal: false,
    shareComparison: null
  },

  onLoad: function() {
    var memberId = wx.getStorageSync("memberId");
    if (!memberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    var baseUrl = api.getBaseUrl();
    var memberName = wx.getStorageSync("memberName") || "";
    var cachedDays = Number(wx.getStorageSync("joinDays") || 0);
    var formattedDays = String(cachedDays).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    this.setData({
      baseUrl: baseUrl,
      memberId: Number(memberId),
      memberName: memberName,
      joinDays: cachedDays,
      formattedDays: formattedDays
    });

    this.loadTransformationData();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, hidden: false });
    }
    // 每次回到本页静默重取：后台录课/回音/照片改动，无需重启小程序
    var now = Date.now();
    if (this.data.memberId && (!this._lastLoad || now - this._lastLoad > 3000)) {
      this._lastLoad = now;
      this.loadTransformationData();
    }
  },

  apiHeaders: function() {
    return {
      "Content-Type": "application/json",
      "X-Portal-Member-Id": String(this.data.memberId)
    };
  },

  fullUrl: function(p) {
    if (!p) return "";
    if (p.indexOf("http") === 0) return p;
    return api.getBaseUrl() + p;
  },

  loadTransformationData: function() {
    var that = this;
    var memberId = that.data.memberId;
    var headers = that.apiHeaders();

    var pMe = requestPromise({ url: "/api/portal/me", header: headers });
    var pTrainings = requestPromise({ url: "/api/trainings?memberId=" + memberId, header: headers });
    var pPhotoCompare = requestPromise({ url: "/api/photo-comparisons?memberId=" + memberId, header: headers });
    var pPhotos = requestPromise({ url: "/api/photos?memberId=" + memberId, header: headers });
    var pCoachNote = requestPromise({ url: "/api/portal/coach-notes?memberId=" + memberId, header: headers });

    Promise.all([pMe, pTrainings, pPhotoCompare, pPhotos, pCoachNote]).then(function(results) {
      var resMe = results[0];
      var resTrainings = results[1];
      var resPhotoCompare = results[2];
      var resPhotos = results[3];
      var resCoachNote = results[4];

      var payload = { loading: false };

      // 1. 会员信息（字段名以 /api/portal/me 为准：memberName / joinedAt）
      if (resMe.statusCode === 200 && resMe.data && resMe.data.memberName) {
        var m = resMe.data;
        payload.memberName = m.memberName || that.data.memberName;
        payload.avatarUrl = that.fullUrl(m.avatarUrl || "");
        if (m.joinDays !== null && m.joinDays !== undefined) {
          payload.joinDays = Number(m.joinDays);
          payload.formattedDays = String(payload.joinDays).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        // 阶段由服务端统一计算，避免各页面自算导致等级名不一致
        if (m.stage) {
          payload.stageName = m.stage.name;
          payload.levelTitle = m.stage.levelTitle;
          payload.targetGoal = m.stage.target;
          payload.progressPercent = m.stage.progress;
          payload.whisperText = m.stage.whisperBody;
          that._serverStage = true;
        }
      }

      // 2. 训练历程（没有记录就是空；不伪造节数、导师与评语）
      var trainCount = that.data.trainCount;
      if (resTrainings.statusCode === 200 && Array.isArray(resTrainings.data)) {
        trainCount = resTrainings.data.length;
        payload.trainCount = trainCount;
        payload.recentTrainings = resTrainings.data.slice(0, 10).map(function(t) {
          return {
            id: t.id,
            date: format.formatChineseDate(t.trainingDate || t.createdAt),
            courseType: formatCourseType(t.type, t.focusArea),
            duration: t.durationMinutes ? t.durationMinutes + " 分钟" : "",
            coachName: t.coachName || "",
            note: t.notes || ""
          };
        });
      } else {
        payload.trainCount = 0;
        payload.recentTrainings = [];
      }

      // 阶段：服务端已给就用服务端的（保证首页 / 蜕变 / 账户三页等级名完全一致）
      if (!that._serverStage) {
        var stageInfo = getStage(trainCount);
        payload.stageName = stageInfo.stage;
        payload.levelTitle = stageInfo.levelTitle;
        var target = trainCount < 20 ? 20 : trainCount < 50 ? 50 : 100;
        payload.targetGoal = target;
        payload.progressPercent = Math.min(100, Math.round((trainCount / target) * 100));
      }

      // 3. 对比档案
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
      // 无对比照就保持空数组：前端由 diptych-section 的空状态承接，
      // 绝不用示范体态照冒充会员本人。
      payload.photoComparisons = photoComparisons;

      // 4. 计算当前角度的置顶对比与历史对比
      var currentAngle = that.data.selectedAngle || "front";
      var angleFiltered = photoComparisons.filter(function(c) {
        return that.normalizeAngle(c.photo1_type || c.photo2_type) === currentAngle;
      });
      if (angleFiltered.length > 0) {
        payload.pinnedComparison = angleFiltered[0];
        payload.historyComparisons = angleFiltered.slice(1);
      } else if (photoComparisons.length > 0) {
        payload.pinnedComparison = photoComparisons[0];
        payload.historyComparisons = photoComparisons.slice(1);
      } else {
        payload.pinnedComparison = null;
        payload.historyComparisons = [];
      }

      // 5. 照片总数
      if (resPhotos.statusCode === 200 && Array.isArray(resPhotos.data)) {
        payload.photoCount = resPhotos.data.length;
      }

      // 6. 问卷次数 + 教练手记（真实数据，后台写什么就显示什么）
      if (resMe.statusCode === 200 && resMe.data) {
        payload.questionnaireCount = Number(resMe.data.questionnaireCount || 0);
      }
      var notes = (resCoachNote.statusCode === 200 && Array.isArray(resCoachNote.data)) ? resCoachNote.data : [];
      payload.coachNotes = notes.slice(0, 5).map(function(n) {
        return {
          id: n.id,
          date: format.formatShortDate(n.createdAt),
          content: format.cleanMarkdown(n.coachNote || ""),
          tags: Array.isArray(n.tags) ? n.tags.join(" · ") : ""
        };
      });

      that.setData(payload);
    }).catch(function() {
      that.setData({ loading: false, loadError: "暂时无法加载，请下拉重试" });
    });
  },

  normalizeAngle: function(type) {
    if (!type) return "front";
    var t = String(type).toLowerCase();
    if (t === "side") return "side";
    if (t === "back") return "back";
    return "front";
  },

  switchAngle: function(e) {
    var angle = e.currentTarget.dataset.angle;
    if (!angle || angle === this.data.selectedAngle) return;
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    } catch (err) {}

    var all = this.data.photoComparisons || [];
    var filtered = all.filter(function(c) {
      return (c.photo1_type || c.photo2_type) === angle;
    });

    this.setData({
      selectedAngle: angle,
      pinnedComparison: filtered.length > 0 ? filtered[0] : (all.length > 0 ? all[0] : null),
      historyComparisons: filtered.length > 1 ? filtered.slice(1) : []
    });
  },

  previewComparisonImage: function(e) {
    var src = e.currentTarget.dataset.src;
    var pinned = this.data.pinnedComparison;
    var urls = [];
    if (pinned) {
      if (pinned.photo1_url) urls.push(pinned.photo1_url);
      if (pinned.photo2_url) urls.push(pinned.photo2_url);
    }
    if (urls.length === 0 && src) urls.push(src);
    wx.previewImage({
      current: src || urls[0],
      urls: urls
    });
  },

  openSharePoster: function(e) {
    var comp = e.currentTarget.dataset.comp || this.data.pinnedComparison;
    if (!comp) return;
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    } catch (err) {}
    this.setData({
      shareComparison: comp,
      showShareModal: true
    });
  },

  closeShareModal: function() {
    this.setData({
      showShareModal: false,
      shareComparison: null
    });
  },

  toggleFeelingTag: function(e) {
    var tag = e.currentTarget.dataset.tag;
    var tags = this.data.selectedFeelingTags.slice();
    var idx = tags.indexOf(tag);
    if (idx > -1) {
      tags.splice(idx, 1);
    } else {
      tags.push(tag);
    }
    var currentText = this.data.feeling || "";
    if (idx === -1 && currentText.indexOf(tag) === -1) {
      currentText = currentText ? currentText + "，" + tag : tag;
    }
    this.setData({
      selectedFeelingTags: tags,
      feeling: currentText
    });
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    } catch (err) {}
  },

  onFeelingInput: function(e) {
    this.setData({ feeling: e.detail.value });
  },

  submitFeeling: function() {
    var that = this;
    if (that.data.feelingSubmitting) return;
    var feeling = (that.data.feeling || "").trim();
    if (!feeling) {
      wx.showToast({ title: "请先记录下身体感受", icon: "none" });
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
            feelingReply: res.data.xiaoqiaoReply || "已妥善收录入你的专属手札。每一次用心的觉知，都在重构更挺拔从容的身姿。小桥一直在你身边。"
          });
          wx.showToast({
            title: "已转交导师小桥",
            icon: "success",
            duration: 2000
          });
        } else {
          that.feelingFallback();
        }
      },
      fail: function() {
        that.feelingFallback();
      }
    });
  },

  feelingFallback: function() {
    this.setData({
      feelingSubmitting: false,
      feeling: "",
      selectedFeelingTags: [],
      feelingReply: "便签已妥善存入手札。每一次用心的觉知，都在重构更挺拔从容的身姿。小桥一直在你身边。"
    });
    wx.showToast({
      title: "已记录体感",
      icon: "success",
      duration: 2000
    });
  },

  onShareAppMessage: function() {
    return {
      title: "我的蜕变档案 · 徕舞普拉提",
      path: "/pages/transformation/transformation"
    };
  }
});
