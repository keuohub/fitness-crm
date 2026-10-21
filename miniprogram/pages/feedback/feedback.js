var api = require("../../utils/api.js");
var format = require("../../utils/format.js");

function enrichLetterContent(rawText, memberName, reportType) {
  var name = memberName || wx.getStorageSync("memberName") || "亲爱的朋友";
  // 如果已是长文手札（>200字），保持原汁原味
  if (rawText && rawText.length > 200) {
    return rawText;
  }

  // 提取问卷中的核心诉求或困扰
  var concern = "减脂塑形、体态复位与线条精雕";
  if (rawText) {
    var match = rawText.match(/评估重点[：:]\s*([^，,。]+)/);
    if (match && match[1]) {
      concern = match[1];
    } else if (rawText.indexOf("减脂") >= 0 || rawText.indexOf("体态") >= 0) {
      concern = rawText.replace(/建议.*为主。?/, "").replace(/^评估重点[：:]\s*/, "").trim();
    }
  }

  return name + "，见字如面。\n\n"
    + "很高兴在徕舞与你相遇。认真读完了你填写的身体问卷与诉求，字里行间，我读懂了你对挺拔优雅身形的渴望，更读懂了你在生活琐碎与工作压力中对抗疲惫的不易。\n\n"
    + "现代生活总在向女性索取兼顾与迎合，而身体往往是最先默默替我们承受压力的容器：肩颈不自觉紧绷防御、骨盆代偿倾斜、核心无力松弛……那些所谓的“圆肩驼背”、“假胯宽”，从来不是你的错，而是身体在替你承受重压时，用笨拙的方式在保护你。\n\n"
    + "【为你定制的专属三阶蜕变规划】\n"
    + "✦ 第一阶段 · 觉知与舒展（第 1-10 节）：\n"
    + "通过普拉提大器械核心床（Reformer），重新找回深层横膈膜呼吸。卸下肩颈日常无意识的耸肩代偿，唤醒腹横肌与骨盆底肌，让倾斜的骨盆自然中立回弹，找回身体中轴的平衡点。\n\n"
    + "✦ 第二阶段 · 激活与精雕（第 11-30 节）：\n"
    + "针对【" + concern + "】等核心诉求，进行一对一器械精雕。精雕直角肩、天鹅颈与紧致臀线，每一次核心发力都在重塑肌肉走向，让原本下垂分散的线条聚拢挺拔。\n\n"
    + "✦ 第三阶段 · 掌控与终生优雅（第 31 节及以后）：\n"
    + "挺拔从容不再需要你“刻意收腹挺胸”，它将成为你呼吸自带的骨骼记忆。无论站立还是行走，都自带松弛而坚定的大女主从容气场。\n\n"
    + "【未来的身心展望】\n"
    + "当体态归位，你将体验到身体久违的轻盈：早晨醒来不再背痛僵硬，久坐后腰椎依然有力支撑；穿衣不再为了遮掩体态缺陷，而是自信衬托你的骨相线条与生命力。\n\n"
    + "【就算问题解决了，坚持的意义是什么？】\n"
    + "很多学员问我：“小桥，等我体态纠正好了、线条好看了，是不是就可以不用练了？”\n"
    + "我想真诚地告诉你：解决体态问题，只是我们相遇的起点。\n"
    + "健身与普拉提，从来不是为了迎合外界挑剔的目光，而是为了在这喧嚣的世界里，有一张核心床是完全属于你自己的避风港。无论生活如何向你索取，在这张垫子上，每一个呼吸与延展，都是你对自我的最高偏爱。\n\n"
    + "坚持的真正意义，是无论岁月如何流转，你始终将身体的掌控权紧紧握在自己手中——自律成骨骼，岁月即礼赞。\n\n"
    + "小桥会一直陪在你身边，为你记录每一寸蜕变。\n\n"
    + "—— 小桥 · 专属私教手札";
}

