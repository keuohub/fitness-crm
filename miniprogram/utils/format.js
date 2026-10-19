/**
 * 徕舞小程序 文本与日期高奢排版工具
 * 
 * 专为女性高定私教体验打造：
 * 1. 彻底清除 Markdown 原生标记（**粗体**、*斜体*、#号），保证纯净优雅阅读；
 * 2. 移除生硬英文，日期全面转为温润中文格式（如“2026年7月16日”、“7月16日”）；
 * 3. 报告类型全面汉化为女性情绪价值词汇（“年度蜕变手札”、“月度深层体态总结”等）。
 */

function cleanMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // 去掉 **粗体**
    .replace(/\*(.*?)\*/g, "$1")     // 去掉 *斜体*
    .replace(/^#+\s*/gm, "")         // 去掉 # 标题符
    .replace(/[`_~]/g, "")           // 去掉反引号与下划线
    .trim();
}

function formatChineseDate(dateStr) {
  if (!dateStr) return "";
  var s = String(dateStr).trim();
  // 匹配 2026-07-16 或 2026/07/16
  var match = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    return match[1] + "年" + parseInt(match[2], 10) + "月" + parseInt(match[3], 10) + "日";
  }
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }
  return s;
}

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  var s = String(dateStr).trim();
  var match = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    return parseInt(match[2], 10) + "月" + parseInt(match[3], 10) + "日";
  }
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }
  return s;
}

function formatReportType(type) {
  if (!type) return "小桥来信";
  var t = String(type).trim().toLowerCase();
  var dict = {
    "yearly": "年度蜕变手札",
    "annual": "年度蜕变手札",
    "年度总结": "年度蜕变手札",
    "quarterly": "季度蜕变复盘",
    "季度总结": "季度蜕变复盘",
    "monthly": "月度体态蜕变手札",
    "月报": "月度体态蜕变手札",
    "月度总结": "月度体态蜕变手札",
    "15days": "半月成长小结",
    "15日总结": "半月成长小结",
    "weekly": "周度私教来信",
    "周报": "周度私教来信",
    "daily": "每日蜕变记录",
    "日报": "每日蜕变记录",
    "initial_assessment": "初见 · 体态测评手札",
    "initial": "初见 · 体态测评手札",
    "assessment": "初见 · 体态测评手札",
    "体态评估": "初见 · 体态测评手札",
    "初次评估": "初见 · 体态测评手札",
    "feedback": "小桥私享手札"
  };
  return dict[t] || dict[type] || "小桥专属手札";
}

module.exports = {
  cleanMarkdown: cleanMarkdown,
  formatChineseDate: formatChineseDate,
  formatShortDate: formatShortDate,
  formatReportType: formatReportType
};
