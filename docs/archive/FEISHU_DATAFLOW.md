# FEISHU_DATAFLOW.md — 飞书闭环数据流

> 审计日期：2026-06-06

---

## 完整数据流图

```
                          ┌─────────────────────┐
                          │   飞书多维表格       │
                          │  (Feishu Bitable)   │
                          │                     │
                          │  会员表 (tblg...)    │
                          │  问卷表              │
                          │  关怀表 ×4           │
                          └────────┬────────────┘
                                   │
                          listTableRecords()
                          (单向读取 ✅)
                                   │
                                   ▼
                          ┌─────────────────────┐
                          │   徕舞 CRM           │
                          │   fitness-crm       │
                          │                     │
                          │  本地 SQLite/Neon    │
                          │  ├─ members (17人)   │
                          │  ├─ questionnaire_    │
                          │  │  submissions(19条)│
                          │  ├─ trainings        │
                          │  ├─ photos           │
                          │  └─ daily_health_logs│
                          └────────┬────────────┘
                                   │
                                   │ ❌ 无写入飞书代码
                                   │ createRecord() 不存在
                                   │ updateRecord() 不存在
                                   │
                                   ▼
                          ┌─────────────────────┐
                          │   用户行为           │
                          │                     │
                          │  Demo 表单 ──────► 丢失 │
                          │  Portal 操作 ────► 仅写本地 DB │
                          │  Admin 操作 ────► 仅写本地 DB │
                          └─────────────────────┘
```

---

## 已实现的数据通路

| 方向 | 路径 | 触发方式 | 状态 |
|------|------|----------|:---:|
| 飞书 → CRM | 会员基础信息同步 | 管理员手动 `/admin/sync` | 正常 |
| 飞书 → CRM | 问卷/关怀表同步 | 管理员手动 `/admin/sync` | 正常 |
| Portal → CRM | 训练记录 | 会员在 Portal 内操作 | 正常 |
| Portal → CRM | 照片上传 | 会员在 Portal 内操作 | 正常 |
| Portal → CRM | 问卷填写 | 会员在 Portal 内操作 | 正常 |
| Admin → CRM | 会员管理 CRUD | 管理员后台操作 | 正常 |

## 缺失的数据通路

| 方向 | 路径 | 缺失原因 | 严重性 |
|------|------|----------|:---:|
| **Demo 表单 → CRM** | 首页表单 → 数据库 | handleSubmit 无 API 调用 | **P0** |
| **Demo 表单 → 飞书** | 首页表单 → 飞书表格 | 无写入飞书代码 | **P0** |
| **CRM → 飞书** | 任何方向 | 全项目无 `createRecord` 函数 | P1 |
| **Portal → 飞书** | 会员操作 → 飞书表格 | 同上 | P1 |

---

## 代码层面的确认

飞书 API 工具 (`src/lib/feishu.ts`) 仅导出以下函数：

| 函数 | 方向 | 能力 |
|------|:---:|------|
| `getAccessToken()` | — | 获取飞书 API 访问令牌 |
| `listTableRecords()` | 飞书 → CRM | 读取表格记录（仅此一个数据操作函数） |

**无任何写入飞书的函数。** `createRecord`、`updateRecord`、`deleteRecord` 全部不存在。

---

## 实际运行状态

飞书同步是**手动触发**的。不是定时自动任务。管理员需要访问 `/admin/sync` 页面点击「开始同步」按钮，系统才会从飞书拉取最新数据。

---

> FEISHU_DATAFLOW.md 完成。
> 核心结论：飞书接入是「只读」——只能读飞书，不能写飞书。Demo 表单到飞书的链路完全不存在。
