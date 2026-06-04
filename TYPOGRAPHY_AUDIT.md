# TYPOGRAPHY_AUDIT.md — Sprint 37C

## 1. 当前使用字体（修改前）

| 角色 | 字体 | 来源 |
|------|------|------|
| 全局正文 | Tailwind `font-sans` → 系统默认无衬线 | globals.css `html { @apply font-sans; }` |
| 全局字体族定义 | `@theme inline { --font-sans: var(--font-sans); }` | globals.css（映射到自身，无实际效果） |
| Hero 标题 | `font-serif` → 系统默认 serif（中文宋体/Times New Roman） | Tailwind utility 类 |
| 板块标题 | 各自混用 `font-serif` / `font-bold` | 组件内硬编码 |
| 正文 | `text-sm` / `text-base` / `text-lg` 混用，字重默认 normal | 组件内硬编码 |
| 数字 | 无特殊处理，跟随全局字体 | - |

**问题**：无统一定义，font-sans 映射到自身（空操作），serif 回退不可控。

## 2. 修改后字体

| 角色 | 字体栈 | 生效方式 |
|------|--------|---------|
| 全局正文 | `Noto Sans SC > PingFang SC > Microsoft YaHei > Noto Sans CJK SC > Source Han Sans SC > system-ui` | `--font-body` CSS 变量 → `@theme inline { --font-sans: var(--font-body); }` → Tailwind `font-sans` |
| 数字/英文 | `Inter > Helvetica Neue > SF Pro Display > system-ui` | `--font-number` CSS 变量（供组件按需引用） |
| 标题 serif | `STSong > Songti SC > Noto Serif CJK SC > Source Han Serif SC > Songti > serif` | `--font-serif` CSS 变量 → `@theme inline { --font-heading: var(--font-serif); }` → Tailwind `font-serif` |

### 字体接入方式
- **零网络依赖**：全部使用 CSS 字体栈，不依赖 Google Fonts API
- 原因：中国大陆网络环境下 `next/font/google` 在 build 阶段无法解析 Google Fonts URL
- Inter 作为 `--font-number` 保留，macOS 用户本地有 Inter 则使用，无则回退到 Helvetica Neue
- Noto Sans SC 在 macOS / Windows / Linux 均有系统级回退字体

## 3. 受影响的组件

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/app/globals.css` | 新增字体系统 CSS 变量 + `font-family` 到 body | 全局生效，所有页面自动使用新字体 |
| `src/app/layout.tsx` | 移除 next/font/google 导入 | 恢复为纯 layout，不再依赖网络加载 |
| `src/components/brand/HeroSection.tsx` | Hero 标题 `font-bold` → `font-semibold`，`tracking-[-0.03em]` → `tracking-[-0.04em]`；正文段 `mt-10` → `mt-14`，`max-w-lg` → `max-w-[480px]`，增加 `leading-[1.8]` `text-center` | 按 Sprint 37C 阶段3 规范调整 |

## 4. 未修改的组件

以下组件未做任何修改，通过全局 CSS 变量自动继承新的字体系统：

- 所有 `src/components/brand/*.tsx`（除 HeroSection）
- 所有 `src/components/portal/*.tsx`
- 所有 `src/components/layout/*.tsx`
- 所有 `src/app/portal/**/*.tsx`
- 所有 `src/app/admin/**/*.tsx`
- 所有 `src/app/members/**/*.tsx`
- 所有 `src/app/stories/**/*.tsx`

## 5. Build 结果

```
npm run build → ✓ 通过
- Compiled successfully
- TypeScript: 零错误
- Static pages: 49/49 生成成功
- 0 errors, 0 warnings (DEP0205 是 Node.js 自身警告，与项目无关)
```

### 字体有效性说明
- macOS：PingFang SC 作为回退字体，中文渲染质量优秀
- macOS（已安装 Noto Sans SC 用户）：优先使用 Noto Sans SC
- Windows：Microsoft YaHei 作为回退
- Linux：Noto Sans CJK SC 或 Source Han Sans SC
- 标题 serif：macOS 优先 Songti SC，Windows 优先 SimSun/宋体

> 审计完成。Sprint 37C 字体系统升级已通过。
