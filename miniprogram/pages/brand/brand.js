// pages/brand/brand.js

var VENUE_DATA = [
  {
    id: 1,
    imageUrl: "/images/venue/venue-1.jpg",
    tag: "01 / 核心床静修区",
    name: "静谧大器械空间",
    desc: "德国原装进口实木核心床，配合温润漫射自然光照，专注于深层小肌群与呼吸节律。"
  },
  {
    id: 2,
    imageUrl: "/images/venue/venue-2.jpg",
    tag: "02 / 私享测评室",
    name: "体态视觉与测量室",
    desc: "专业医学级体态摄影与测量网格，每一次骨盆前倾、脊柱曲度与高低肩的微调均被精准记录。"
  },
  {
    id: 3,
    imageUrl: "/images/venue/venue-3.jpg",
    tag: "03 / 普拉提大器械区",
    name: "大器械综合训练区",
    desc: "细腻顺滑的高精度弹簧阻力系统，在保护关节的同时，重塑肌肉的离心收缩记忆。"
  },
  {
    id: 4,
    imageUrl: "/images/venue/venue-4.jpg",
    tag: "04 / 茶憩与更衣区",
    name: "私密休憩与更衣室",
    desc: "温暖雪松植物香氛、戴森洗护备品与独立更衣空间，让运动前后的每一刻都从容松弛。"
  }
];

var TEAM_DATA = [
  {
    id: 1,
    name: "小桥",
    roleTitle: "创始人 / 教学主理人",
    avatarUrl: "/images/team/team-1.jpg",
    experience: "12 年普拉提与运动解剖研习",
    creds: "PMA 国际认证普拉提导师 · 脊柱侧弯与体态力学康复认证",
    quote: "“不追求花哨夸张的高难动作，而是在每一次深长呼吸里找准深层核心，让紧绷的脊柱自然舒展。”"
  },
  {
    id: 2,
    name: "嘉敏",
    roleTitle: "核心床与体态导师",
    avatarUrl: "/images/team/team-2.jpg",
    experience: "8 年普拉提大器械教学",
    creds: "骨盆稳定性纠正导师 · 下肢力线与假胯宽改善专家",
    quote: "“口令细腻温和，帮你在安全舒适的器械对抗中建立骨盆中立位，找回身体原本的挺拔。”"
  },
  {
    id: 3,
    name: "若琳",
    roleTitle: "维密体态与塑形导师",
    avatarUrl: "/images/team/team-3.jpg",
    experience: "6 年女性形体塑形研习",
    creds: "维密超模体态训练认证 · 产后腹直肌与盆底肌深度修复导师",
    quote: "“用柔和而坚定的节律唤醒沉睡小肌群，雕刻修长紧致的线条，让身体呈现由内而外的松弛感。”"
  }
];

var OFFERINGS_DATA = [
  {
    id: "pilates",
    num: "01",
    name: "精选普拉提",
    enName: "CURATED PILATES",
    summary: "垫上核心激活 · 呼吸模式调整 · 脊柱逐节灵动",
    target: "久坐办公肩颈紧绷、初次接触普拉提、需要建立身体深层觉知的练习者。",
    highlight: "垫上核心控制与小工具（普拉提球、弹力阻力圈）紧密结合，循序渐进唤醒腹横肌与盆底肌，改善胸椎灵活性与肋骨外翻。"
  },
  {
    id: "equipment",
    num: "02",
    name: "高定大器械",
    enName: "BESPOKE EQUIPMENT",
    summary: "弹簧阻力精准对抗 · 关节减压 · 离心深层雕刻",
    target: "期望精准塑形、改善骨盆倾斜/假胯宽、需要大器械精准辅助发力的会员。",
    highlight: "利用滑行台与各级阻力弹簧，在不稳定支撑面中激活深层肌群，强化核心抗旋转与抗伸展能力，塑造修长紧实无赘肉的线条。"
  },
  {
    id: "fat_burn",
    num: "03",
    name: "维密减脂超模班",
    enName: "RUNWAY SCULPT & BURN",
    summary: "间歇燃脂节律 · 直角肩天鹅颈雕刻 · 臀腿比例重塑",
    target: "备婚出镜、产后减脂塑形、追求紧致挺拔身姿与修长四肢线条的学员。",
    highlight: "将普拉提精细控制与科学燃脂心率结合，集中雕刻锁骨、下颌线、腹斜肌与臀部曲线，高效燃脂同时防止肌肉代偿粗壮。"
  },
  {
    id: "yoga",
    num: "04",
    name: "瑜伽",
    enName: "MINDFUL YOGA",
    summary: "经络柔韧舒展 · 正念呼吸引导 · 神经系统深度放松",
    target: "日常工作压力大、关节僵硬、入眠困难或需要身心深度修复的会员。",
    highlight: "沉静平缓的体式流转配合深长腹式呼吸，温和拉伸筋膜群，降低皮质醇水平，让身心在静谧中重获轻盈安宁。"
  },
  {
    id: "private",
    num: "05",
    name: "私教",
    enName: "PRIVATE MENTORSHIP",
    summary: "一对一定制方案 · 动态体态纠偏 · 全周期身心档案",
    target: "对隐私度与训练效果有极高要求、有产后修复/运动损伤/特殊体态诉求的会员。",
    highlight: "主理导师全程一对一专注观察发力细节，根据当日身体疲劳度与周期生理状态实时微调动作阻力与训练节奏，确保每节课的精准反馈。"
  }
];

Page({
  data: {
    venueList: VENUE_DATA,
    teamList: TEAM_DATA,
    offeringsList: OFFERINGS_DATA
  },

  onShow: function() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1,
        hidden: false
      });
    }
  },

  previewVenueImage: function(e) {
    var current = e.currentTarget.dataset.src;
    var urls = this.data.venueList.map(function(v) {
      return v.imageUrl;
    });
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  previewTeamImage: function(e) {
    var current = e.currentTarget.dataset.src;
    var urls = this.data.teamList.map(function(t) {
      return t.avatarUrl;
    });
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  onShareAppMessage: function() {
    return {
      title: "了解徕舞 · 专注体态与身心平衡的私享空间",
      path: "/pages/brand/brand"
    };
  }
});
