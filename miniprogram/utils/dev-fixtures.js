// utils/dev-fixtures.js · 开发预览假数据（仅 dev-preview.isPreview() 为 true 时被 api.js 使用）
// 字段名对齐后端 src/app/api/portal/*；不引用网络图。
// 图片分类：包内 /images/courses/*.jpg 实为体态/人像照（会员类），只允许出现在「徕舞之星」假数据；
// 课程、排课、老师、场馆一律不给图（走纯色/首字兜底），避免会员照混进课程页。
function pad2(n) { return ("0" + n).slice(-2); }
function day(offset) {
  var d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

var IMG = {
  pilates: "/images/courses/pilates.jpg",
  equipment: "/images/courses/equipment.jpg",
  fat_burn: "/images/courses/fat_burn.jpg",
  private: "/images/courses/private.jpg",
  yoga: "/images/courses/yoga.jpg"
};

var offerings = [
  { id: 1, num: "01", name: "高定私教课程", enName: "Private", summary: "一对一评估体态，按你的身体定制每节课的动作和强度。", target: "想系统改善体态、有旧伤或刚开始运动", highlight: "", imageUrl: "", sortOrder: 1, isActive: 1 },
  { id: 2, num: "02", name: "精品普拉提", enName: "Pilates", summary: "小班垫上普拉提，练核心、练控制、练呼吸。", target: "久坐、腰背紧、想练出线条", highlight: "", imageUrl: "", sortOrder: 2, isActive: 1 },
  { id: 3, num: "03", name: "维密减脂超模班", enName: "Sculpt", summary: "节奏型燃脂 + 臀腿塑形，一节课出一身汗。", target: "想减脂、提臀、练耐力", highlight: "", imageUrl: "", sortOrder: 3, isActive: 1 },
  { id: 4, num: "04", name: "高定大器械", enName: "Equipment", summary: "核心床、梯桶、椅子，器械辅助下做更精准的发力。", target: "有一定基础、想进阶", highlight: "", imageUrl: "", sortOrder: 4, isActive: 1 },
  { id: 5, num: "05", name: "瑜伽", enName: "Yoga", summary: "流动与伸展，课后身体松下来。", target: "所有人", highlight: "", imageUrl: "", sortOrder: 5, isActive: 1 }
];

var team = [
  { id: 1, name: "小桥", roleTitle: "主理人 · 普拉提导师", avatarUrl: "", bio: "预览数据：这里显示老师简介。真实内容来自后台「团队」里填写的 bio 字段。", experience: "教学 8 年", creds: "预览数据 · 资质示例", quote: "", sortOrder: 1, isActive: 1 },
  { id: 2, name: "Momo", roleTitle: "器械导师", avatarUrl: "", bio: "预览数据：老师简介示例。", experience: "", creds: "", quote: "", sortOrder: 2, isActive: 1 }
];

var stars = [
  { id: 1, name: "预览 · 会员A", avatarUrl: IMG.pilates, tag: "体态改善", quote: "预览数据：会员寄语示例。", joinDays: 120, trainCount: 36, courseType: "普拉提", journey: "相伴自律 120 天 · 36 节普拉提", sortOrder: 1, isActive: 1 },
  { id: 2, name: "预览 · 会员B", avatarUrl: IMG.fat_burn, tag: "减脂", quote: "预览数据：会员寄语示例。", joinDays: 90, trainCount: 28, courseType: "超模班", journey: "相伴自律 90 天 · 28 节超模班", sortOrder: 2, isActive: 1 },
  { id: 3, name: "预览 · 会员C", avatarUrl: IMG.yoga, tag: "放松", quote: "", joinDays: 60, trainCount: 18, courseType: "瑜伽", journey: "相伴自律 60 天 · 18 节瑜伽", sortOrder: 3, isActive: 1 }
];

var venue = [
  { id: 1, title: "器械教室", name: "器械教室", tag: "空间", desc: "", imageUrl: "", sortOrder: 1, isActive: 1 },
  { id: 2, title: "垫上教室", name: "垫上教室", tag: "空间", desc: "", imageUrl: "", sortOrder: 2, isActive: 1 }
];

function schedule() {
  var plan = [
    ["精品普拉提", "pilates", "boutique", "小桥", "A 教室", "10:00", "10:55", 3, 8, 5],
    ["高定大器械", "equipment", "boutique", "Momo", "器械教室", "14:00", "14:55", 4, 4, 2],
    ["维密减脂超模班", "fat_burn", "group", "小桥", "A 教室", "19:30", "20:25", 5, 12, 12],
    ["瑜伽", "yoga", "group", "Momo", "B 教室", "20:30", "21:25", 2, 10, 3],
    ["高定私教课程", "private", "private", "小桥", "私教室", "16:00", "16:55", 3, 1, 0]
  ];
  var list = [];
  var id = 9000;
  for (var d = 0; d < 7; d++) {
    plan.forEach(function(p, i) {
      if ((d + i) % 3 === 2) return;
      id++;
      list.push({
        id: id, courseName: p[0], courseKey: p[1], categoryType: p[2], coverImage: "",
        description: "", coachName: p[3], roomName: p[4], title: p[0],
        sessionDate: day(d), startTime: p[5], endTime: p[6], difficultyStars: p[7],
        capacity: p[8], bookedCount: p[9], remaining: p[8] - p[9], status: "open",
        bookedByMe: id === 9002, bookingId: id === 9002 ? 1 : null
      });
    });
  }
  return { sessions: list };
}

function cards() {
  return { cards: [{
    id: 1, cardTypeId: 1, name: "预览 · 普拉提 20 次卡", category: "count", status: "active",
    totalCount: 20, remainingCount: 12, validFrom: day(-60), validUntil: day(120),
    purchasedAt: day(-60), priceCents: 0, weeklyLimit: null, courseCategoryNames: ["精品普拉提"],
    transactions: [{ id: 1, type: "deduct", amount: -1, balanceAfter: 12, note: "上课扣次", createdAt: day(-2) + "T11:00:00.000Z" }]
  }] };
}

function bookings() {
  return { bookings: [{
    id: 1, session_id: 9002, status: "booked", booked_at: day(-1) + "T08:00:00.000Z", cancelled_at: null, cancel_reason: null,
    session_date: day(0), start_time: "14:00", end_time: "14:55", capacity: 4, booked_count: 2,
    course_name: "高定大器械", coach_name: "Momo", room_name: "器械教室"
  }] };
}

function me() {
  return {
    memberId: 0, memberName: "预览会员", memberCode: null, joinedAt: day(-120), avatarUrl: null,
    portalEnabled: 1, mentorName: null, status: null, gender: null,
    joinDays: 120, totalHours: 36,
    courseCounts: [{ key: "pilates", label: "精品普拉提", count: 20 }, { key: "equipment", label: "高定大器械", count: 16 }],
    trainingsByType: {}, lastTrainingDate: day(-2), questionnaireCount: 0, photoCount: 0,
    stage: null, isManager: false, managerRole: null
  };
}

// 按 URL 前缀返回假数据；无匹配返回 undefined（交回原失败结果）
function match(path, method) {
  var p = String(path || "");
  var m = String(method || "GET").toUpperCase();
  if (m !== "GET") {
    if (p.indexOf("/api/portal/bookings") === 0) return { statusCode: 200, data: { booking: { id: 1 }, preview: true } };
    return undefined;
  }
  if (p.indexOf("/api/portal/offerings") === 0) return { statusCode: 200, data: offerings };
  if (p.indexOf("/api/portal/team") === 0) return { statusCode: 200, data: team };
  if (p.indexOf("/api/portal/stars") === 0) return { statusCode: 200, data: stars };
  if (p.indexOf("/api/portal/venue") === 0) return { statusCode: 200, data: venue };
  if (p.indexOf("/api/portal/schedule") === 0) return { statusCode: 200, data: schedule() };
  if (p.indexOf("/api/portal/cards") === 0) return { statusCode: 200, data: cards() };
  if (p.indexOf("/api/portal/bookings") === 0) return { statusCode: 200, data: bookings() };
  if (p.indexOf("/api/portal/me") === 0) return { statusCode: 200, data: me() };
  if (p.indexOf("/api/portal/brand-settings") === 0) return { statusCode: 200, data: {} };
  if (p.indexOf("/api/portal/notes") === 0) return { statusCode: 200, data: { notes: [] } };
  if (p.indexOf("/api/portal/training-feelings") === 0) return { statusCode: 200, data: [] };
  if (p.indexOf("/api/portal/coach-notes") === 0) return { statusCode: 200, data: [] };
  if (p.indexOf("/api/photo-comparisons") === 0) return { statusCode: 200, data: [] };
  if (p.indexOf("/api/ai/period-report") === 0) return { statusCode: 200, data: [] };
  // 不覆盖：/api/trainings（feedback 页成功后会写 trainCount 存储）、/api/portal/manager/*、/api/portal/login
  return undefined;
}

module.exports = { match: match };
