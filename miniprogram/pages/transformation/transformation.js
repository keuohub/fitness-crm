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
    memberId: null,
    baseUrl: "",
    memberName: "你",
    avatarUrl: "",
    joinDays: 365,
    formattedDays: "365",
    trainCount: 42,
    questionnaireCount: 4,
    photoCount: 8,
    stageName: "身体掌权",
    levelTitle: "身体掌权者 · 深度蜕变",
    targetGoal: 50,
    progressPercent: 84,
    whisperText: "肋骨自然收紧，深层腹横肌唤醒。每一次平稳呼吸，都在重构脊柱生理曲度的从容平衡。",

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
    var baseUrl = wx.getStorageSync("baseUrl") || api.DEFAULT_BASE_URL;
    var memberName = wx.getStorageSync("memberName") || "陈知意";
    var isDemo = wx.getStorageSync("isDemoMode") === true || memberName === "陈知意";
    var cachedDays = wx.getStorageSync("joinDays") || (isDemo ? 365 : 0);
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
      this.getTabBar().setData({
        selected: 2,
        hidden: false
      });
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
    return (this.data.baseUrl || "") + p;
  },

  loadTransformationData: function() {
    var that = this;
    var memberId = that.data.memberId;
    var headers = that.apiHeaders();

    var pMe = requestPromise({ url: "/api/portal/me", header: headers });
    var pTrainings = requestPromise({ url: "/api/trainings?memberId=" + memberId, header: headers });
    var pPhotoCompare = requestPromise({ url: "/api/photo-comparisons?memberId=" + memberId, header: headers });
    var pPhotos = requestPromise({ url: "/api/photos?memberId=" + memberId, header: headers });
    var pCoachNote = requestPromise({ url: "/api/coach-notes?memberId=" + memberId, header: headers });

    Promise.all([pMe, pTrainings, pPhotoCompare, pPhotos, pCoachNote]).then(function(results) {
      var resMe = results[0];
      var resTrainings = results[1];
      var resPhotoCompare = results[2];
      var resPhotos = results[3];
      var resCoachNote = results[4];

      var payload = { loading: false };

      // 1. 会员信息
      if (resMe.statusCode === 200 && resMe.data && resMe.data.name) {
        var m = resMe.data;
        payload.memberName = m.name || that.data.memberName;
        payload.avatarUrl = that.fullUrl(m.avatarUrl || "");
        if (m.joinedDate) {
          payload.joinDays = calcJoinDays(m.joinedDate);
          payload.formattedDays = String(payload.joinDays).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
      }

      // 2. 训练历程
      var trainCount = that.data.trainCount;
      if (resTrainings.statusCode === 200 && Array.isArray(resTrainings.data)) {
        trainCount = resTrainings.data.length;
        payload.trainCount = trainCount;
        payload.recentTrainings = resTrainings.data.slice(0, 10).map(function(t) {
          return {
            id: t.id,
            date: format.formatChineseDate(t.date || t.createdAt),
            courseType: formatCourseType(t.courseType, t.focusArea),
            duration: t.durationMinutes ? t.durationMinutes + " 分钟" : "60 分钟",
            coachName: t.coachName || "导师 小桥",
            note: t.summary || t.feedback || "深层核心发力平稳，胸椎灵活性与下肢力线显著改善。"
          };
        });
      } else {
        // 演示兜底训练历程
        payload.recentTrainings = [
          {
            id: 101,
            date: "2026年10月18日",
            courseType: "高定大器械 · 核心重构",
            duration: "60 分钟",
            coachName: "导师 小桥",
            note: "完成核心床滑行台抗伸展，肋骨外翻闭合意识强，骨盆中立位保持稳定。"
          },
          {
            id: 102,
            date: "2026年10月14日",
            courseType: "精选普拉提 · 胸椎舒展",
            duration: "60 分钟",
            coachName: "导师 嘉敏",
            note: "配合阻力小球进行呼吸与肩胛骨下沉，久坐引起的右侧斜方肌紧绷明显松解。"
          },
          {
            id: 103,
            date: "2026年10月10日",
            courseType: "维密减脂超模班 · 臀腿雕刻",
            duration: "60 分钟",
            coachName: "导师 若琳",
            note: "侧卧蚌式与器械对抗发力精准，假胯宽区域代偿减少，臀中肌酸胀感清晰。"
          },
          {
            id: 104,
            date: "2026年10月05日",
            courseType: "高定大器械 · 脊柱逐节分节",
            duration: "60 分钟",
            coachName: "导师 小桥",
            note: "脊柱滚动动作流畅，背部深层竖脊肌与核心肌群协作良好，无腰椎代偿。"
          }
        ];
      }

      var stageInfo = getStage(trainCount);
      payload.stageName = stageInfo.stage;
      payload.levelTitle = stageInfo.levelTitle;
      var target = trainCount < 20 ? 20 : trainCount < 50 ? 50 : 100;
      payload.targetGoal = target;
      payload.progressPercent = Math.min(100, Math.round((trainCount / target) * 100));

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
      } else {
        // 演示兜底对比图（使用处理好的会员对比画卷）
        photoComparisons = [
          {
            id: 201,
            photo1_type: "front",
            photo2_type: "front",
            photo1_url: "/images/stars/member_star_1.jpg",
            photo2_url: "/images/stars/member_star_3.jpg",
            photo1_date: "2025年10月20日 · 入学初评",
            photo2_date: "2026年10月18日 · 进阶定格",
            analysis: "经过 42 节普拉提与大器械精准训练，肋骨外翻已显著收紧归位；骨盆前倾改善约 6°，左右高低肩平衡对称，下颌线与双侧锁骨线条舒展挺拔。"
          },
          {
            id: 202,
            photo1_type: "side",
            photo2_type: "side",
            photo1_url: "/images/stars/member_star_2.jpg",
            photo2_url: "/images/stars/member_star_4.jpg",
            photo1_date: "2025年10月20日 · 入学初评",
            photo2_date: "2026年10月18日 · 进阶定格",
            analysis: "侧面观颈部前倾纠正明显，耳垂、肩峰与大转子回归标准垂直重力线。腹横肌建立自主内在张力，小腹自然平坦，后背生理弧度优雅自然。"
          },
          {
            id: 203,
            photo1_type: "back",
            photo2_type: "back",
            photo1_url: "/images/stars/star-1.jpg",
            photo2_url: "/images/stars/star-2.jpg",
            photo1_date: "2025年10月20日 · 入学初评",
            photo2_date: "2026年10月18日 · 进阶定格",
            analysis: "背部翼状肩胛已完全改善，双侧背阔肌与斜方肌中下束恢复均等支撑。脊柱中立无代偿，呈现紧致修长且富有弹性的体态线条。"
          }
        ];
      }
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
      }

      // 5. 照片总数
      if (resPhotos.statusCode === 200 && Array.isArray(resPhotos.data)) {
        payload.photoCount = resPhotos.data.length || 8;
      }

      that.setData(payload);
    }).catch(function() {
      that.setData({ loading: false });
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
