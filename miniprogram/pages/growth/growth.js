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

var LOCAL_STARS = [
  { id: 1, name: "苏晴", avatarUrl: "/images/stars/star-1.jpg", tag: "从容", quote: "在呼吸的节律里，重新找回身体原本的力量。" },
  { id: 2, name: "念安", avatarUrl: "/images/stars/star-2.jpg", tag: "深耕", quote: "每一次对抗与拉伸，都是与自己最真实的对话。" },
  { id: 3, name: "黛萌", avatarUrl: "/images/stars/star-3.jpg", tag: "专注", quote: "心神定下来，身体自会给出优雅的回应。" },
  { id: 4, name: "语晨", avatarUrl: "/images/stars/star-4.jpg", tag: "觉知", quote: "卸下外界的喧嚣，在这里只专注向内的深邃。" },
  { id: 5, name: "若薇", avatarUrl: "/images/stars/star-5.jpg", tag: "自在", quote: "不执着于速度，每一步坚持都在沉淀笃定。" },
  { id: 6, name: "听澜", avatarUrl: "/images/stars/star-6.jpg", tag: "恒温", quote: "舒展的不仅是脊柱线条，更是内在的从容与热爱。" }
];

var LOCAL_VENUES = [
  { id: 1, title: "01 / 核心床私密舱", imageUrl: "/images/venue/venue-1.jpg" },
  { id: 2, title: "02 / 凯迪拉克重力空间", imageUrl: "/images/venue/venue-2.jpg" },
  { id: 3, title: "03 / 普拉提舒展净室", imageUrl: "/images/venue/venue-3.jpg" },
  { id: 4, title: "04 / 私享茶饮休憩区", imageUrl: "/images/venue/venue-4.jpg" }
];

