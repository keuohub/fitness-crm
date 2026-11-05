// utils/course-categories.js
// 约课首屏分类与匹配规则（BRIEF_05）。关键词与后端 src/app/api/portal/me/route.ts inferCategoryKey 同序。
var api = require("./api.js");

var CATEGORIES = [
  { key: "all", label: "全部", short: "全部" },
  { key: "private", label: "高定私教课程", short: "私教" },
  { key: "pilates", label: "精品普拉提", short: "普拉提" },
  { key: "fat_burn", label: "维密减脂超模班", short: "超模班" },
  { key: "equipment", label: "高定大器械", short: "大器械" },
  { key: "yoga", label: "瑜伽", short: "瑜伽" }
];

var STANDARD_KEYS = ["pilates", "equipment", "fat_burn", "private", "yoga"];

function inferKey(text) {
  var n = String(text || "").toLowerCase();
  if (!n) return "";
  if (n.indexOf("普拉提") >= 0 || n.indexOf("pilates") >= 0) return "pilates";
  if (n.indexOf("器械") >= 0 || n.indexOf("equipment") >= 0) return "equipment";
  if (n.indexOf("维密") >= 0 || n.indexOf("超模") >= 0 || n.indexOf("减脂") >= 0 || n.indexOf("sculpt") >= 0 || n.indexOf("fat_burn") >= 0) return "fat_burn";
  if (n.indexOf("私教") >= 0 || n.indexOf("private") >= 0) return "private";
  if (n.indexOf("瑜伽") >= 0 || n.indexOf("yoga") >= 0) return "yoga";
  return "";
}

function sessionKey(s) {
  if (!s) return "";
  if (STANDARD_KEYS.indexOf(s.courseKey) >= 0) return s.courseKey;
  return inferKey((s.courseName || "") + " " + (s.title || ""));
}

function offeringKey(o) {
  if (!o) return "";
  return inferKey((o.name || "") + " " + (o.enName || ""));
}

function labelOf(key) {
  for (var i = 0; i < CATEGORIES.length; i++) {
    if (CATEGORIES[i].key === key) return CATEGORIES[i].label;
  }
  return "";
}

// 取某分类的 offering（多条取 sortOrder 最小）；all 返回 null
function offeringFor(key, offerings) {
  if (!key || key === "all") return null;
  var best = null;
  (offerings || []).forEach(function(o) {
    if (offeringKey(o) !== key) return;
    if (!best || Number(o.sortOrder || 0) < Number(best.sortOrder || 0)) best = o;
  });
  return best;
}

// 检查是否为已失效/不可用的 COS 域名
function isBrokenUrl(url) {
  if (!url || typeof url !== "string") return true;
  if (url.indexOf("laiwu-media-1513635286") >= 0) return true;
  return false;
}

// 本地 9:16 高清定制课程大片（首屏沉浸式全屏画报）
function localCover(key) {
  var k = String(key || "all").trim();
  if (!k || k === "all") return "/images/categories/all.jpg";
  if (STANDARD_KEYS.indexOf(k) >= 0) return "/images/categories/" + k + ".jpg";
  return "/images/categories/all.jpg";
}

// 背景图档位：
// 0 = 包内 9:16 高清定制大片（首选，秒开无延迟，零闪烁）
// 1 = 后台 offering 图（若已配置有效云端且非失效 COS）
// 2 = 纯色温润底兜底
function pickBackground(key, offerings, level) {
  var lv = Number(level) || 0;
  if (lv <= 0) {
    var loc = localCover(key);
    if (loc) return { src: loc, level: 0 };
    lv = 1;
  }
  if (lv <= 1) {
    var o = (key === "all") ? null : offeringFor(key, offerings);
    if (o && o.imageUrl && !isBrokenUrl(o.imageUrl)) {
      return { src: api.fullUrl(o.imageUrl), level: 1 };
    }
  }
  return { src: "", level: 2 };
}

function toChars(label) {
  return String(label || "").split("");
}

// 老师匹配：只按名字精确匹配（去空格与末尾「老师/导师/教练」），不做模糊包含
function normName(x) {
  return String(x || "").replace(/\s+/g, "").replace(/(老师|导师|教练)$/, "");
}
function matchCoach(coachName, teamList) {
  var target = normName(coachName);
  if (!target) return null;
  var list = teamList || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && normName(list[i].name) === target) return list[i];
  }
  return null;
}

// 难度 1–5 → 三格（1–2→1，3→2，4–5→3；空值按 3）
function difficultyBars(stars) {
  var d = Number(stars);
  if (!d) d = 3;
  var n = d <= 2 ? 1 : (d === 3 ? 2 : 3);
  return [n >= 1, n >= 2, n >= 3];
}

module.exports = {
  CATEGORIES: CATEGORIES,
  STANDARD_KEYS: STANDARD_KEYS,
  inferKey: inferKey,
  sessionKey: sessionKey,
  offeringKey: offeringKey,
  offeringFor: offeringFor,
  labelOf: labelOf,
  localCover: localCover,
  pickBackground: pickBackground,
  toChars: toChars,
  matchCoach: matchCoach,
  difficultyBars: difficultyBars
};