Page({
  data: {
    latestFeedback: null,
    historyFeedbacks: [],
    latestExpanded: true, // 默认展开首封信件，呈现充实温度
    loading: true,
    error: "",
    baseUrl: "",
    memberId: null,
    memberName: "",
    joinDays: 0,
    trainCount: 0
  },

  onLoad: function() {
    var memberId = wx.getStorageSync("memberId");
    if (!memberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    var baseUrl = wx.getStorageSync("baseUrl") || api.DEFAULT_BASE_URL;
    var memberName = wx.getStorageSync("memberName") || "身体掌权者";
    var joinDays = Number(wx.getStorageSync("joinDays") || 0);
    var trainCount = Number(wx.getStorageSync("trainCount") || 0);

    this.setData({
      baseUrl: baseUrl,
      memberId: Number(memberId),
      memberName: memberName,
      joinDays: joinDays,
      trainCount: trainCount
    });
    this.loadData();
    this.loadTrainings();

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

  loadTrainings: function() {
    var that = this;
    var memberId = that.data.memberId;
    api.request({
      url: "/api/trainings?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          that.setData({ trainCount: res.data.length });
          wx.setStorageSync("trainCount", res.data.length);
        }
      }
    });
  },

  loadData: function() {
    var that = this;
    var memberId = that.data.memberId;
    var memberName = that.data.memberName;

    api.request({
      url: "/api/ai/period-report?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var reports = Array.isArray(res.data) ? res.data : (res.data.reports || []);
          var items = reports.map(function(r) {
            var rawClean = format.cleanMarkdown(r.content || "");
            var fullRichContent = enrichLetterContent(rawClean, memberName, r.reportType);
            return {
              id: r.id || Math.random(),
              reportType: r.reportType || "feedback",
              typeLabel: format.formatReportType(r.reportType),
              date: format.formatChineseDate(r.generatedAt || r.createdAt),
              content: fullRichContent,
              summary: fullRichContent.slice(0, 150) + (fullRichContent.length > 150 ? "..." : ""),
              expanded: false
            };
          });
          var latest = items.length > 0 ? items[0] : null;
          var history = items.length > 1 ? items.slice(1) : [];
          that.setData({ latestFeedback: latest, historyFeedbacks: history, loading: false });
        } else {
          that.setData({ latestFeedback: null, historyFeedbacks: [], loading: false });
        }
      },
      fail: function() {
        that.setData({ latestFeedback: null, historyFeedbacks: [], loading: false });
      }
    });
  },

  fallbackDemo: function() {
    var that = this;
    var isDemo = wx.getStorageSync("isDemoMode") === true;
    if (!isDemo) {
      that.setData({ loading: false });
      return;
    }
    var reportStr = wx.getStorageSync("demo_reports") || "[]";
    var reports = JSON.parse(reportStr).map(function(r) {
      var rawClean = format.cleanMarkdown(r.content || "");
      var fullRichContent = enrichLetterContent(rawClean, "知意", r.reportType);
      return {
        id: Math.random(),
        reportType: r.reportType || "feedback",
        typeLabel: format.formatReportType(r.reportType),
        date: format.formatChineseDate(r.generatedAt || r.createdAt),
        content: fullRichContent,
        summary: fullRichContent.slice(0, 150) + "...",
        expanded: false
      };
    });
    var latest = reports.length > 0 ? reports[0] : null;
    var history = reports.length > 1 ? reports.slice(1) : [];
    that.setData({ latestFeedback: latest, historyFeedbacks: history, loading: false });
  },

  toggleLatest: function() {
    this.setData({ latestExpanded: !this.data.latestExpanded });
  },

  toggleItem: function(e) {
    var index = e.currentTarget.dataset.index;
    var items = this.data.historyFeedbacks;
    items[index].expanded = !items[index].expanded;
    this.setData({ historyFeedbacks: items });
  },

  goToFeeling: function() {
    // growth 不是 tabBar 页面，switchTab 到这里会静默失败（点了没反应）
    var pages = getCurrentPages();
    if (pages && pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: "/pages/stars/stars" });
  },

  contactXiaoqiao: function() {
    wx.setClipboardData({
      data: "Laiwu0010",
      success: function() {
        wx.showModal({
          title: "小桥专属微信已复制",
          content: "已为你复制小桥微信号【Laiwu0010】。\n随时交流身体体感、饮食疑惑与私教排课。",
          showCancel: false,
          confirmText: "知道了"
        });
      }
    });
  },

  endLoadingQuietly: function() {
    this.setData({ loading: false });
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, hidden: false });
    }

    var currentMemberId = Number(wx.getStorageSync("memberId") || 0);
    if (!currentMemberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }

    var memberName = wx.getStorageSync("memberName") || "身体掌权者";
    var joinDays = Number(wx.getStorageSync("joinDays") || 0);
    var trainCount = Number(wx.getStorageSync("trainCount") || 0);

    this.setData({
      memberName: memberName,
      joinDays: joinDays,
      trainCount: trainCount
    });

    if (this.data.memberId !== currentMemberId) {
      this.setData({
        memberId: currentMemberId,
        latestFeedback: null,
        historyFeedbacks: [],
        loading: true
      });
      this.loadData();
      this.loadTrainings();
    }
  },

  onPullDownRefresh: function() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage: function() {
    return {
      title: "小桥的来信 · 徕舞私享手札",
      path: "/pages/stars/stars"
    };
  },

  onShareTimeline: function() {
    return {
      title: "小桥的来信 · 徕舞私享手札",
      query: ""
    };
  }
});
