# CTA_AUDIT.md — 首页 CTA 审计

> 审计日期：2026-06-06
> 审计范围：首页所有按钮、链接、表单

---

## 首页所有可点击元素

| # | 位置 | 类型 | 目标/行为 | HTTP | 结果 |
|:---:|------|------|-----------|:---:|:---:|
| 1 | Hero「了解成长系统」 | `<a>` 链接 | `/portal` | 307→`/portal/login` | 正常：需登录 |
| 2 | StoriesTeaser「查看全部」 | `<a>` 链接 | `/stories` | 200 | 正常 |
| 3 | TrySection「查看成长档案样例」 | `<Link>` | `/portal/growth` | 307→`/portal/login` | 正常：需登录 |
| 4 | TrySection「查看阶段回顾样例」 | `<Link>` | `/portal/feedback` | 307→`/portal/login` | 正常：需登录 |
| 5 | TrySection「查看 Portal 样例」 | `<Link>` | `/portal` | 307→`/portal/login` | 正常：需登录 |
| 6 | CTASection「开始使用」 | `<a>` | `#`（无效） | — | **死链** |
| 7 | CTASection「联系我们」 | `<a>` | `mailto:hello@laiwu.fitness` | — | 正常 |
| 8 | DemoSection 表单「提交预约」 | `<button type="submit">` | `handleSubmit()` | — | **数据丢失**（见 DEMO_FLOW_AUDIT） |
| 9 | HowItWorks「使用流程」（4处） | `onClick` | Modal 开关 | — | 正常 |

---

## 结论

| 状态 | 数量 | 明细 |
|:---:|:---:|------|
| 正常 | 6 | Hero /portal、Stories /stories、TrySection ×3、CTASection mailto、HowItWorks Modal |
| 死链 | 1 | CTASection「开始使用」→ `#`，点击后无跳转，无任何行为 |
| 数据丢失 | 1 | DemoSection 表单提交后不保存数据 |
| 需登录 | 4 | Portal 子页面全部需要登录才能访问，未登录用户看到的是登录页而非示例内容 |

---

> CTA_AUDIT.md 完成。
