var navUtil = require("../../utils/nav.js");
var api = require("../../utils/api.js");

var VENUE_DATA = [
  { id: 2, title: "高定美学大器械", name: "高定美学大器械", tag: "01 / 大器械区", desc: "高定身材美学器械课，细心雕琢每一寸肌肉", imageUrl: "/images/venue/venue-1.png" },
  { id: 3, title: "精品普拉提", name: "精品普拉提", tag: "02 / 精品普拉提", desc: "精准唤醒深层失忆肌肉。在这里，我们不练粗壮的硬块，只练拉长的线条，让每一次滑动都在为你的气质塑形。", imageUrl: "/images/venue/venue-2.png" },
  { id: 4, title: "维秘减脂超模营", name: "维秘减脂超模营", tag: "03 / 维密超模营", desc: "全明采光高定空间，打造沉浸式超模训练场，将训练变成一场治愈身心的自我唤醒。", imageUrl: "/images/venue/venue-3.png" },
  { id: 5, title: "1V1私教室", name: "1V1私教室", tag: "04 / 1V1私教室", desc: "一人一方案，从呼吸模式到骨骼排列，为你带来一场深度放松与气质重塑的奢享体验。", imageUrl: "/images/venue/venue-4.png" }
];

var TEAM_DATA = [
  { id: 1, name: "小桥", roleTitle: "创始人 / 教学主理人", avatarUrl: "/images/team/yueke/coach-11445.jpg" },
  { id: 6, name: "何老师", roleTitle: "资深塑形教练", avatarUrl: "/images/team/yueke/coach-11623.jpg" },
  { id: 7, name: "翠翠", roleTitle: "资深塑形教练", avatarUrl: "/images/team/yueke/coach-11622.jpg" },
  { id: 8, name: "曹湘湘", roleTitle: "资深塑形教练", avatarUrl: "/images/team/yueke/coach-11621.jpg" },
  { id: 9, name: "左左", roleTitle: "资深塑形教练", avatarUrl: "/images/team/yueke/coach-11620.jpg" },
  { id: 10, name: "汪老师", roleTitle: "资深塑形教练", avatarUrl: "/images/team/yueke/coach-11619.jpg" }
];

var OFFERINGS_DATA = [
  {
    id: 1,
    name: "精选普拉提",
    summary: "深层核心唤醒 · 脊柱逐节舒展 · 呼吸优雅重构",
    highlight: "沉浸于轻柔专注的呼吸律动中，由内而外唤醒深层盆底肌与腹横肌，释放肩颈与背部日常紧绷，重塑轻盈挺拔的女性仪态与柔韧力量。",
    imageUrl: "/images/courses_original/pilates.jpg"
  },
  {
    id: 2,
    name: "高定大器械",
    summary: "德国原木核心床 · 弹簧离心雕刻 · 关节零负担延展",
    highlight: "在高精度弹簧阻力的精妙对抗中，精准激活日常难以触及的深层细小肌群，重塑纤细修长线条，重获骨盆中立与挺拔流畅的力学美感。",
    imageUrl: "/images/courses_original/equipment.jpg"
  },
  {
    id: 3,
    name: "维密减脂超模班",
    summary: "间歇心率节律 · 天鹅颈直角肩雕刻 · 臀腿比例重塑",
    highlight: "结合普拉提精细控制与轻盈燃脂节律，集中雕琢锁骨线条、天鹅颈与紧致腰腹弧度，提拉紧致下半身线条，收获如超模般舒展挺拔的从容气场。",
    imageUrl: "/images/courses_original/fat_burn.jpg"
  },
  {
    id: 5,
    name: "私教",
    summary: "主理团队全维度定制 · 专属体态档案 · 一对一私享雕琢",
    highlight: "专注你的每一次呼吸节律与发力细节，根据个人身体状态与周期节奏量身定制专属方案，用细腻手感与专业口令，陪伴你见证身体的每一次从容蜕变。",
    imageUrl: "/images/courses_original/private.jpg"
  },
  {
    id: 4,
    name: "瑜伽",
    summary: "经络柔韧流转 · 正念深层觉知 · 身心沉静滋养",
    highlight: "在静谧温润的氛围中跟随呼吸舒展全身筋膜，平复日常繁杂情绪与疲惫，赋予关节深层润泽与舒展，唤醒身体内在的平衡与宁静之美。",
    imageUrl: "/images/courses_original/yoga.jpg"
  }
];

