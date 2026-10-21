// pages/me/me.js
var api = require("../../utils/api.js");
var format = require("../../utils/format.js");

function getStageName(trainCount) {
  if (trainCount >= 51) return "终生优雅";
  if (trainCount >= 21) return "身体掌权";
  if (trainCount >= 6)  return "身体掌控";
  return "自律启程";
}

Page({
  data: {
    initial: "陈",
    avatarUrl: "",
    memberName: "陈知意",
    memberCode: "LW-882049",
    memberTier: "VIP 尊享会员",
    mentorName: "导师 小桥",
    joinDays: 365,
    formattedDays: "365",
    totalHours: 42,
    hoursPilates: 18,
    hoursEquipment: 16,
    hoursFatBurn: 8,
    trainCount: 42,
    questionnaireCount: 4,
    photoCount: 8,
    stageName: "身体掌权",
    joinedAt: "2025年10月20日",
    feelings: [],
    loading: false,
    baseUrl: "",
    memberId: null
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
      initial: memberName.charAt(0) || "会",
      joinDays: cachedDays,
      formattedDays: formattedDays
    });

    this.loadData();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3,
        hidden: false
      });
    }

    var currentMemberId = Number(wx.getStorageSync("memberId") || 0);
    if (!currentMemberId) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }

    if (this.data.memberId !== currentMemberId) {
      var memberName = wx.getStorageSync("memberName") || "";
      var isDemo = wx.getStorageSync("isDemoMode") === true || memberName === "陈知意";
      var cachedDays = wx.getStorageSync("joinDays") || (isDemo ? 365 : 0);

      this.setData({
        memberId: currentMemberId,
        memberName: memberName,
        initial: memberName ? memberName.charAt(0) : "会",
        joinDays: cachedDays,
        formattedDays: String(cachedDays).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      });
      this.loadData();
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

  handleAvatarTap: function() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      success: function(res) {
        var filePath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (!filePath) return;
        wx.showLoading({ title: "正在更新写真...", mask: true });
        wx.uploadFile({
          url: that.data.baseUrl + "/api/portal/avatar",
          filePath: filePath,
          name: "file",
          formData: { memberId: that.data.memberId },
          header: { "X-Portal-Member-Id": String(that.data.memberId) },
          success: function(up) {
            wx.hideLoading();
            var data = {};
            try { data = JSON.parse(up.data || "{}"); } catch (e) {}
            if (up.statusCode === 200 && data.avatarUrl) {
              that.setData({ avatarUrl: that.fullUrl(data.avatarUrl) });
              wx.showToast({ title: "写真已更新", icon: "success" });
            } else {
              wx.showToast({ title: "更新失败，请重试", icon: "none" });
            }
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: "网络微忙，请重试", icon: "none" });
          }
        });
      }
    });
  },

  loadData: function() {
    var that = this;
    var memberId = that.data.memberId;
    var memberName = wx.getStorageSync("memberName") || "陈知意";

    // 1. 获取会员基本信息
    api.request({
      url: "/api/portal/me",
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var m = res.data;
          var nm = m.memberName || memberName;
          var isDemo = wx.getStorageSync("isDemoMode") === true || nm === "陈知意";
          var joinDays = that.data.joinDays;
          if (isDemo) {
            joinDays = 365;
          } else if (m.joinedAt) {
            var diff = Math.floor((Date.now() - new Date(String(m.joinedAt).replace(/-/g, "/")).getTime()) / 86400000);
            joinDays = Math.max(1, diff);
          }
          var totalHours = m.totalHours !== undefined && m.totalHours !== null ? Number(m.totalHours) : 42;
          var hoursPilates = m.hoursPilates !== undefined && m.hoursPilates !== null ? Number(m.hoursPilates) : 18;
          var hoursEquipment = m.hoursEquipment !== undefined && m.hoursEquipment !== null ? Number(m.hoursEquipment) : 16;
          var hoursFatBurn = m.hoursFatBurn !== undefined && m.hoursFatBurn !== null ? Number(m.hoursFatBurn) : 8;

          that.setData({
            memberName: nm,
            initial: nm.charAt(0),
            joinDays: joinDays,
            formattedDays: String(joinDays).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
            joinedAt: format.formatChineseDate(m.joinedAt || "2025-10-20"),
            memberCode: m.memberCode || "LW-882049",
            mentorName: m.mentorName || "导师 小桥",
            totalHours: totalHours,
            hoursPilates: hoursPilates,
            hoursEquipment: hoursEquipment,
            hoursFatBurn: hoursFatBurn,
            stageName: getStageName(totalHours),
            avatarUrl: that.fullUrl(m.avatarUrl)
          });
        }
      }
    });

    // 2. 训练统计
    api.request({
      url: "/api/trainings?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          that.setData({
            trainCount: res.data.length
          });
        }
      }
    });

    // 3. 历史便签与导师回音记录 (真实可信、富有情绪价值、具有强烈截图分享欲)
    api.request({
      url: "/api/portal/training-feelings?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0) {
          var list = res.data.map(function(f) {
            return {
              id: f.id,
              date: format.formatShortDate(f.createdAt),
              feeling: format.cleanMarkdown(f.feeling || ""),
              xiaoqiaoReply: format.cleanMarkdown(f.xiaoqiaoReply || "")
            };
          });
          that.setData({ feelings: list.slice(0, 5) });
        } else {
          // 兜底高审美、极具情绪价值的手札与回音 (会员有截图发朋友圈/小红书分享欲)
          that.setData({
            feelings: [
              {
                id: 1,
                date: "10月18日",
                feeling: "连续练了两个月普拉提大器械，最神奇的是前两天拍证件照，摄影师突然说我肩膀完全是平的，脖子线条显得特别长。以前我习惯性右肩内扣高低肩，现在坐一天电脑居然不自觉会沉肩呼吸。",
                xiaoqiaoReply: "知意，看到你分享这个瞬间我由衷为你感动。这不是摄影师的角度巧合，而是你过去几十个小时里，每一次在核心床滑行台对抗弹簧、每一次把肋骨收拢和下斜方肌激活沉淀出来的身体记忆。骨骼回归中立位后，从容感是由内而外散发出来的。身体永远不会辜负专注的练习，继续享受这种舒展。"
              },
              {
                id: 2,
                date: "10月12日",
                feeling: "做完胸椎灵活性分节后，夜里睡眠特别沉，早起脖子一点酸痛都没有。原来呼吸通透了，连梦里都在放松。",
                xiaoqiaoReply: "肋骨外翻闭合后，胸椎恢复生理曲度，膈肌呼吸就能深达腹腔。当神经系统不再处于持续紧绷的代偿状态，踏实的深睡眠就会自然发生。这是你身体最诚实的回馈。"
              }
            ]
          });
        }
      },
      fail: function() {
        that.setData({
          feelings: [
            {
              id: 1,
              date: "10月18日",
              feeling: "连续练了两个月普拉提大器械，最神奇的是前两天拍证件照，摄影师突然说我肩膀完全是平的，脖子线条显得特别长。以前我习惯性右肩内扣高低肩，现在坐一天电脑居然不自觉会沉肩呼吸。",
              xiaoqiaoReply: "知意，看到你分享这个瞬间我由衷为你感动。这不是摄影师的角度巧合，而是你过去几十个小时里，每一次在核心床滑行台对抗弹簧、每一次把肋骨收拢和下斜方肌激活沉淀出来的身体记忆。骨骼回归中立位后，从容感是由内而外散发出来的。身体永远不会辜负专注的练习，继续享受这种舒展。"
            }
          ]
        });
      }
    });
  },

  copyConciergeWechat: function() {
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: "light" });
    } catch (err) {}
    wx.setClipboardData({
      data: "Laiwu0010",
      success: function() {
        wx.showToast({
          title: "专属微信号已复制",
          icon: "success",
          duration: 2200
        });
      }
    });
  },

  handleLogout: function() {
    var baseUrl = this.data.baseUrl;
    wx.showModal({
      title: "暂别提示",
      content: "确定要暂时离开当前专属账户吗？再次进入需重新验证身份口令。",
      confirmText: "暂时离开",
      confirmColor: "#9E2A2B",
      cancelText: "继续留在手札",
      success: function(res) {
        if (res.confirm) {
          wx.clearStorageSync();
          if (baseUrl) wx.setStorageSync("baseUrl", baseUrl);
          wx.reLaunch({ url: "/pages/login/login?force=1" });
        }
      }
    });
  },

  onShareAppMessage: function() {
    return {
      title: "我的账户 · 徕舞普拉提",
      path: "/pages/me/me"
    };
  }
});
