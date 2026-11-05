// utils/booking-rules.js
// 徕舞约课业务规则与纯函数工具库
// 严格对齐后端真实规则，供课表、详情弹层、成功页、我的预约、下一节课等多模块复用

// 与后端 studio_settings 默认值一致，若后台修改需在此同步
var RULES = {
  bookCutoffHours: 2,
  cancelCutoffHours: 2,
  advanceDays: 7,
  sameDayLimit: 2
};

var WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/**
 * 计算课程时长（整数分钟）
 * 课表接口无 durationMinutes 字段，由前端 endTime - startTime 计算
 */
function durationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  var sp = String(startTime).split(":").map(Number);
  var ep = String(endTime).split(":").map(Number);
  var sm = (sp[0] || 0) * 60 + (sp[1] || 0);
  var em = (ep[0] || 0) * 60 + (ep[1] || 0);
  var diff = em - sm;
  return diff > 0 ? diff : 0;
}

/**
 * 解析开课时间戳（毫秒）
 * 在真机上按中国本地时区（+08:00），用户在国内即可
 */
function sessionStartTs(date, time) {
  if (!date || !time) return 0;
  var normalizedDate = String(date).replace(/-/g, "/");
  var parts = String(time).split(":");
  var hh = parts[0] || "00";
  var mm = parts[1] || "00";
  var d = new Date(normalizedDate + " " + hh + ":" + mm + ":00");
  var ts = d.getTime();
  return isNaN(ts) ? 0 : ts;
}

/**
 * 解析结课时间戳（毫秒）
 */
function sessionEndTs(date, time) {
  if (!date || !time) return 0;
  var normalizedDate = String(date).replace(/-/g, "/");
  var parts = String(time).split(":");
  var hh = parts[0] || "00";
  var mm = parts[1] || "00";
  var d = new Date(normalizedDate + " " + hh + ":" + mm + ":00");
  var ts = d.getTime();
  return isNaN(ts) ? 0 : ts;
}

/**
 * 判断当前是否可在线取消（开课前 ≥ cancelCutoffHours）
 */
function canCancel(date, startTime) {
  var startTs = sessionStartTs(date, startTime);
  if (!startTs) return false;
  var now = Date.now();
  var cutoffMs = RULES.cancelCutoffHours * 3600 * 1000;
  return (startTs - now) >= cutoffMs;
}

/**
 * 取消截止文案，例如「周四 17:30 前可免费取消」
 */
function cancelDeadlineText(date, startTime) {
  var startTs = sessionStartTs(date, startTime);
  if (!startTs) return "";
  var cutoffTs = startTs - RULES.cancelCutoffHours * 3600 * 1000;
  var cutoffDate = new Date(cutoffTs);
  var w = WEEKDAY_NAMES[cutoffDate.getDay()] || "";
  var hh = ("0" + cutoffDate.getHours()).slice(-2);
  var mm = ("0" + cutoffDate.getMinutes()).slice(-2);
  return w + " " + hh + ":" + mm + " 前可免费取消";
}

/**
 * 获取星期标签，例如「周四」
 */
function weekdayLabel(date) {
  if (!date) return "";
  var d = new Date(String(date).slice(0, 10).replace(/-/g, "/") + " 00:00:00");
  if (isNaN(d.getTime())) return "";
  return WEEKDAY_NAMES[d.getDay()] || "";
}

/**
 * 中文日期格式化，例如「11月6日 周四」
 */
function formatDateCN(date) {
  if (!date) return "";
  var s = String(date).trim().slice(0, 10);
  var d = new Date(s.replace(/-/g, "/") + " 00:00:00");
  if (isNaN(d.getTime())) return s;
  var m = d.getMonth() + 1;
  var day = d.getDate();
  var w = WEEKDAY_NAMES[d.getDay()] || "";
  return m + "月" + day + "日 " + w;
}

/**
 * 格式化为短日期，例如「11月6日」
 */
function formatShortDateCN(date) {
  if (!date) return "";
  var s = String(date).trim().slice(0, 10); // validUntil 可能带时间/时区，只取日期部分
  var d = new Date(s.replace(/-/g, "/") + " 00:00:00");
  if (isNaN(d.getTime())) return s;
  return (d.getMonth() + 1) + "月" + d.getDate() + "日";
}

/**
 * 归纳会员卡状态
 * @param {Array} cards - GET /api/portal/cards 返回的卡列表
 * @param {number} upcomingCount - 已预约待上节数
 * @returns {{ hasUsable: boolean, primary: object|null, text: string, availableCount: number }}
 */
function summarizeCards(cards, upcomingCount) {
  var list = Array.isArray(cards) ? cards : [];
  var upcoming = Math.max(0, Number(upcomingCount) || 0);

  // 取第一张 active 状态的会员卡作为主要展示卡
  var primary = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].status === "active") {
      primary = list[i];
      break;
    }
  }

  if (!primary) {
    return {
      hasUsable: false,
      primary: null,
      text: "还没有可用的会员卡",
      availableCount: 0
    };
  }

  if (primary.category === "period") {
    var validText = primary.validUntil ? formatShortDateCN(primary.validUntil) : "";
    var pText = (primary.name || "期限卡") + (validText ? " · 有效期至 " + validText : "");
    return {
      hasUsable: true,
      primary: primary,
      text: pText,
      availableCount: 999
    };
  }

  // 次卡逻辑：与后端防超额同口径
  var remaining = Number(primary.remainingCount) || 0;
  var available = remaining - upcoming;
  var cText = "卡内剩余 " + remaining + " 次 · 已约待上 " + upcoming + " 节";

  // 后端要求「剩余次数 - 已约待上」> 0 才能再约
  if (remaining > 0 && available <= 0) {
    cText = "卡内剩余 " + remaining + " 次，已全部约满待上";
  }
  return {
    hasUsable: available > 0,
    primary: primary,
    text: cText,
    availableCount: available
  };
}

// 约课须知（仅包含后端真实校验规则，语气平实，统一用“你”）
var NOTICE_ITEMS = [
  "可预约未来 7 天内的课程。",
  "开课前 2 小时停止线上预约；之后想上课请联系前台。",
  "同一天最多预约 2 节。",
  "开课前 2 小时之前可以在小程序里取消，不扣次。",
  "约了没来又没有取消，下课后会照常扣 1 次。",
  "次卡每上一节扣 1 次；期限卡在有效期内不扣次数。"
  // TODO(Cin): 迟到多久不能进场？（代码中尚无迟到拦截规则，待 Cin 确认后展示）
  // TODO(Cin): 周上限（卡种数据含 weeklyLimit 字段但后端未设拦截，待 Cin 确认后展示）
];

module.exports = {
  RULES: RULES,
  WEEKDAY_NAMES: WEEKDAY_NAMES,
  durationMinutes: durationMinutes,
  sessionStartTs: sessionStartTs,
  sessionEndTs: sessionEndTs,
  canCancel: canCancel,
  cancelDeadlineText: cancelDeadlineText,
  weekdayLabel: weekdayLabel,
  formatDateCN: formatDateCN,
  formatShortDateCN: formatShortDateCN,
  summarizeCards: summarizeCards,
  NOTICE_ITEMS: NOTICE_ITEMS
};
