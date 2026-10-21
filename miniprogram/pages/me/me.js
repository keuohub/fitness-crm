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
    memberPhone: "138 **** 8820",
    memberTier: "VIP 尊享会员",
    mentorName: "导师 小桥",
    joinDays: 365,
    formattedDays: "365",
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
          that.setData({
            memberName: nm,
            initial: nm.charAt(0),
            joinDays: joinDays,
            formattedDays: String(joinDays).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
            joinedAt: format.formatChineseDate(m.joinedAt || "2025-10-20"),
            memberCode: m.memberCode || "LW-882049",
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
            trainCount: res.data.length,
            stageName: getStageName(res.data.length)
          });
        }
      }
    });

    // 3. 历史便签与导师回音记录
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
          // 兜底优质便签与回音历史
          that.setData({
            feelings: [
              {
                id: 1,
                date: "10月18日",
                feeling: "今天做完核心床滑行台，感觉整个后背完全打开了，走路时肩膀终于没有往下塌的感觉。",
                xiaoqiaoReply: "特别为你高兴！这是深层背阔肌和下斜方肌真正建立起自主支撑力了，继续保持这份觉知。"
              },
              {
                id: 2,
                date: "10月14日",
                feeling: "做完胸椎灵活性分节后，夜里睡眠特别沉，早起脖子一点酸痛都没有。",
                xiaoqiaoReply: "肋骨外翻闭合后，膈肌呼吸恢复顺畅，副交感神经就能更好放松。这是身体给你最踏实的回馈。"
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
              feeling: "今天做完核心床滑行台，感觉整个后背完全打开了，走路时肩膀终于没有往下塌的感觉。",
              xiaoqiaoReply: "特别为你高兴！这是深层背阔肌和下斜方肌真正建立起自主支撑力了，继续保持这份觉知。"
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
