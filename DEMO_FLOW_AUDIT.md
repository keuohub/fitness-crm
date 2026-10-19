# DEMO_FLOW_AUDIT.md — Demo 表单深度审计

> 审计日期：2026-06-06

---

## 表单字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| 姓名 | text | 是 | 仅校验非空 |
| 手机号 | tel | 是 | 仅校验非空，不验证格式 |
| 城市 | text | 否 | 无校验 |
| 工作室名称 | text | 否 | placeholder「选填」 |
| 会员规模 | select | 否 | 3 个选项：<50 / 50-200 / >200 |

---

## 提交流程（代码证据）

```typescript
// DemoSection.tsx line 16-19
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!name.trim() || !phone.trim()) return;  // 仅校验非空
  setSubmitted(true);                          // 仅改本地状态
};
```

数据流：
```
用户输入 → useState → handleSubmit → setSubmitted(true) → 显示「感谢关注」→ 数据消失
```

---

## 逐项验证

| 检查项 | 结果 | 证据 |
|--------|:---:|------|
| 是否写入数据库 | **否** | handleSubmit 内无 fetch/axios，无 API 调用 |
| 是否写入飞书 | **否** | 全项目无「飞书创建记录」代码（`createRecord` 等函数不存在） |
| 是否产生后台记录 | **否** | 无数据库写入，管理后台无从查看 |
| 是否产生通知 | **否** | 无短信、无微信、无飞书、无邮件通知代码 |
| 是否防重复提交 | **否** | 提交后按钮未 disabled，可多次点击 |
| 是否校验手机格式 | **否** | 仅 `!phone.trim()` 判空 |
| 是否校验邮箱格式 | **N/A** | 表单不含邮箱字段 |

---

## 严重性评估

| 问题 | 级别 | 影响 |
|------|:---:|------|
| 数据不保存、不通知 | **P0** | 运营完全无法感知任何用户提交。不管有多少人填了这个表单，小桥永远不会知道。 |
| 无手机格式校验 | P1 | 用户输入「123」也能通过，后续无法联系 |
| 无防止重复提交 | P2 | 用户可能多次点击，但反正数据也不保存所以影响不大 |
| 按钮 hover 用 onMouseEnter | P2 | Server Component 报错风险（当前因为 onMouseEnter 直接写在 motion.button 所以没报错，但在严格模式下会出问题） |

---

> DEMO_FLOW_AUDIT.md 完成。
> 核心结论：Demo 表单是「假表单」——有 UI、有交互、有成功提示，但数据 100% 丢失。
