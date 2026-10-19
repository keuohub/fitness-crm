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
    initial: "",
    avatarUrl: "",
    memberName: "",
    joinDays: 0,
    trainCount: 0,
    questionnaireCount: 0,
    photoCount: 0,
    stageName: "自律启程",
    memberCode: "",
    joinedAt: "",
    desiredState: "",
    feelings: [],
    bookings: [],
    loading: true,
    baseUrl: "",
    memberId: null,
    formattedDays: "0"
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
      memberName: memberName,
      initial: memberName.charAt(0),
      joinDays: cachedDays,
      formattedDays: formattedDays
    });
    this.loadData();

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

  // 后端返回的是 /member-avatars/xxx.jpg 这样的相对路径，这里补成完整地址
  fullUrl: function(p) {
    if (!p) return "";
    if (p.indexOf("http") === 0) return p;
    return (this.data.baseUrl || "") + p;
  },

  // 换头像：从手机相册（或拍照）选一张，上传后立刻刷新
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
        wx.showLoading({ title: "上传中", mask: true });
        wx.uploadFile({
          url: that.data.baseUrl + "/api/portal/avatar",
          filePath: filePath,
          name: "file",
          formData: { memberId: that.data.memberId },
          // 只带身份头，Content-Type 交给 wx.uploadFile 自己生成 multipart
          header: { "X-Portal-Member-Id": String(that.data.memberId) },
          success: function(up) {
            wx.hideLoading();
            var data = {};
            try { data = JSON.parse(up.data || "{}"); } catch (e) {}
            if (up.statusCode === 200 && data.avatarUrl) {
              that.setData({ avatarUrl: that.fullUrl(data.avatarUrl) });
              wx.showToast({ title: "已换好", icon: "success" });
            } else {
              wx.showToast({ title: "换头像失败，请重试", icon: "none" });
            }
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: "换头像失败，请重试", icon: "none" });
          }
        });
      }
    });
  },

  loadData: function() {
    var that = this;
    var memberId = that.data.memberId;
    var memberName = wx.getStorageSync("memberName") || "会员";
    var baseUrl = that.data.baseUrl;
    that.setData({ memberName: memberName, initial: memberName.charAt(0) });

    // 会员档案（会员身份可读的接口，只返回安全字段）
    api.request({
      url: "/api/portal/me",
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var m = res.data;
          var nm = m.memberName || memberName;
          var isDemo = wx.getStorageSync("isDemoMode") === true || nm === "陈知意";
          var joinDays = 0;
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
            joinedAt: format.formatChineseDate(m.joinedAt),
            memberCode: m.memberCode || "",
            avatarUrl: that.fullUrl(m.avatarUrl),
            loading: false
          });
        } else {
          var isDemo = wx.getStorageSync("isDemoMode") === true || memberName === "陈知意";
          that.setData({
            loading: false,
            joinDays: isDemo ? 365 : (wx.getStorageSync("joinDays") || 0)
          });
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
          that.setData({ trainCount: trainings.length, stageName: getStageName(trainings.length) });
        }
        that.setData({ loading: false });
      },
      fail: function() {
        that.setData({ loading: false });
      }
    });

    // 训练感受
    api.request({
      url: "/api/portal/training-feelings?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var feelings = (Array.isArray(res.data) ? res.data : []).map(function(f) {
            return {
              id: f.id,
              date: format.formatShortDate(f.createdAt),
              feeling: format.cleanMarkdown(f.feeling || ""),
              xiaoqiaoReply: format.cleanMarkdown(f.xiaoqiaoReply || "")
            };
          });
          that.setData({ feelings: feelings.slice(0, 3) });
        }
      },
      fail: function() {}
    });

    // 预约
    api.request({
      url: "/api/portal/course-booking?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var bookings = (Array.isArray(res.data) ? res.data : []).map(function(b) {
            return {
              id: b.id,
              courseType: b.courseType || "私教课程",
              bookingDate: format.formatShortDate(b.bookingDate),
              bookingTime: b.bookingTime || "",
              status: b.status || "confirmed"
            };
          });
          that.setData({ bookings: bookings.slice(0, 3) });
        }
      },
      fail: function() {}
    });

    // 问卷测评次数
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

    // 体态照片组数
    api.request({
      url: "/api/photos?memberId=" + memberId,
      header: that.apiHeaders(),
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var p = Array.isArray(res.data) ? res.data : [];
          that.setData({ photoCount: p.length });
        }
      },
      fail: function() {}
    });
  },

  fallbackDemo: function() {
    var that = this;
    // 演示会话才允许展示演示档案（口令进入 / 缓存里就是陈知意）
    // 真实会员请求失败时保留他自己的信息，绝不换成「陈知意」
    var isDemo = wx.getStorageSync("isDemoMode") === true
      || wx.getStorageSync("memberName") === "陈知意"
      || that.data.memberName === "陈知意";
    if (!isDemo) {
      that.endLoadingQuietly();
      return;
    }
    if (that.data.trainCount > 0) return;
    var name = wx.getStorageSync("memberName") || "陈知意";
    var trainStr = wx.getStorageSync("demo_trainings") || "[]";
    var trainCount = JSON.parse(trainStr).length;
    that.setData({
      memberName: name,
      initial: name.charAt(0),
      joinDays: 365,
      trainCount: trainCount,
      questionnaireCount: 3,
      photoCount: 8,
      stageName: getStageName(trainCount),
      feelings: [],
      bookings: [],
      loading: false
    });
  },

  navigateToBooking: function() {
    wx.navigateTo({ url: "/pages/booking/booking" });
  },

  // 自动拉取失败：静默结束加载态，交给空状态兜底，不弹原生黑框
  endLoadingQuietly: function() {
    this.setData({ loading: false });
  },

  handleSwitchAccount: function() {
    var baseUrl = this.data.baseUrl;
    wx.showModal({
      title: "切换会员档案",
      content: "确定要切换至其他会员的专属档案吗？",
      confirmText: "去切换",
      confirmColor: "#BA2428",
      cancelText: "取消",
      success: function(res) {
        if (res.confirm) {
          wx.clearStorageSync();
          if (baseUrl) wx.setStorageSync("baseUrl", baseUrl);
          wx.reLaunch({ url: "/pages/login/login?switch=1" });
        }
      }
    });
  },

  handleLogout: function() {
    var baseUrl = this.data.baseUrl;
    wx.showModal({
      title: "暂别提示",
      content: "确定要暂时离开当前专属手札吗？再次进入需使用您的专属口令",
      confirmText: "暂时离开",
      confirmColor: "#BA2428",
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

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, hidden: false });
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
        trainCount: 0,
        questionnaireCount: 0,
        photoCount: 0,
        feelings: [],
        bookings: [],
        loading: true
      });
      this.loadData();
    }
  },

  onPullDownRefresh: function() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage: function() {
    return {
      title: "徕舞健身 · 会员私享空间",
      path: "/pages/growth/growth"
    };
  },

  onShareTimeline: function() {
    return {
      title: "徕舞健身 · 会员私享空间",
      query: ""
    };
  }
});
