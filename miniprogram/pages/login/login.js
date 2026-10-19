var api = require("../../utils/api.js");

Page({
  data: {
    submitting: false,
    error: "",
    inviteCode: "",
    phoneSuffix: "",
    baseUrl: ""
  },

  onLoad: function(options) {
    // 若带 switch=1 或 force=1，表示用户主动要求切换账号，不自动重定向
    var isSwitching = options && (options.switch === "1" || options.force === "1");
    if (!isSwitching) {
      var memberId = wx.getStorageSync("memberId");
      if (memberId) {
        wx.switchTab({ url: "/pages/growth/growth" });
        return;
      }
    } else {
      // 主动切换账号：彻底清除旧会话所有残余
      var saved = wx.getStorageSync("baseUrl");
      wx.clearStorageSync();
      if (saved) wx.setStorageSync("baseUrl", saved);
    }
    var saved = wx.getStorageSync("baseUrl");
    this.setData({ baseUrl: saved || api.DEFAULT_BASE_URL });

    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"]
      });
    }
  },

  onCodeInput: function(e) {
    var val = (e.detail.value || "").trim().toUpperCase();
    this.setData({ inviteCode: val, error: "" });
  },

  onPhoneSuffixInput: function(e) {
    var val = (e.detail.value || "").trim();
    this.setData({ phoneSuffix: val, error: "" });
  },

  handleLogin: function() {
    var that = this;
    var code = (that.data.inviteCode || "").trim().toUpperCase();
    var suffix = (that.data.phoneSuffix || "").trim();

    if (!code) {
      that.setData({ error: "请输入专属邀请码" });
      return;
    }

    // 测试口令（测试阶段保留；正式上线前必须摘掉）
    var demoCodes = ["DEMO", "LAIWU2024", "LAIWU2025"];
    if (demoCodes.indexOf(code) > -1) {
      that.enterDemo();
      return;
    }

    that.setData({ submitting: true, error: "" });

    api.request({
      url: "/api/portal/login",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { portalCode: code, phoneSuffix: suffix },
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.memberId) {
          var data = res.data;
          var savedBase = that.data.baseUrl;
          // 全面彻底清除上一位会员的所有专属缓存，绝不串门
          wx.clearStorageSync();
          
          wx.setStorageSync("baseUrl", savedBase);
          wx.setStorageSync("memberId", data.memberId);
          wx.setStorageSync("memberName", data.memberName || "会员");
          wx.setStorageSync("loginExpires", Date.now() + 30 * 24 * 60 * 60 * 1000);
          wx.setStorageSync("isDemoMode", false);
          if (data.joinedAt) {
            var diff = Math.floor((Date.now() - new Date(String(data.joinedAt).replace(/-/g, "/")).getTime()) / 86400000);
            wx.setStorageSync("joinDays", Math.max(1, diff));
          }
          // 使用 reLaunch 彻底销毁旧的 Page 实例栈，100% 触发全新挂载
          wx.reLaunch({ url: "/pages/growth/growth" });
        } else {
          var errMsg = (res.data && res.data.error) ? res.data.error : "未找到该会员档案，请核对或联系小桥";
          that.setData({ submitting: false, error: errMsg });
        }
      },
      fail: function() {
        // 请求失败或超时：如实报错，绝不静默进演示模式
        that.setData({ submitting: false, error: "暂时连不上服务器，请稍后重试或联系小桥" });
      }
    });
  },

  // 测试口令专用：写入演示数据后进入首页
  enterDemo: function() {
    wx.setStorageSync("isDemoMode", true);
    wx.setStorageSync("memberId", 9);
    wx.setStorageSync("memberName", "陈知意");
    wx.setStorageSync("joinDays", 365);
    wx.setStorageSync("demo_data_loaded", true);
    wx.setStorageSync("demo_trainings", JSON.stringify([
      { trainingDate: "5月15日", type: "私教 · 骨盆与核心重塑", durationMinutes: 60, focusArea: "深层核心唤醒" },
      { trainingDate: "5月12日", type: "私教 · 天鹅颈与直角肩雕刻", durationMinutes: 60, focusArea: "肩颈松弛舒展" },
      { trainingDate: "5月08日", type: "私教 · 骨盆中立与臀线提升", durationMinutes: 60, focusArea: "体态优雅归位" }
    ]));
    wx.setStorageSync("demo_reports", JSON.stringify([
      {
        reportType: "月度体态蜕变手札",
        generatedAt: "2026年5月31日",
        content: "知意，见字如面。这个月每一次看你走上普拉提床，我都深深为你由内而外生出的松弛感感到欣喜。\n\n生活总在逼着现代女性去迎合、去兼顾、去追求完美，但在这张核心床上，你唯一要做的就是把注意力收回给自己。从最初肩颈紧绷、习惯性含胸防御，到现在躺在器械上呼吸能沉入腹底，骨盆自然回弹——你不再需要刻意挺胸来显得有精神，深层肌肉沉淀下来的力量，已经赋予你自带从容的底气与大女主气场。\n\n岁月总想带走胶原，但你流过的每一滴汗水，都在骨骼里铸就对抗时光的秩序。自律成骨骼，岁月即礼赞。小桥一直在你身边，陪你一寸一寸雕刻属于你的优雅与自由。"
      },
      {
        reportType: "季度蜕变复盘",
        generatedAt: "2026年4月30日",
        content: "亲爱的，这90天的沉淀，比你想象中更加震撼。从第一次动作时的生涩与自我怀疑，到现在每一次核心发力都稳如磐石、眼神笃定清澈。身体从不说谎，你的肩背线条越来越舒展紧致，那是任何外在修饰都给不了的挺拔生命力。继续以你最舒服的节奏生长，你配得上世间一切笃定与美好。"
      }
    ]));
    wx.switchTab({ url: "/pages/growth/growth" });
  },

  onShareAppMessage: function() {
    return {
      title: "徕舞健身 · 会员专属成长手札",
      path: "/pages/login/login"
    };
  },

  onShareTimeline: function() {
    return {
      title: "徕舞健身 · 会员专属成长手札",
      query: ""
    };
  }
});
