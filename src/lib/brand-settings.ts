// 「了解徕舞」页面文案配置：默认值、字段白名单、合并与清洗。
//
// 为什么单独一个文件：
// 1. route.ts 只能导出 HTTP 方法，把共享常量放进去会被 Next 的 route 类型校验拦下。
// 2. 后台写入与前台读取必须用同一份白名单，否则后台多写的字段会被前台原样公开。

export const BRAND_SETTING_KEYS = [
  "heroTitle",
  "heroSubtitle",
  "sec1Num",
  "sec1Title",
  "sec1En",
  "sec1Intro",
  "sec2Num",
  "sec2Title",
  "sec2En",
  "sec2Intro",
  "sec3Num",
  "sec3Title",
  "sec3En",
  "sec3Intro",
] as const;

export type BrandSettingKey = (typeof BRAND_SETTING_KEYS)[number];
export type BrandSettings = Record<BrandSettingKey, string>;

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  heroTitle: "了解徕舞",
  heroSubtitle: "以克制之道，唤醒身体内在的秩序与平衡",
  sec1Num: "01",
  sec1Title: "场馆空间",
  sec1En: "SPACES",
  sec1Intro: "柔和漫射日光、天然实木大器械与私密更衣室，营造沉静专注的练习氛围。",
  sec2Num: "02",
  sec2Title: "同行导师",
  sec2En: "MENTORS",
  sec2Intro: "深耕人体解剖与体态矫正，用细腻口令与精准触觉纠正，守护每次发力安全。",
  sec3Num: "03",
  sec3Title: "项目介绍",
  sec3En: "OFFERINGS",
  sec3Intro: "针对不同阶段与体态目标，由主理团队精心研发的核心训练体系。",
};

/** 单字段最大长度。超长内容会把小程序卡片撑坏，也会撑爆 studio_settings.value。 */
const MAX_LEN = 400;

/**
 * 读取侧：把库里的任意 JSON 合并到默认值上。
 * 坏 JSON / 数组 / null / 非对象一律退回默认，永不抛错。
 */
export function mergeBrandSettings(raw: unknown): BrandSettings {
  const merged: BrandSettings = { ...DEFAULT_BRAND_SETTINGS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return merged;
  const obj = raw as Record<string, unknown>;
  for (const key of BRAND_SETTING_KEYS) {
    const v = obj[key];
    if (typeof v === "string") merged[key] = v;
  }
  return merged;
}

/**
 * 写入侧：只接受白名单字段、强制转字符串并截断，未知 key 直接丢弃。
 * 这样后台即使误传 { cos_secret_key: "..." } 也不会被写进 brand_settings 再被前台公开。
 */
export function sanitizeBrandSettings(raw: unknown): BrandSettings {
  const clean: BrandSettings = { ...DEFAULT_BRAND_SETTINGS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return clean;
  const obj = raw as Record<string, unknown>;
  for (const key of BRAND_SETTING_KEYS) {
    const v = obj[key];
    if (v === undefined) continue;
    clean[key] = String(v).slice(0, MAX_LEN);
  }
  return clean;
}
