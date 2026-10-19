# SYSTEM_AUDIT_REPORT.md — 系统真实可用性审计：最终结论

> 审计日期：2026-06-06
> 审计范围：CTA / Demo 表单 / 飞书闭环 / 会员成长闭环
> 四项子报告：CTA_AUDIT.md / DEMO_FLOW_AUDIT.md / FEISHU_DATAFLOW.md / MEMBER_JOURNEY_AUDIT.md

---

## P0 — 影响运营（3 项）

### P0-1: Demo 表单提交数据 100% 丢失

**事实**：`handleSubmit()` 函数只执行 `setSubmitted(true)`，不调用任何 API，不写入数据库，不发送通知。

**影响**：Demo 表单是首页唯一的数据采集入口。不管有多少人填写了姓名、手机号、城市、工作室名称——小桥永远不会知道。没有任何方式回溯这些数据。

**证据**：`DemoSection.tsx` line 16-19

### P0-2: 不存在「网站 → 飞书」数据通路

**事实**：飞书 SDK 仅实现了 `listTableRecords()`（读取），`createRecord()` 函数不存在于整个项目中。

**影响**：即使 Demo 表单修好并存入数据库，也无法自动同步到飞书。飞书表格是小桥日常查看会员数据的核心工具，表单数据进不去飞书等于不可用。

**证据**：`src/lib/feishu.ts` 仅导出 `getAccessToken` + `listTableRecords`

### P0-3: 首页展示的是 mock 数据而非真实数据

**事实**：首页 CasesSection 使用的是硬编码的静态 mock 数据，不是从数据库读取。数据库中有 17 个真实会员、19 条问卷记录、50+ 次训练记录，首页完全未使用。

**影响**：访问者看到的「成长故事」是假的。即使飞书同步了真实会员数据，首页也不会更新。

**证据**：`CasesSection.tsx` 使用 `FALLBACK_CASES` 常量数组，`/api/cases` 返回的也是硬编码数据

---

## P1 — 影响体验（4 项）

### P1-1: TrySection 的「样例」链接全部导向登录页

**事实**：TrySection 3 个链接（查看成长档案样例 / 阶段回顾样例 / Portal 样例）全部指向 `/portal/*` 页面，而这些页面需要登录。未登录用户点击后看到的是登录页，不是「样例」。

**影响**：首页告诉用户「可以查看样例」，但用户点击后发现进不去。期望和现实不一致。

### P1-2: CTASection「开始使用」是死链

**事实**：`<a href="#">` —— 点击后无跳转，无任何行为。

**影响**：用户点击后以为网站坏了。

### P1-3: Demo 表单无输入校验

**事实**：手机号字段仅校验非空（`!phone.trim()`），不验证格式。用户输入「123」也能通过。

**影响**：即使将来修好了数据保存，也会收到无效手机号导致无法联系用户。

### P1-4: Portal 全部页面强制登录，无公开样例

**事实**：`/portal`、`/portal/growth`、`/portal/feedback` 等页面全部通过 middleware 或 `verifyMemberAccess` 检查权限，未登录直接重定向到登录页。

**影响**：潜在用户无法预览产品。Forma Pilates 不需要登录就能看到训练空间和教练，徕舞把所有产品内容锁在登录后面。

---

## P2 — 影响审美（2 项）

### P2-1: Demo 表单按钮 hover 效果用 onMouseEnter

**事实**：`onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#A86545")}` —— 这是 JavaScript 事件处理器，不是 CSS transition。在严格模式下或 Server Component 场景中会触发 React 警告。

**影响**：当前不影响功能，但不符合 React 最佳实践。

### P2-2: EvidenceSection 数字是硬编码

**事实**：`totalMembers: 3682` 等数字直接写在常量中，不是从数据库读取。

**影响**：数字永远不会变。如果真实会员数增加了，首页不会反映。

---

## 汇总

| 级别 | 数量 | 核心问题 |
|:---:|:---:|------|
| P0 | 3 | Demo 表单数据丢失、无飞书写入、首页用假数据 |
| P1 | 4 | 样例链接导向登录页、死链、无校验、无公开预览 |
| P2 | 2 | 代码风格问题、硬编码数字 |

---

> SYSTEM_AUDIT_REPORT.md 完成。
> 仅陈述事实。无视觉优化建议。
