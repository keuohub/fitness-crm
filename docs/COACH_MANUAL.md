# 教练操作手册 — 徕舞成长系统 CRM

## 登录

1. 打开 `crm.laiwufitness.com`
2. 输入管理员邮箱和密码
3. 进入会员管理首页

---

## 首页（Dashboard）

- 顶部统计卡片：总会员数、活跃会员、今日反馈、本月训练、待处理
- 会员列表：快速查看所有会员，点击进入详情
- 搜索：按姓名搜索会员

---

## 会员管理

### 查看会员详情
点击任意会员 → 进入详情页：
- 基础信息：姓名、电话、入会日期、阶段、标签
- 成长档案：训练记录、照片、问卷、AI报告
- Portal 管理：生成邀请码、查看激活状态

### 新增会员
`/members/new` → 填写信息 → 保存

### 编辑会员
`/members/[id]/edit` → 修改信息 → 保存

---

## 训练记录

### 查看训练记录
`/members/[id]/trainings` → 按日期倒序显示

### 新增训练
`/members/[id]/trainings/new`：
- 训练日期（必填）
- 训练类型：私教 / 团课 / 评估
- 时长（分钟）
- 重点区域
- 备注

---

## 照片管理

### 查看照片
`/members/[id]/photos` → 照片列表

### 上传照片
`/members/[id]/photos/upload`：
- 照片类型：身体 / 体态 / 成长
- 拍摄日期
- 备注

---

## 问卷记录

### 查看问卷
`/members/[id]/questionnaire` → 历史问卷列表

### 新增问卷
`/members/[id]/questionnaire/new` → 填写完整问卷

---

## AI 成长报告

### 查看报告
`/members/[id]/report`：
- 成长分（0-100）
- 成长阶段
- 趋势分析
- 优势与风险
- 成长建议

### 批量生成
`/admin/sync` → 选择报告类型 → 批量生成

---

## 飞书同步

### 手动同步
1. `crm.laiwufitness.com/admin/sync`
2. 点击「开始同步」
3. 查看同步结果

### 同步状态
`/admin/sync-status` → 查看最近 50 条同步记录

---

## Portal 使用追踪

`/admin/usage`：
- 总登录次数
- 页面浏览数
- 分享次数
- 热门页面
- 可按 7/14/30 天筛选

---

## 案例管理

`/admin/stories`：
- 创建/编辑成长故事
- 设为草稿/审核/发布/隐藏
- 统计已发布数量

---

## 快捷操作速查

| 操作 | 路径 |
|------|------|
| 查看会员 | `/members/[id]` |
| 新增训练 | `/members/[id]/trainings/new` |
| 上传照片 | `/members/[id]/photos/upload` |
| 生成邀请码 | `/members/[id]` → Portal 邀请码区 |
| 飞书同步 | `/admin/sync` |
| 查看报告 | `/members/[id]/report` |
| 使用追踪 | `/admin/usage` |
