/**
 * 徕舞成长系统 · 首页阅读节奏规范
 *
 * 使用姿势：
 *   import { READING } from "@/lib/HomepageReadingRhythm";
 *   然后在 Tailwind className 中：
 *     className={`${READING.titleMaxWidth} ${READING.sectionSpacing}`}
 *   或直接在组件 className 中引用：
 *     className="max-w-[12ch]"
 */

export const READING = {
  /**
   * 板块标题最大宽度 — 防止标题过长破坏视觉重心
   * 约 12 个中文字符宽度
   */
  titleMaxWidth: "max-w-[12ch]",

  /**
   * 正文最大宽度 — 标准杂志栏宽
   * 约 32 个 em，即约 512px（16px 基准）
   */
  bodyMaxWidth: "max-w-[32em]",

  /**
   * 长文最大宽度 — 用于信件、宣言类长段落
   * 约 42 个 em，即约 672px（16px 基准）
   */
  longformMaxWidth: "max-w-[42em]",

  /**
   * 禁止全宽文字
   */
  noFullWidth: "max-w-[42em] mx-auto",
} as const;

/**
 * 板块统一间距
 */
export const SECTION = {
  gap: "py-32 md:py-40",
  titleToBody: "mt-12",
  titleBottom: "mb-16 md:mb-20",
} as const;

/**
 * 检查：任何 max-w 超过 42em 的内容需要评估是否需要拆分
 */
export function validateReadingRhythm(maxWidth: string): boolean {
  const emMatch = maxWidth.match(/max-w-\[(\d+)em\]/);
  if (emMatch) {
    const em = parseInt(emMatch[1], 10);
    return em <= 42;
  }
  // 如果是 Tailwind 预设（max-w-lg = 32rem = 512px ≈ 32em），通过
  return true;
}
