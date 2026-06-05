// Portal Visual System 2.0 — Design Tokens
// Reference: Apple Health · The Pilates Class · Linear
// Updated: Sprint P0-P4 Aesthetics Upgrade

export const COLORS = {
  primary:   "#8B5E3C",  // 莲花棕 — 按钮、高亮、等级标识
  secondary: "#3E2723",  // 深棕 — 标题、正文
  bg:        "#FAF7F2",  // 象牙白 — 页面底色
  surface:   "#FFFFFF",  // 白 — 卡片表面
  surfaceAlt:"#F0EDE8",  // 浅米灰 — 次背景色、板块交替底色
  border:    "#E8E0D5",  // 浅米 — 极少量边框、分隔线
  muted:     "#9E8E7E",  // 灰米 — 辅助文字
} as const;

export const SHADOWS = {
  none:     "none",
  soft:     "0 2px 12px rgba(62,39,35,0.05)",
  card:     "0 4px 20px rgba(62,39,35,0.06)",
  floating: "0 8px 30px rgba(62,39,35,0.08)",
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
  hero:       "font-serif text-3xl font-bold text-[#3E2723]",
  sectionTitle: "font-serif text-sm font-bold text-[#3E2723]",
  body:        "text-sm text-[#3E2723] leading-relaxed",
  caption:     "text-xs text-[#9E8E7E]",
  micro:       "text-[10px] text-[#9E8E7E] uppercase tracking-wider",
} as const;
