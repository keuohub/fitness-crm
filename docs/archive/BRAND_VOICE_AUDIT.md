# BRAND_VOICE_AUDIT.md — Sprint 38B

## 品牌语气库

新建 `src/lib/brand-voice.ts`，统一官网文案来源，包含四大模块：

| 模块 | 内容 |
|------|------|
| `MISSION` | Hero 标题 + 副标题 |
| `MANIFESTO` | 品牌宣言 + 创始人故事 |
| `PHILOSOPHY` | 训练空间理念（三栏） |
| `SHORT_COPY` | 板块标签、统一文案 |

### 已迁移到 brand-voice 的文案

| 文案 | 原位置 | 新引用 |
|------|--------|--------|
| "关于徕舞" + 品牌宣言 | BeliefSection（硬编码） | `MANIFESTO.about` |
| 训练空间三栏理念 | StudioSection（硬编码） | `PHILOSOPHY.space.pillars` |

### 禁止词清单

`BANNED_WORDS`: 蜕变、逆袭、改变人生、惊艳、打卡、塑形神器、完美身材

---

## Hero 副标题升级

- 旧："从第一次训练开始，记录每一次坚持留下的痕迹。"
- 新："不是一次训练改变了身体，而是一次次记录，让成长慢慢发生。"
- 两行、leading-[2.2]、mt-20、max-w-[520px]

---

## 数字风格统一

- 全站数字：font-semibold + tracking-[-0.02em] + var(--font-number) 字体族
- EvidenceSection：数字改为 font-semibold（原 font-serif font-semibold）
- CasesSection：数字 font-medium → font-semibold + tracking-[-0.02em]
- StoriesTeaserSection：数字 tracking-[-0.03em] → tracking-[-0.02em]

---

## Section 标题统一

所有板块 h2 标题：`font-serif ... font-semibold text-[#1D1D1F] tracking-[-0.03em]`

旧 `text-[#3E2723]`（深棕）→ 新 `text-[#1D1D1F]`（近黑）

---

## Build 结果

```
npm run build → 通过
- Compiled successfully
- TypeScript: 零错误
- 0 errors, 0 warnings
```
