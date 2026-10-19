// Portal Visual System 3.0 — Design Tokens
// Direction: Black/White Luxury · Minimal · Editorial
// Updated: Global Color Rebrand — Warm → Monochrome

export const COLORS = {
  primary:   "#1A1A1A",  // 近黑 — 按钮、强调
  secondary: "#1A1A1A",  // 近黑 — 标题
  bg:        "#FAFAFA",  // 极浅灰 — 页面底色
  surface:   "#FFFFFF",  // 白 — 卡片表面
  surfaceAlt:"#F5F5F5",  // 浅灰 — 次背景色
  border:    "#E5E5E5",  // 中性灰 — 边框、分隔线
  muted:     "#9E9E9E",  // 中性灰 — 辅助文字
} as const;

export const SHADOWS = {
  none:     "none",
} as const;

export const RADIUS = {
  card:    "rounded-xl",
  button:  "rounded-xl",
  pill:    "rounded-full",
  input:   "rounded-xl",
} as const;

export const SPACING = {
  sectionGap:  "space-y-10",
  cardPad:     "p-8",
  cardPadSm:   "p-6",
  pageX:       "px-6",
} as const;

export const TYPOGRAPHY = {
  hero:       "font-serif text-3xl font-bold text-[#1A1A1A]",
  sectionTitle: "font-serif text-sm font-bold text-[#1A1A1A]",
  body:        "text-sm text-[#4A4A4A] leading-relaxed",
  caption:     "text-xs text-[#9E9E9E]",
  micro:       "text-[10px] text-[#9E9E9E] uppercase tracking-wider",
} as const;