Page({
  data: {
    heroTitle: "了解徕舞",
    heroSubtitle: "",
    sec1Title: "场馆空间",
    sec1Intro: "柔和漫射日光、天然实木大器械与私密更衣室，营造沉静专注的练习氛围。",
    sec2Title: "同行导师",
    sec2Intro: "深耕女子塑形与体态矫正，用细腻口令与精准触觉纠正，守护每次发力安全。",
    sec3Title: "项目介绍",
    sec3Intro: "针对不同阶段与体态目标，由主理团队精心研发的核心训练体系。",
    venueList: VENUE_DATA,
    teamList: TEAM_DATA,
    offeringsList: OFFERINGS_DATA,
    baseUrl: ""
  },

  navBack: function() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: "/pages/me/me" });
    }
  },

  onLoad: function() {
    this.setData({ nav: navUtil.getNavMetrics() });
    this.setData({ baseUrl: api.getBaseUrl() });
    this.fetchAllBrandData();
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1,
        hidden: false
      });
    }
    if (this._shownBefore) {
      this.fetchAllBrandData();
    }
    this._shownBefore = true;
  },

  fullUrl: function(p) {
    return api.fullUrl(p);
  },

  onImgError: function(e) {
    var key = e.currentTarget.dataset.key;
    var idx = Number(e.currentTarget.dataset.index);
    if (this.data[key] && this.data[key][idx]) {
      var itemKey = key + "[" + idx + "].imgFailed";
      this.setData({ [itemKey]: true });
    }
  },

  fetchAllBrandData: function() {
    var that = this;

    // 0. 同步页面主标题与板块文案（不再显示 heroSubtitle）
    api.request({
      url: "/api/portal/brand-settings",
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          that.setData({
            heroTitle: res.data.heroTitle || that.data.heroTitle,
            sec1Title: res.data.sec1Title || that.data.sec1Title,
            sec1Intro: res.data.sec1Intro || that.data.sec1Intro,
            sec2Title: res.data.sec2Title || that.data.sec2Title,
            sec2Intro: res.data.sec2Intro || that.data.sec2Intro,
            sec3Title: res.data.sec3Title || that.data.sec3Title,
            sec3Intro: res.data.sec3Intro || that.data.sec3Intro
          });
        }
      }
    });

    // 1. 同步空间列表
    // 注意：只要接口正常返回，就以接口为准——哪怕是空数组。
    // 以前写成 `res.data.length > 0` 才覆盖，后台把场馆全部停用后，
    // 前端会退回包内这份旧快照，会员看到的还是已经删掉的空间。
    api.request({
      url: "/api/portal/venue",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          var mapped = res.data.map(function(v) {
            return {
              id: v.id,
              imageUrl: api.fullUrl(v.imageUrl),
              name: v.title || v.name || "空间实景",
              desc: v.desc || "",
              imgFailed: false
            };
          });
          that.setData({ venueList: mapped });
        }
      },
      fail: function() {
        // 保留预设包内数据，避免断网或加载延迟时空白
      }
    });

    // 2. 同步导师阵容（同上：接口说了算，停用的导师必须立刻消失）
    api.request({
      url: "/api/portal/team",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          var mappedTeam = res.data.map(function(t) {
            return {
              id: t.id,
              name: t.name,
              roleTitle: t.roleTitle || "",
              avatarUrl: api.fullUrl(t.avatarUrl),
              experience: t.experience || "",
              creds: t.creds || "",
              quote: t.quote || (t.bio ? t.bio : ""),
              imgFailed: false
            };
          });
          that.setData({ teamList: mappedTeam });
        }
      },
      fail: function() {
        // 保留预设包内数据，避免断网或加载延迟时空白
      }
    });

    // 3. 同步课程介绍（同上）
    api.request({
      url: "/api/portal/offerings",
      success: function(res) {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          var mappedOfferings = res.data.map(function(o) {
            var rawImg = o.imageUrl || o.image_url || "";
            var name = o.name || "";
            var finalImg = rawImg;
            // 优先使用用户后台上传的 100% 原始课程实拍大图（绝不改格式、绝不加模糊滤镜）
            if (name.indexOf("普拉提") >= 0) finalImg = "/images/courses_original/pilates.jpg";
            else if (name.indexOf("器械") >= 0) finalImg = "/images/courses_original/equipment.jpg";
            else if (name.indexOf("超模") >= 0 || name.indexOf("减脂") >= 0) finalImg = "/images/courses_original/fat_burn.jpg";
            else if (name.indexOf("瑜伽") >= 0) finalImg = "/images/courses_original/yoga.jpg";
            else if (name.indexOf("私教") >= 0) finalImg = "/images/courses_original/private.jpg";
            return {
              id: o.id,
              name: o.name,
              summary: o.summary || "",
              target: o.target || "",
              highlight: o.highlight || "",
              imageUrl: api.fullUrl(finalImg),
              imgFailed: false
            };
          });
          that.setData({ offeringsList: mappedOfferings });
        }
      },
      fail: function() {
        // 保留预设包内数据，避免断网或加载延迟时空白
      }
    });
  },

  previewVenueImage: function(e) {
    var current = e.currentTarget.dataset.src;
    var urls = this.data.venueList.map(function(v) {
      return v.imageUrl;
    }).filter(Boolean);
    if (!urls.length) return;
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  previewTeamImage: function(e) {
    var current = e.currentTarget.dataset.src;
    var urls = this.data.teamList.map(function(t) {
      return t.avatarUrl;
    }).filter(Boolean);
    if (!urls.length) return;
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  onShareTimeline: function() {
    return { title: "徕舞女子塑形 · 约一节课" };
  },

  onShareAppMessage: function() {
    return {
      title: "徕舞女子塑形 · 约一节课",
      path: "/pages/brand/brand"
    };
  }
});