var LOCAL_TEAM = [
  { id: 1, name: "小桥", roleTitle: "徕舞主理人", avatarUrl: "/images/team/team-1.jpg", bio: "慢下来，用呼吸唤醒身体的每一寸记忆。" },
  { id: 2, name: "嘉敏", roleTitle: "普拉提导师", avatarUrl: "/images/team/team-2.jpg", bio: "专注当下每一次发力，感受从容舒展的蜕变。" },
  { id: 3, name: "若琳", roleTitle: "普拉提导师", avatarUrl: "/images/team/team-3.jpg", bio: "在对抗与平衡中，雕刻坚韧而柔软的内在力量。" }
];

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
    savingPoster: false,
    baseUrl: "",
    memberId: null,
    showSplash: false,
    splashFadeOut: false,
    formattedDays: "0",
    // 新增：月度之星开屏弹窗与品牌资产
    showStarsModal: true,
    currentStarIndex: 0,
    starsClosing: false,
    monthlyStarsList: LOCAL_STARS,
    venueList: LOCAL_VENUES,
    teamList: LOCAL_TEAM
  },

  onLoad: function() {
    var page = this;

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

    this.loadData();
    this.loadCoachNote();
    this.loadPhotoComparisons();
    this.loadPhotos();
    this.loadBrandAssets();

    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"]
      });
    }
  },

  loadBrandAssets: function() {
    var that = this;
    var baseUrl = that.data.baseUrl || api.DEFAULT_BASE_URL;

    // 1. 月度之星
    api.request({
      url: "/api/portal/stars",
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          var mapped = res.data.map(function(item) {
            var url = item.avatarUrl || "";
            if (url.indexOf("/brand/") === 0) {
              url = baseUrl + url;
            }
            return Object.assign({}, item, { avatarUrl: url });
          });
          that.setData({ monthlyStarsList: mapped });
        }
      }
    });

    // 2. 场馆空间
    api.request({
      url: "/api/portal/venue",
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          var mapped = res.data.map(function(item) {
            var url = item.imageUrl || "";
            if (url.indexOf("/brand/") === 0) {
              url = baseUrl + url;
            }
            return Object.assign({}, item, { imageUrl: url });
          });
          that.setData({ venueList: mapped });
        }
      }
    });

    // 3. 徕舞团队
    api.request({
      url: "/api/portal/team",
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          var mapped = res.data.map(function(item) {
            var url = item.avatarUrl || "";
            if (url.indexOf("/brand/") === 0) {
              url = baseUrl + url;
            }
            return Object.assign({}, item, { avatarUrl: url });
          });
          that.setData({ teamList: mapped });
        }
      }
    });
  },

  openStarsModal: function() {
    if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    this.setData({
      showStarsModal: true,
      currentStarIndex: 0,
      starsClosing: false
    });
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

  loadData: function() {
    var that = this;
    var memberId = that.data.memberId;
    var memberName = wx.getStorageSync("memberName") || that.data.memberName || "你";
    var baseUrl = that.data.baseUrl;
    that.setData({ memberName: memberName });

    // 会员详情（调用专属门户端接口，鉴权畅通无需管理员权限）
    api.request({
      url: "/api/portal/me",
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var m = res.data;
          var nm = m.memberName || m.name || memberName;
          var isDemo = wx.getStorageSync("isDemoMode") === true || nm === "陈知意" || that.data.memberName === "陈知意";
          var joinDays = 0;
          if (isDemo) {
            joinDays = 365;
          } else if (m.joinedAt || m.createdAt) {
            joinDays = calcJoinDays(m.joinedAt || m.createdAt);
          }
          if (joinDays > 0) {
            wx.setStorageSync("joinDays", joinDays);
          }
          that.setData({
            joinDays: joinDays,
            formattedDays: String(joinDays).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
            memberName: nm
          });
        } else {
          var isDemo = wx.getStorageSync("isDemoMode") === true || that.data.memberName === "陈知意";
          if (isDemo) {
            that.setData({ joinDays: 365, formattedDays: "365" });
          }
        }
      },
      fail: function() {
        that.setData({ loading: false });
      }
    });

    // 训练数据
    api.request({
      url: "/api/trainings?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var trainings = Array.isArray(res.data) ? res.data : [];
          var trainCount = trainings.length;
          var stageInfo = getStage(trainCount);
          var whisper = WHISPERS[stageInfo.stage] || WHISPERS["身体觉察者"];

          // 核心容灾：若会员入会日期未填但已有训练记录，自动从第一次开练日期倒推天数
          if ((!that.data.joinDays || that.data.joinDays === 0) && trainings.length > 0) {
            var earliest = trainings[trainings.length - 1];
            if (earliest && earliest.trainingDate) {
              var deducedDays = calcJoinDays(earliest.trainingDate);
              if (deducedDays > 0) {
                wx.setStorageSync("joinDays", deducedDays);
                that.setData({
                  joinDays: deducedDays,
                  formattedDays: String(deducedDays).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                });
              }
            }
          }

          var recent = trainings.slice(0, 5).map(function(t) {
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
          that.setData({
            trainCount: trainCount,
            stageName: stageInfo.name,
            levelTitle: stageInfo.levelTitle,
            whisperTitle: whisper.title,
            whisperBody: whisper.body,
            recentTrainings: recent,
            loading: false
          });
        } else {
          that.setData({ loading: false });
        }
      },
      fail: function() {
        that.setData({ loading: false });
      }
    });

    // AI 反馈
    api.request({
      url: "/api/ai/period-report?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var reports = Array.isArray(res.data) ? res.data : (res.data.reports || []);
          that.setData({ feedbackCount: reports.length });
          if (reports.length > 0) {
            var r = reports[0];
            var cleanSummary = format.cleanMarkdown(r.content || "");
            that.setData({
              latestFeedback: {
                type: format.formatReportType(r.reportType),
                date: format.formatChineseDate(r.generatedAt || r.createdAt),
                summary: cleanSummary.slice(0, 120) + (cleanSummary.length > 120 ? "..." : "")
              }
            });
          }
        }
        that.setData({ loading: false });
      },
      fail: function() {
        that.setData({ loading: false });
      }
    });

    // 问卷
    api.request({
      url: "/api/questionnaire?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var q = Array.isArray(res.data) ? res.data : [];
          that.setData({ questionnaireCount: q.length });
        }
      },
      fail: function() {}
    });
  },

  loadCoachNote: function() {
    var that = this;
    var memberId = that.data.memberId;
    api.request({
      url: '/api/portal/coach-notes?memberId=' + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.length > 0) {
          var latest = res.data[0];
          that.setData({
            coachMessage: format.cleanMarkdown(latest.aiMessage || ''),
            coachNoteTags: latest.tags || [],
            coachNoteDate: format.formatChineseDate(latest.createdAt)
          });
        }
      },
      fail: function() {}
    });
  },

  loadPhotoComparisons: function() {
    var that = this;
    var memberId = that.data.memberId;
    api.request({
      url: '/api/portal/photo-compare?memberId=' + memberId + '&limit=50',
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          var list = res.data.map(function(c) {
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
          that.setData({ photoComparisons: list });
          that.updateAngleComparisons(that.data.selectedAngle || "front");
        } else {
          // 未上传对比图时不造假图，保留真实干净的骨架
          that.setData({
            photoComparisons: [],
            pinnedComparison: null,
            historyComparisons: []
          });
        }
      },
      fail: function() {
        that.setData({
          photoComparisons: [],
          pinnedComparison: null,
          historyComparisons: []
        });
      }
    });
  },

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

    // 置顶那一组永远是「第一次 vs 最近一次」
    // 寻找拍摄日期跨度最大（最早 vs 最晚）的一组置顶；其余按列表时间倒序展示
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

  // 会员的全部体态照片（时间倒序），用于照片墙与「体态定格」次数
  loadPhotos: function() {
    var that = this;
    var memberId = that.data.memberId;
    api.request({
      url: '/api/photos?memberId=' + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.length > 0) {
          var list = res.data.map(function(p) {
            return {
              id: p.id,
              url: that.fullUrl(p.filePath),
              takenAt: p.takenAt || "",
              type: p.photoType || ""
            };
          });
          that.setData({ photos: list, photoCount: list.length });
        }
      },
      fail: function() {}
    });
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

  fallbackDemo: function() {
    var that = this;
    // 演示会话才允许展示演示档案（口令进入 / 缓存里就是陈知意）
    // 真实会员请求失败时绝不把他的界面换成「陈知意」
    var isDemo = wx.getStorageSync("isDemoMode") === true
      || wx.getStorageSync("memberName") === "陈知意"
      || that.data.memberName === "陈知意";
    if (!isDemo) {
      that.endLoadingQuietly();
      return;
    }
    if (that.data.trainCount > 0) return;
    var trainStr = wx.getStorageSync("demo_trainings") || "[]";
    var reportStr = wx.getStorageSync("demo_reports") || "[]";
    var trainings = JSON.parse(trainStr);
    var reports = JSON.parse(reportStr);
    var trainCount = trainings.length;
    var recent = trainings.map(function(t) {
      return { date: format.formatShortDate(t.trainingDate), type: t.type, duration: (t.durationMinutes || "") + "分钟" };
    });
    var stageInfo = getStage(trainCount);
    var whisper = WHISPERS[stageInfo.stage] || WHISPERS["身体觉察者"];
    var latestFeedback = null;
    if (reports.length > 0) {
      var r = reports[0];
      var cleanSummary = format.cleanMarkdown(r.content || "");
      latestFeedback = {
        type: format.formatReportType(r.reportType),
        date: format.formatChineseDate(r.generatedAt),
        summary: cleanSummary.slice(0, 120) + (cleanSummary.length > 120 ? "..." : "")
      };
    }
    that.setData({
      joinDays: 365,
      trainCount: trainCount,
      questionnaireCount: 3,
      photoCount: 8,
      feedbackCount: reports.length,
      stageName: stageInfo.name,
      levelTitle: stageInfo.levelTitle,
      whisperTitle: whisper.title,
      whisperBody: whisper.body,
      recentTrainings: recent,
      latestFeedback: latestFeedback,
      loading: false
    });
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

    if (idx >= 0) {
      newSelected.splice(idx, 1);
      // 从输入文本中移除对应 #标签
      currentText = currentText.replace("#" + tag + " ", "").replace("#" + tag, "").trim();
    } else {
      newSelected.push(tag);
      var tagPrefix = "#" + tag + " ";
      if (currentText.indexOf(tagPrefix.trim()) === -1) {
        currentText = currentText ? (currentText + " " + tagPrefix) : tagPrefix;
      }
    }
    this.setData({
      selectedFeelingTags: newSelected,
      feeling: currentText
    });
  },

  // 打开小红书/朋友圈画报级对比卡预览弹窗
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

  // 直接自动绘制并保存高清画报到手机相册
  savePosterToAlbum: function() {
    var that = this;
    if (that.data.savingPoster) return;
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: "medium" });
    } catch (err) {}

    that.setData({ savingPoster: true });
    wx.showLoading({ title: "正在生成海报...", mask: true });

    var query = that.createSelectorQuery();
    query.select('#posterCanvas')
      .fields({ node: true, size: true })
      .exec(function(res) {
        if (!res || !res[0] || !res[0].node) {
          wx.hideLoading();
          that.setData({ savingPoster: false });
          wx.showToast({ title: "海报准备中，请重试", icon: "none" });
          return;
        }

        var canvas = res[0].node;
        var ctx = canvas.getContext('2d');
        var dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : (wx.getSystemInfoSync ? wx.getSystemInfoSync().pixelRatio : 2)) || 2;

        var W = 750;
        var H = 1260;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        var memberName = that.data.memberName || "身体掌权者";
        var joinDays = that.data.joinDays || 0;
        var trainCount = that.data.trainCount || 0;
        var comp = that.data.shareComparison;
        var analysis = (comp && comp.analysis) ? comp.analysis : "锁骨舒展，骨盆中立回弹，自带松弛挺拔的大女主气场。";
        var photo1 = (comp && comp.photo1_url) ? comp.photo1_url : null;
        var photo2 = (comp && comp.photo2_url) ? comp.photo2_url : null;

        function drawRoundRect(x, y, w, h, r, fillColor, strokeColor, strokeWidth) {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.arcTo(x + w, y, x + w, y + r, r);
          ctx.lineTo(x + w, y + h - r);
          ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
          ctx.lineTo(x + r, y + h);
          ctx.arcTo(x, y + h, x, y + h - r, r);
          ctx.lineTo(x, y + r);
          ctx.arcTo(x, y, x + r, y, r);
          ctx.closePath();
          if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
          }
          if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth || 1;
            ctx.stroke();
          }
        }

        function drawTextWrap(text, x, y, maxWidth, lineHeight, maxLines) {
          var line = '';
          var curY = y;
          var linesCount = 0;
          for (var i = 0; i < text.length; i++) {
            var testLine = line + text[i];
            var metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
              linesCount++;
              if (maxLines && linesCount >= maxLines) {
                ctx.fillText(line.slice(0, -1) + '...', x, curY);
                return curY + lineHeight;
              }
              ctx.fillText(line, x, curY);
              line = text[i];
              curY += lineHeight;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, x, curY);
          return curY + lineHeight;
        }

        function downloadImg(url) {
          return new Promise(function(resolve) {
            if (!url) return resolve(null);
            if (url.indexOf("http") !== 0) return resolve(null);
            wx.downloadFile({
              url: url,
              success: function(dlRes) {
                if (dlRes.statusCode === 200 && dlRes.tempFilePath) {
                  var img = canvas.createImage();
                  img.onload = function() { resolve(img); };
                  img.onerror = function() { resolve(null); };
                  img.src = dlRes.tempFilePath;
                } else {
                  resolve(null);
                }
              },
              fail: function() { resolve(null); }
            });
          });
        }

        function timeoutPromise(ms) {
          return new Promise(function(resolve) {
            setTimeout(function() { resolve(null); }, ms);
          });
        }

        Promise.all([
          Promise.race([downloadImg(photo1), timeoutPromise(3500)]),
          Promise.race([downloadImg(photo2), timeoutPromise(3500)])
        ]).then(function(images) {
          var img1 = images[0];
          var img2 = images[1];

          // 1. 底色：雅致温润的象牙米白
          ctx.fillStyle = "#F5EFEB";
          ctx.fillRect(0, 0, W, H);

          // 2. 主卡片容器
          var cardX = 40;
          var cardY = 48;
          var cardW = W - 80;
          var cardH = H - 96;
          drawRoundRect(cardX, cardY, cardW, cardH, 32, "#FCF8F5", "rgba(186, 36, 40, 0.12)", 2);

          // 3. 顶部品牌字
          ctx.textAlign = "center";
          ctx.fillStyle = "#120E0F";
          ctx.font = "bold 24px serif";
          ctx.fillText("身 体 掌 权 · 终 生 优 雅", W / 2, cardY + 68);

          ctx.fillStyle = "#8C6A6B";
          ctx.font = "18px sans-serif";
          ctx.fillText("徕 舞 · 私 人 体 态 美 学 档 案", W / 2, cardY + 102);

          // 细横线
          ctx.strokeStyle = "rgba(28, 20, 21, 0.08)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cardX + 36, cardY + 128);
          ctx.lineTo(cardX + cardW - 36, cardY + 128);
          ctx.stroke();

          // 4. 会员姓名与自律天数
          ctx.textAlign = "left";
          ctx.fillStyle = "#1C1415";
          ctx.font = "bold 30px serif";
          ctx.fillText(memberName + " · 身体掌权者", cardX + 40, cardY + 178);

          ctx.textAlign = "right";
          ctx.fillStyle = "#BA2428";
          ctx.font = "bold 24px sans-serif";
          ctx.fillText("相伴自律 " + joinDays + " 天", cardX + cardW - 40, cardY + 178);

          // 5. 中间内容区：真实对比图 vs 高奢自律徽章（绝不放假图）
          var contentTop = cardY + 215;
          if (img1 && img2) {
            var pairW = (cardW - 80 - 18) / 2;
            var pairH = pairW * 4 / 3;

            // 绘制左图（初见 · 蜕变前）
            ctx.save();
            drawRoundRect(cardX + 40, contentTop, pairW, pairH, 16, "#EAE3DE", null, 0);
            ctx.clip();
            ctx.drawImage(img1, cardX + 40, contentTop, pairW, pairH);
            ctx.restore();

            drawRoundRect(cardX + 50, contentTop + pairH - 42, 110, 32, 16, "rgba(8, 7, 10, 0.75)", null, 0);
            ctx.textAlign = "center";
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "16px sans-serif";
            ctx.fillText("初见 · 蜕变前", cardX + 50 + 55, contentTop + pairH - 20);

            // 绘制右图（当下 · 新生后）
            ctx.save();
            drawRoundRect(cardX + 40 + pairW + 18, contentTop, pairW, pairH, 16, "#EAE3DE", null, 0);
            ctx.clip();
            ctx.drawImage(img2, cardX + 40 + pairW + 18, contentTop, pairW, pairH);
            ctx.restore();

            drawRoundRect(cardX + 40 + pairW + 28, contentTop + pairH - 42, 110, 32, 16, "rgba(8, 7, 10, 0.75)", null, 0);
            ctx.textAlign = "center";
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "16px sans-serif";
            ctx.fillText("当下 · 新生后", cardX + 40 + pairW + 28 + 55, contentTop + pairH - 20);

            contentTop += pairH + 34;
          } else {
            // 无图模式：高奢自律徽章（纯净真实）
            var badgeH = 260;
            drawRoundRect(cardX + 40, contentTop, cardW - 80, badgeH, 20, "rgba(245, 237, 232, 0.8)", "rgba(186, 36, 40, 0.18)", 1.5);

            ctx.textAlign = "center";
            ctx.fillStyle = "#BA2428";
            ctx.font = "38px sans-serif";
            ctx.fillText("✦", W / 2, contentTop + 72);

            ctx.fillStyle = "#1C1415";
            ctx.font = "bold 28px serif";
            ctx.fillText("身 心 觉 察 · 终 生 自 律", W / 2, contentTop + 128);

            ctx.fillStyle = "#8C6A6B";
            ctx.font = "20px sans-serif";
            ctx.fillText("累计完成 " + trainCount + " 次核心训练 · 岁月不负自律", W / 2, contentTop + 172);

            ctx.fillStyle = "rgba(28, 20, 21, 0.4)";
            ctx.font = "16px sans-serif";
            ctx.fillText("LAIWU PRIVATE PILATES & FITNESS", W / 2, contentTop + 210);

            contentTop += badgeH + 36;
          }

          // 6. 觉察金句框
          var quoteBoxW = cardW - 80;
          var quoteBoxH = 170;
          drawRoundRect(cardX + 40, contentTop, quoteBoxW, quoteBoxH, 18, "rgba(255, 255, 255, 0.85)", "rgba(28, 20, 21, 0.05)", 1);

          ctx.textAlign = "left";
          ctx.fillStyle = "#BA2428";
          ctx.font = "bold 38px Georgia, serif";
          ctx.fillText("“", cardX + 60, contentTop + 46);

          ctx.fillStyle = "#381617";
          ctx.font = "22px sans-serif";
          drawTextWrap(analysis, cardX + 96, contentTop + 48, quoteBoxW - 76, 36, 3);

          // 7. 底部落款与专属印章
          var footerY = cardY + cardH - 120;
          ctx.strokeStyle = "rgba(28, 20, 21, 0.08)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cardX + 40, footerY);
          ctx.lineTo(cardX + cardW - 40, footerY);
          ctx.stroke();

          ctx.textAlign = "left";
          ctx.fillStyle = "#1C1415";
          ctx.font = "bold 24px sans-serif";
          ctx.fillText("小桥 · 专属私教手札", cardX + 40, footerY + 44);

          ctx.fillStyle = "#8C6A6B";
          ctx.font = "18px sans-serif";
          ctx.fillText("自律成骨骼，岁月即礼赞", cardX + 40, footerY + 76);

          // 徕舞私享印章
          var stampX = cardX + cardW - 120;
          var stampY = footerY + 12;
          var stampR = 40;
          ctx.save();
          ctx.translate(stampX + stampR, stampY + stampR);
          ctx.rotate(-10 * Math.PI / 180);
          ctx.beginPath();
          ctx.arc(0, 0, stampR, 0, Math.PI * 2);
          ctx.strokeStyle = "#BA2428";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, stampR - 4, 0, Math.PI * 2);
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.textAlign = "center";
          ctx.fillStyle = "#BA2428";
          ctx.font = "bold 18px serif";
          ctx.fillText("徕舞", 0, -5);
          ctx.fillText("私享", 0, 18);
          ctx.restore();

          // 8. 导出临时文件并保存相册
          wx.canvasToTempFilePath({
            canvas: canvas,
            x: 0,
            y: 0,
            width: W,
            height: H,
            destWidth: W * 2,
            destHeight: H * 2,
            fileType: "png",
            quality: 1,
            success: function(tempRes) {
              that.doSaveImageToAlbum(tempRes.tempFilePath);
            },
            fail: function(err) {
              wx.hideLoading();
              that.setData({ savingPoster: false });
              wx.showToast({ title: "海报生成失败，请重试", icon: "none" });
            }
          });
        }).catch(function(err) {
          wx.hideLoading();
          that.setData({ savingPoster: false });
          wx.showToast({ title: "海报生成异常", icon: "none" });
        });
      });
  },

  doSaveImageToAlbum: function(filePath) {
    var that = this;
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: function() {
        wx.hideLoading();
        that.setData({ savingPoster: false });
        try {
          if (wx.vibrateShort) wx.vibrateShort({ type: "heavy" });
        } catch (e) {}
        wx.showToast({
          title: "已保存到手机相册",
          icon: "success",
          duration: 2500
        });
      },
      fail: function(saveErr) {
        wx.hideLoading();
        that.setData({ savingPoster: false });
        if (saveErr && (saveErr.errMsg.indexOf("auth deny") >= 0 || saveErr.errMsg.indexOf("authorize") >= 0)) {
          wx.showModal({
            title: "需要相册保存权限",
            content: "海报已制作完毕，请在设置中开启“添加到相册”权限以便保存",
            confirmText: "去开启",
            cancelText: "长按保存",
            success: function(mRes) {
              if (mRes.confirm) {
                wx.openSetting();
              } else {
                wx.previewImage({ urls: [filePath], current: filePath });
              }
            }
          });
        } else {
          wx.previewImage({
            urls: [filePath],
            current: filePath,
            success: function() {
              wx.showToast({ title: "长按图片即可保存到相册", icon: "none", duration: 3000 });
            }
          });
        }
      }
    });
  },

  onFeelingInput: function(e) {
    this.setData({ feeling: e.detail.value });
  },

  submitFeeling: function() {
    var that = this;
    var feeling = that.data.feeling.trim();
    if (!feeling) return;
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

  // 提交失败：如实提示，保留会员已写的内容，不伪造小桥的回复
  feelingFailed: function() {
    this.setData({ feelingSubmitting: false });
    wx.showToast({
      title: "网络微忙，请重试或微信联系小桥",
      icon: "none",
      duration: 2500
    });
  },

  noop: function() {},

  // 自动拉取失败：静默结束加载态，交给页面自己的空状态兜底，不弹原生黑框
  endLoadingQuietly: function() {
    this.setData({ loading: false });
  },

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
    that.setData({ splashFadeOut: true });
    setTimeout(function() {
      that.setData({ showSplash: false, splashFadeOut: false });
      that.setTabBarHidden(false);
    }, 500);
  },

  onReady: function() {
    // 开屏期间藏起底部胶囊栏（自定义 tabBar 是独立图层，z-index 盖不住它）
    this.setTabBarHidden(this.data.showSplash);
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, hidden: this.data.showSplash });
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

      this.loadData();
      this.loadCoachNote();
      this.loadPhotoComparisons();
      this.loadPhotos();
    }
  },

  onPullDownRefresh: function() {
    this.loadData();
    this.loadCoachNote();
    this.loadPhotoComparisons();
    this.loadPhotos();
    wx.stopPullDownRefresh();
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

