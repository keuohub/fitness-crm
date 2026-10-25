# 徕舞约课系统 · 交接单（省钱模式）

> 每次新会话先读这一页，不要带历史聊天和截图。
> 项目：单店（徕舞），不支付、不多店、不促销。

## 目标
15 个工作日做到单店真实可用；第二阶段再做白标/文档/陪跑，卖给同行。

## 已完成
- 现有小程序/后端：登录 token、后台改动前端即时更新、假数据清理、包体积 268KB。
- 会员数据：约刻导出 243 条，`imports/约刻会员_20261021.csv`；对比结果 `imports/yueke-compare.json`。
- 约刻拆解：`docs/yueke/` 截图 + `约刻系统拆解与数据迁移_20261021.md`。
- 数据库骨架（2026-10-21）：
  - 表：course_categories, rooms, card_types, member_cards, card_transactions,
    class_sessions, bookings, attendance, post_class_notes, follow_ups,
    studio_settings, audit_logs
  - 种子：5 个课程类目（含瑜伽）、4 个教室、9 种卡类型、6 条预约规则
  - 迁移脚本：`scripts/migrate-booking-schema.mjs`
  - Drizzle 定义：`src/db/schema.ts` 末尾

## 当前状态（2026-10-22 只读核对，新窗口从这里接）

代码侧 S1–S6 全部完成，S7 只有方案。**真实库是"结构齐、账号齐、业务数据为零"**：

| 项 | 实际 |
|---|---|
| 会员 | 279 人（253 个 PIN / 270 个开入口；无死号，都能登录） |
| 卡类型 / 教室 / 课类 | 9 / 4 / 5（种子在） |
| 会员卡 `member_cards` | **0 张** |
| 课次 `class_sessions` / 周模板 | **0 / 0** |
| 预约 / 到课 / 流水 / 审计 | 0 / 0 / 0 / 0 |

**关键推论**：S6 已加"预约必须持有效卡"校验 → 现在**所有会员预约都会 422**，课表也是空的。
所以上线前第一件事不是写代码，是**开卡 + 排课**（都要写库，需单独授权）。

### 下一步（按顺序）
1. **固化代码**：`git status` 有 57 项未提交（S1–S6 全部新代码只在工作区），按阶段拆提交 + tag。
2. **开卡 + 排课**：先出 dry-run 预览清单给老板过目，确认后再写库（写前建 Neon branch 备份）。
3. **会员端真机验收**：我的卡 / 预约 / 课后记录。
4. **S7-A**：审计补齐 + 权限统一（可不迁移先做，见 S7 方案第十一章）。
5. **部署**：等云托管权限、4 个订阅消息模板 ID、管理员强密码。

### 环境
- 本地 dev：`localhost:3001`，`/api/health` 200 `{ok:true,db:"up"}`
- `.env.local` 的 `DATABASE_URL` **直连生产 Neon**。任何会写库的脚本（含 `s6-acceptance.mjs`）默认都不能直接跑。

## 会话拆分（每段新开会话）
- S1（已完成）：数据库骨架 + 种子。
- S2（已完成）：会员导入 + 会员卡/开卡 + 会员端我的卡。
- S3（已完成）：排课表 + 教练/教室 + 冲突提示。
- S4（已完成）：预约/取消 + 容量并发 + 后台名单。
- S5（已完成）：签到/到课/未到 + 扣次 + 课后记录 + 跟进。
- S6（已完成，未部署）：联调、健康检查、65/65 自动化验收、部署清单。
- S7（方案 v2，未改代码）：会员权益调整、退卡、审计。

## 成本规则
- 不带截图；只发文件路径。
- 每次只读 HANDOFF + 本次相关 3–5 个文件。
- 回复只写：改了什么、怎么验、下一步。
- 每 3 天一次演示；验收后新增需求进第二阶段。

## 关键文件
- 后台：`src/app/admin/*`、`src/app/api/*`
- 小程序：`miniprogram/pages/*`
- 数据：`imports/`、`scripts/`
- PRD：`../徕舞约课系统_PRD_v1_20261021.md`

## 验收（12 条）
见 PRD 第 7 节。

## S1 进度（2026-10-21）
- 已建 12 张表 + 种子（5 课类含瑜伽 / 4 教室 / 9 卡类型 / 6 规则）。
- 约刻会员导入完成：
  - CSV 243 行：13 位手机号已存在、38 位同名但徕舞无手机号（待确认）、192 位新建。
  - 当前可登录会员 271 人。
  - 新会员 PIN 清单：`imports/徕舞新会员_登录PIN.csv`
  - 待确认手机号：`imports/待确认手机号.csv`
  - 备份：`backups/members-before-yueke-import-*.json`
  - 已归档 1 个占位手机号（12345678910）。
- 下一步 S2：后台会员卡列表 + 给会员开卡/续卡 + 会员端“我的卡”（余额/有效期/流水）。

## S2 进度（2026-10-21）
### 已完成
- 数据库：`member_cards`、`card_transactions` 增加 `idempotency_key` + 唯一索引；迁移脚本 `scripts/migrate-s2-cards.mjs`。
- 后台接口：
  - `GET/POST/PUT /api/admin/card-types` 卡类型管理
  - `GET/POST/PUT/PATCH /api/admin/member-cards` 开卡/续卡/冻结
- 会员接口：`GET /api/portal/cards`（只读自己，token 鉴权）
- 后台页面：`/admin/cards`（开卡、建卡类型、最近记录、冻结）
- 会员端：`pages/cards/cards` + 我的账户入口「我的卡」
- 权限：后台 requireAdmin；会员 token，无 memberId 参数，无法越权。

### 测试结果（真实执行）
- 开卡 201，重复 idempotencyKey 200 同 id。
- 并发同 key：一个 201、一个 200，同 id。
- 续卡 +5 次：30→35；重复 key 不重复加。
- 期限卡开卡 201；冻结/解冻 200。
- 过期卡会员端显示 expired。
- 无 token 401；无 admin cookie 401。
- `/admin/cards` 200。
- 测试数据已清理（member_cards / card_transactions 归零）。

### 下一阶段 S3
- 排课：`/admin/schedule` 周视图、课次、教练/教室、冲突提示。
- 课程类目/教室管理页。
- 教练端今日课表。

## S3 进度（2026-10-21）
### 已完成
- 数据库：新增 `schedule_templates` 表；`class_sessions` 增加 `template_id`；迁移 `scripts/migrate-s3-templates.mjs`。
- 后台接口：
  - `GET/POST/PUT/DELETE /api/admin/courses`
  - `GET/POST/PUT/DELETE /api/admin/rooms`
  - `GET/POST /api/admin/coaches`
  - `GET/POST/PUT/DELETE /api/admin/schedule`（冲突返回 warnings，仍保存）
  - `GET/POST/PUT/DELETE /api/admin/schedule/templates`
  - `POST /api/admin/schedule/generate`（按周模板生成，已存在跳过）
- 后台页面：`/admin/courses`、`/admin/schedule`、`/admin/coach`；导航已加三项。
- 规则：教练/教室冲突只提示不拦截；无候补/支付/多门店。
- 修复：日期 `toISOString` 的 UTC 偏移导致模板生成早一天、会员卡有效期差一天；已统一改为 UTC 日期构造。

### 测试结果（真实执行）
- 课程 5、教室 4、教练 CRUD 正常。
- 手动排课 201；同教练冲突 201 + 警告；同教室冲突 201 + 警告。
- 编辑课次 200，冲突重新计算。
- 周模板创建 201；生成本周 created=1；重复生成 skipped=1。
- 教练今日课表按 coachId 读取 3 节，日期正确 2026-10-22。
- 未登录访问排课接口 401。
- 页面 `/admin/courses|schedule|coach|cards` 均 200。
- 测试课次/模板/教练已清理。

### 未完成/保留
- S2 的 `/admin/cards` 浏览器视觉验收（已出视觉参考图，仍需真实浏览器验收）。
- S2 会员端「我的卡」微信真机验收。
- 教练正式登录（当前教练课表用管理员登录，S5 接教练身份）。

### S3 补充
- 视觉参考图：`docs/visual/admin-cards-reference.html` + `.png`（与现有后台同色系/字号/卡片结构，示例数据已标注）。
- S2 待办保留：
  - `/admin/cards` 真实浏览器视觉验收（参考图已出，未做浏览器逐项走查）。
  - 会员端「我的卡」微信真机点击验收。

## S4 进度（2026-10-21）
### 已完成
- 数据库：`bookings.idempotency_key` + 唯一索引；迁移 `scripts/migrate-s4-bookings.mjs`。
- 会员接口：
  - `GET /api/portal/schedule?from&to` 课表余位/是否已约
  - `POST /api/portal/bookings` 预约（容量原子占位、重复/幂等、同日上限、提前 7 天、开课前 2 小时截止）
  - `GET /api/portal/bookings?scope=upcoming` 我的预约
  - `POST /api/portal/bookings/cancel` 取消（仅本人；释放名额；开课前 2 小时内拒绝）
- 后台接口：
  - `GET /api/admin/reservations?date|sessionId` 预约名单
  - `POST /api/admin/reservations` 后台取消并释放名额
- 页面：
  - 会员端重写 `pages/booking/*`：7 天日期、课表、余位、预约/取消、我的预约
  - 我的账户/了解徕舞新增“预约课程”入口
  - 后台 `/admin/bookings` 改为新预约名单（按日期、按课次、取消）
- 规则：预约不扣次（按 PRD 到课才扣）；取消只释放名额，不做扣次；候补/支付/多门店未做。

### 测试结果（真实执行）
- 容量 1：A 预约 201；A 重复 200 duplicate；B 抢位 409 已满。
- 取消：A 取消 200，名额释放；B 重新预约 201。
- 越权：A 取消 B 的预约 403。
- 并发：A/B 同时抢容量 1，201 + 409，`booked_count=1`。
- 同日上限：第 3 节 409。
- 时间窗：不足 2 小时 409；超过 7 天 409。
- 权限：无 token 401；后台无 cookie 401；`/admin/bookings|schedule` 200。
- 测试预约/课次已清理（bookings=0, sessions=0）。

### 未完成/保留
- 会员端预约页微信真机验收。
- 后台 `/admin/bookings` 浏览器视觉验收。
- S2 的 `/admin/cards` 浏览器视觉验收、会员端「我的卡」真机验收仍保留。
- 扣次时机按 PRD：到课扣（S5 实现）；取消/迟到扣次规则 PRD 未定义，S5 前需确认。
- 预约未校验会员卡（PRD 未明确预约必须持卡），S5 扣次时再校验。

## S5 进度（2026-10-21）
### 已完成
- 教练身份：`users` 复用，`/api/admin/coaches` 可设初始密码（bcrypt）；`/api/coach/login` 签发 12 小时 coach token；教练只能访问自己的课。
- 教练接口：
  - `GET /api/coach/sessions?date`
  - `GET /api/coach/roster?sessionId`
  - `POST /api/coach/check-in`（attended / no_show；卡校验+扣次+流水+考勤+预约状态，单事务 CTE）
  - `GET/POST /api/coach/notes`（课后 60 秒记录）
- 后台：
  - `GET /api/admin/follow-ups` 四类名单（余次≤3 / 30 天未到 / 30 天内到期 / 近 30 天生日）
  - `/admin/followups` 页面 + 导航
  - `/admin/coach` 增加教练账号创建 + `/coach` 登录入口
  - `/coach` 教练工作台：登录、今日课、名单、到课/未到、课后记录
- 扣次规则：到课扣 1；未到扣 1（PRD 已定义）；次数卡扣剩余，期限卡不扣次数只记流水；无卡/次数不足拒绝签到，不写考勤。
- 幂等：attendance(session_id,member_id) 唯一；同一预约重复签到返回 duplicate，不重复扣。

### 真实测试
- 教练登录 200，错密码 401。
- 到课签到 200：卡 30→29，attendance=attended，transaction=-1，booking=attended。
- 重复签到 200 duplicate：卡仍 29，流水 1 条。
- 并发同预约签到：200+200，卡只扣 1。
- 无有效卡：422，booking 仍 booked，无 attendance。
- 未到：200，卡 28→?（扣 1），attendance=no_show。
- 次数不足：第一单扣到 0，第二单 422，booking 仍 booked，无 attendance。
- 越权教练：403；member token 访问教练签到 401。
- 课后记录：201；其他教练的课 403；未签到会员 409。
- 跟进名单：lowBalance/expiring 命中测试卡；inactive30d/birthdays 当前数据为空（无旧到课/生日）。
- `/admin/followups`、`/admin/coach`、`/coach` 均 200。
- 测试数据已清理：bookings/sessions/attendance/member_cards/coaches 归零。

### 未解决业务决策（未写死）
1. **预约是否必须持有效卡**：PRD 未定义；S5 只在“签到扣次”时校验卡，预约阶段不强制。
2. **开课前 2 小时内取消是否扣次**：PRD 只定义“开课前 2 小时取消退回”，S4 当前直接拒绝 2 小时内取消；不扣次。
3. **多卡扣减顺序**：PRD 未定义；当前按“次数卡优先、到期早优先、id 小优先”，需老板确认。
4. **未到是否扣次**：PRD 写“未到扣次”，S5 按此实现；若实际政策不同需改配置。
5. **教练账号密码重置/停用**：当前只支持创建，重置/停用留 S6。
6. **会员端课后记录展示**：S5 只做教练写入；会员端读取留 S6。

### 未完成验收（保留）
- S2 `/admin/cards` 浏览器视觉验收、会员端「我的卡」真机验收。
- S4 会员预约页真机、后台 `/admin/bookings` 浏览器视觉验收。
- S5 `/coach` 教练工作台浏览器/真机验收、`/admin/followups` 浏览器视觉验收。
- 教练正式登录已做最小版；权限细化（停用/改密/审计）未做。

### S5 补充并发测试
- 同一会员仅 1 次余额、两节课并发签到：422 + 200；卡只扣到 0、考勤只 1 条、deduct 流水只 1 条；未成功那单仍为 booked。
- 测试数据已清理。

### S5 四类跟进名单补测
- 用隔离测试会员/课次验证：余次≤3、30 天未到、30 天内到期、近 30 天生日四类均命中；测试后已删除测试会员/课次/卡/考勤。
- 当前生产数据里没有旧到课/生日时，名单为空是正常的，不是接口失败。

## S6 进度（2026-10-21）
### 规则确认与代码变更
- **预约必须持有效卡**：`POST /api/portal/bookings` 新增服务端校验：会员本人（token）、status=active、valid_from ≤ 今天、valid_until ≥ 今天、卡类型 count/period；次数卡 remaining_count > 0。无卡/冻结/过期/次数不足返回 422，不占座。
- **多卡扣次顺序**：保持次数卡优先 → 到期日早优先 → 无到期日靠后 → id 小优先；签到 CTE 增加 valid_from 校验。期限卡不扣次数，只写 0 金额流水。
- 新增 `/api/health`；新增会员端 `/api/portal/notes` + `pages/notes`（PRD 第 10 条）。
- 修复后台导航 11 项在 1440 宽溢出：换行布局。
- 新增部署检查 `scripts/check-deploy-readiness.mjs`、浏览器验收 `scripts/browser-acceptance.mjs`、S6 验收 `scripts/s6-acceptance.mjs`。
- 新增文档：`docs/S6_验收报告_20261021.md`、`docs/S6_部署与上线清单_20261021.md`、`docs/S6_订阅消息接入准备_20261021.md`。

### 验收结果
- 自动化 `node scripts/s6-acceptance.mjs`：**65/65 通过**（12 条核心 + 10 条会员卡补充 + 权限/异常）。
- 浏览器 CDP：`/admin/cards|schedule|bookings|followups|coach`、`/coach` 实际渲染通过；截图 `docs/visual/s6-*.png`。
- 部署检查：必需项 PASS；`cloudbaserc` 缺失、4 个订阅模板 ID 缺失为 WARN；本地 health 200。
- 测试数据清理核对：bookings/sessions/attendance/member_cards/coaches/notes 均 0。

### 部署/上线状态
- 未部署腾讯云托管；未执行生产迁移；未做备份恢复演练；未上传小程序正式版。
- 部署清单与回滚已写入 `docs/S6_部署与上线清单_20261021.md`，需老板授权后执行。
- 订阅消息仅封装 `src/lib/wechat/subscribe.ts`，未接业务调用点、未真实发送。

### 待确认/未验收
1. 未到扣次：PRD 原文写“未到扣次”，S6 按此实现；若实际政策不同需改。
2. 开课前 2 小时内取消：S4 直接拒绝，不扣次；PRD 未细化，待确认。
3. 多卡扣次顺序已确认并实现；如老板要“先扣即将到期”以外的顺序需改配置。
4. 会员端微信真机：我的卡、预约、课后记录未验收。
5. 后台视觉：已渲染截图，老板未签字验收。
6. 订阅消息真实发送、云托管部署、生产迁移、备份恢复未执行。

### 下一阶段
- 老板授权后：备份 Neon → 云托管部署 → health/冒烟 → 小程序体验版 → 真机验收。
- 订阅消息：提供 4 个模板 ID 与字段 schema 后再接触发点。

### S6 安全说明
- `scripts/s6-acceptance.mjs` 需要环境变量 `S6_PIN_36`、`S6_PIN_88`（测试会员 PIN），不再硬编码。
- 管理员密码从 `S6_ADMIN_PASSWORD` 或 `.env.local` 读取，不写入脚本。

## S7 方案 v2（2026-10-22，仅方案，未改运行代码）

- 方案文档：`docs/S7_会员权益调整与审计_方案_20261021.md`（v2 已并入退卡/支付/数据保留规则）
- 验收脚本：`scripts/s7-card-return-acceptance.mjs`（默认拒绝运行，需三重授权，只许在 Neon branch 跑）

### 本版锁定规则（老板 2026-10-22 确认）
- **退卡**：只有 `owner` 能办；剩余次数**冻结不清零**；保留卡项、流水、审计；系统不自动退款/清零/返现；`returned` 与 `frozen` 必须可区分。
- **支付边界**：不做在线支付/微信支付/自动退款/充值；线下业务只记账，**不虚构收款、退款、支付成功状态**。
- **退卡后保留 3 个月**：仍可登录、可看历史；不可约课/签到/用次数；数据只读，不自动新增记录；到期**只提醒不删除**；审计与流水永久保留，不与训练资料一起删。

### 代码审查三个新发现（比原方案更要紧）
1. **卡可用性判断在两处内联复制**（`api/portal/bookings/route.ts:64-82`、`api/coach/check-in/route.ts:34-46,86-94`）。退卡进来后改一处漏一处；且现有文案"冻结/过期/次数不足"对退卡会员是错的 → 要抽 `src/lib/cards/entitlement.ts`。
2. **权限两套体系并存、角色实际不生效**：所有 `/api/admin/**` 用 `requireAdmin`（只验登录、不查角色），`rbac.requireRole` 无人使用。不修这个，"只有 owner 能退卡"落不了地。
3. **`members.freeze_status` 是会员账户级暂停，不是卡状态**。退卡只动卡，误设会员冻结会导致后台误恢复。

### 状态机（已定）
`active / frozen / exhausted / expired / returned`；`returned` 优先级最高、本版不可逆；退卡后冻结/解冻接口一律 409，防覆盖。

### 数据改动（未执行）
`member_cards` 加 `returned_at` / `return_reason`；`card_transactions` 加 `before_balance` / `reference_transaction_id` / `actor_role` / `reason`；`audit_logs` 加关联列与幂等唯一索引。完整 SQL 见方案 5.3。

### 分期
- **S7-A**：审计补齐 + 权限统一 + 抽判定（**可不迁移先做**）
- **S7-B**：退卡接口 + 会员端展示 + 只读拦截（需迁移）
- **S7-C**：3 个月到期提醒（`follow_ups` 第五类 `returned_retention_due`）
- **S7-D**：加/减次、补偿、恢复（规则待定）
- **S7-E**：审计查询页

### 规则状态（2026-10-22 第二轮已并入）
- **已确认 12 条**：退卡权限(owner) / 冻结不清零 / 不自动退款 / 不虚构支付状态 / 退卡后仍可登录看历史 / 退卡后不可核销且**未来预约保留由店主处理** / **不提供恢复，继续消费走新开卡** / **期限卡不虚构剩余次数** / **退课由店主审批执行** / 3 个月只提醒不删 / returned 与 frozen 区分 / 多卡扣次顺序
- **仍待决定 9 条**（不阻塞 S7-A）：3 个月到期后做什么 / 退课定义 / 补课定义 / 补偿是否一次 / 减次边界 / 冻结过期卡能否调 / 退卡原因是否固定选项 / 到期提醒频率 / 审计表是否数据库层禁改。详见方案第十二章。

### 本阶段实际动作
只读代码审查 + 只读查询；改方案文档、HANDOFF、新增验收脚本；**未改运行代码、未迁移、未部署、未写生产库**。


## D1–D3 进度（2026-10-22）

### D1 代码提交（已完成，未推送）
- 11 个提交：`41f084f`(仓库卫生) → `2d71179`(文档)，HEAD 已 clean
- tag：`s1-s6-complete` 指向 `2d71179`
- 本地领先 origin **22 个提交**，**未 push**
- 期间的安全整改一并入库：登录页口令去除、6 份报告去明文、`.gitignore/.dockerignore` 加固、写库守卫、**数据库与会话懒初始化**

### D2 部署（未执行，需在云托管控制台操作）
- 代码已具备构建条件：**无任何 `.env` 文件时 `next build` 实测 exit 0**
- 服务端口 3001、最小实例 1、运行时环境变量（见 `docs/云托管发版清单_20261022.md` 3.1）
- Token 暂未撤销（按老板决定：部署验证后再轮换）

### D3 数据准备（已完成，写入生产库）
- 教练 2：小桥(id=11)、嘉敏(id=12)
- 秦卓宇建档：members.id=284（无手机号，6 位 PIN）
- 会员卡 5 张：id=22~26，瑜伽次卡 10 次，均 active
- 课次 5 节：id=50~54，10-26~10-30（首节容量 2 用于测满员 409）
- 验证：会员端登录 → 我的卡余 10 次；课表余位 2/1/6/1/6
- 凭据与步骤：`backups/D3交付清单_20261022.md`（本地，不入库）
- 执行记录：`backups/d3-prep-20261022.json`

### D4 待做（真机）
- 体验版/开发版打开小程序 → 秦卓宇登录 → 我的卡 → 约 10-28 → 后台名单 → 教练签到 → 扣次 → 取消

## 约刻真实数据接入（2026-10-22 下午）

### 已解除的限制
- 主理人已授权：可登录约刻后台**只读导出**（不修改约刻任何内容、不删减会员信息，只下载头像）。
- 实现方式：Safari 已登录会话 + AppleScript 执行只读 JS + `token` 请求头调 `/api/**`（GET/POST 均为只读查询，未向约刻写任何数据）。

### 已从约刻导出（本地文件，不入库）
- `tmp/yk_coaches.json`：9 位老师（id、姓名、position、头像 URL）
- `tmp/yk_member_details.json`：243 位会员（姓名、手机号、入会日期 intime、头像）
- 老师头像：`public/images/team/yueke/coach-<约刻id>.jpg`（400×400，带 Referer 才能下载）

### 已写入生产库（已备份）
- `team_members`：小桥（id=1，保留「创始人 / 教学主理人」）+ 约刻 8 位老师（关关/兰兰/何老师/翠翠/曹湘湘/左左/汪老师/陶子）。
  - 介绍/资历/寄语全部为空，**不写"资深教练"**；新老师 `is_active=0` 等发版后开启。
  - 嘉敏、若琳 `is_active=0` 下线（保留数据）。
- `members.joined_at`：按约刻 `intime` 回填 **160 人**；剩余空值 199→50。
- 全库占位课时清空：`hours_pilates=18 / equipment=16 / fat_burn=8` 与 `total_hours=42`（**278 人**）。
- 秦卓宇（id=284）：按**测试会员**处理，课时清空、`joined_at=2026-10-21`、`mentor_name=小桥`、`notes=测试会员（主理人本人）`。

### 约刻数据模型的关键结论（不要再重复踩坑）
- 约刻**没有"会员累计课时"字段**。会员侧只有：入会日期（intime）、头像、会员卡（卡类型/次数/剩余）、排课与预约。
- 会员列表页**没有会员详情入口**（行无操作按钮），也没有"上课记录"页面；`/api/member/card` 恒 5000。
- 因此"每人真实累计课时/四类分布"**无法从约刻直接导出**；当前处理为**清空占位值**，等主理人给口径（按卡次数折算 / 按排课出勤统计 / 人工录入）。

### 代码与发版（2026-10-22 13:25 完成）
- `miniprogram/pages/brand/brand.wxml`：导师卡空角色/资历/寄语不再渲染。
- **云托管已发版**：`/images/team/yueke/coach-*.jpg` 全部 200，9 位老师已全部上线（is_active=1）。
- 小桥头像已换成约刻真实照片；小桥头衔保留「创始人 / 教学主理人」。
- 后台直传通道的两个坑（已记录，待下次发版生效）：
  1. `/api/photos` 在云上因 `/app/miniprogram` 只读而 500 → 已改为容错（提交 `d7efc50`，需下次发版生效）。
  2. 运行时写入 `public/member-avatars|member-photos` 的文件**不会被静态服务**（Next standalone 只服务构建期 public），所以「后台直传图片」这条路当前不可用，除非改走 `/brand/uploads` 动态路由（`/api/photos` 修好后可用）。
- 小程序 wxml 改动需在开发者工具重新上传一版；当前线上小程序版本已能看到 9 位老师真实照片（走 `/images/team/yueke/*`）。

### 备份
- `backups/team-testmember-before-*.json`、`backups/yueke-backfill-before-*.json`、`backups/fake-hours-before-*.json`

## 数据权威规则（2026-10-22 主理人确认）

**导入一次之后，一切以后台手动更新的数据为准。**

- 约刻导入只作为**初始基线**，不做二次覆盖：任何导入/同步脚本都不得覆盖主理人在后台手改过的字段。
- 已导入内容（老师、入会日期、会员卡等）如需再同步，必须先比对差异、只补空缺，不覆盖非空值。
- 主理人在后台改的：老师姓名/头像/头衔/上下线/排序、会员档案、卡、课表、价格、徕舞之星、场馆、课程文案 —— 都是最终值。
- 后台改动 → 前端即时生效（已实测：`/api/admin/team` 改完 `/api/portal/team` 立刻返回新值）。

## 最新进展交接（2026-10-22 16:25 最新）

### 1. 已完成并推送到 GitHub (分支 release-preparation)
- **微信云托管成功发版**：线上运行中（crm-011），`/api/health` 200，`/media` 路由生效。
- **小程序前端重构**：
  - 底部导航升级为 5 栏（`pages/booking/booking` 居中直达「开始约课」）。
  - 「我的账户」移除冗余的预约课程行。
  - 「我的蜕变」重构体态手札对比框（BEFORE/AFTER 双相框骨架 + 9维体态追踪维度，彻底告别空字）。
  - 「了解徕舞」课程项目介绍彻底剔除「适合人群」，文案高奢升维，线上数据库已同步生效。
- **对象存储（COS）双模驱动集成**：
  - 新建 `src/lib/storage.ts`，引入 `cos-nodejs-sdk-v5`。
  - 改造 `/api/photos` 和 `/api/portal/avatar`：配了 COS 环境变量直传腾讯云对象存储（永久保存、跨发版不丢失）；没配则平滑降级写本地 `/media`，零报错。
  - `npm run build` 实测通过（exit 0），已 push 到 `release-preparation`。

### 2. 新对话直接接管的下一步（清晰精简）
1. **云托管持久化（配置 COS 变量并发布一次）**：在云托管控制台查看「对象存储」，在服务环境变量填入 `COS_BUCKET`, `COS_REGION`, `COS_SECRET_ID`, `COS_SECRET_KEY`，发布新版（彻底实现图片永久保存）。
2. **小程序发布**：在微信开发者工具点击「上传」提交 `1.3.0`，在小程序后台设为体验版。
3. **真实课时录入**：主理人直接在 `/admin/members` 编辑保存真实课时（或提供约刻消课流水批量回填）。


## 对象存储（COS）接入状态（2026-10-22 晚）

### 代码侧（已加固，提交见下方）
- `src/lib/storage.ts`：双模上传。配置了 `COS_BUCKET/COS_REGION/COS_SECRET_ID/COS_SECRET_KEY` 就走 COS，否则/失败走本地 `public/media`。
- 已补的 5 处加固：
  1. 上传显式设置 `ContentType`（不再落成 application/octet-stream）
  2. 接口返回 `storage`（cos/local）和 `warning`，后台 upsert 弹窗会直接提示降级原因
  3. COS 失败不再静默：真实错误进 warning / 服务端日志
  4. `COS_BUCKET` 缺 `-appid` 后缀会告警；`COS_CUSTOM_DOMAIN` 自动去 `https://`
  5. 会员头像上传补 5MB 限制 + 扩展名白名单；`.env.example` 补 COS 变量说明
- 三条链路都走同一个 uploadFileToStorage：`/api/photos`（后台图片、会员体态照）、`/api/portal/avatar`（会员头像）

### 控制台仍需完成（不配 = 图片仍存本地、发版会丢）
1. 云托管 → 对象存储 → 记下 **Bucket 全名（必须带 -appid）** 和 **Region**
2. COS 控制台 → 该桶 → 权限管理 → **公有读私有写**（否则图片 URL 403）
3. 云托管 → 服务设置 → 环境变量补 4 项（见 `.env.example`）
4. 发布新版本 → 后台上传一张图验证 URL 是 `https://<bucket>...` 且能打开

### 已知限制
- 用主账号 SecretId/SecretKey 风险大，建议子账号最小权限（仅该桶 PutObject/GetObject）
- 换图不删旧图，COS 会累积（费用，不影响功能）
- 未绑定自定义域名前用的是 COS 默认域名

## COS 对象存储打通（2026-10-22 17:19 实测通过）

- 桶：`laiwu-media-1513635286`，地域 `ap-shanghai`，权限「公有读私有写」
- 配置存在数据库 `studio_settings`（key：`cos_bucket` / `cos_region` / `cos_secret_id` / `cos_secret_key` / `cos_public_domain`），**代码优先读库**，环境变量只作兜底
- 原因：云托管控制台的环境变量被人工填错（`Access Key Id ... does not exist`），改用库内配置后一次通过
- 实测：后台传图 → `https://laiwu-media-1513635286.cos.ap-shanghai.myqcloud.com/brand/xxx.jpg`，匿名回读 200 `image/jpeg`
- 注意：
  1. 密钥目前在数据库明文（`studio_settings`），**建议尽快轮换密钥**，轮换后只需更新这 4 行
  2. 云托管环境变量里那 4 个 `COS_*` 是错的，可以清掉，不影响（库优先）
  3. 上传失败会降级本地 `/media` 并在后台弹提示，不再静默

## 小程序包体修复（2026-10-22）

- `miniprogram/images/poster/` 有 61MB 未被引用的 4K 海报源图，导致上传报「源码包超出最大限制 2MB」
- 已删除；`project.config.json` 加 `packOptions.ignore`；包体 62MB → **320KB**

---

# 当前状态快照（2026-10-22 晚，新对话从这里接）

## 一、已经上线且实测通过
- 后端：微信云托管服务 `crm`，线上版本 crm-015+，`/api/health` 200
- 后台：`https://crm-330905-9-1509862887.sh.run.tcloudbase.com/admin`（账号 `admin`，密码=云托管环境变量 ADMIN_PASSWORD）
- 教练端：`/coach`
- 会员端小程序：appid `wx8a00d777dc6631e2`，**已上传 1.3.0（115.7KB）**，未设体验版、未提交审核

## 二、核心成果
| 项 | 状态 |
|---|---|
| 约刻真实老师 | 9 位（小桥/关关/兰兰/何老师/翠翠/曹湘湘/左左/汪老师/陶子），姓名+真实头像入库；介绍/资历为空；嘉敏、若琳下线 |
| 会员入会日期 | 按约刻 intime 回填 160 人（空值 199→50） |
| 假课时 | 278 人的 42 节(18/16/8)已清空；全库无残留 |
| 秦卓宇 | 按测试会员处理：id=284，课时清空，joined_at=2026-10-21，notes=测试会员（主理人本人） |
| 图片上传 | 三条链路全通：后台图片、会员头像、体态对比照 |
| **对象存储** | 桶 `laiwu-media-1513635286`（ap-shanghai，公有读私有写），实测 URL `https://laiwu-media-1513635286.cos.ap-shanghai.myqcloud.com/...` 回读 200 image/jpeg |
| COS 配置位置 | **数据库 `studio_settings`**：cos_bucket / cos_region / cos_secret_id / cos_secret_key / cos_public_domain（代码优先读库，环境变量兜底） |
| 小程序包体 | 62MB → 320KB（删了未引用的 miniprogram/images/poster 4K 源图），上传体积 115.7KB |
| 数据权威规则 | 导入只做基线，之后一切以后台手改为准 |

## 三、业务数据现状（还没到能给会员用的程度）
| 项 | 数量 | 说明 |
|---|---|---|
| 会员 | 280（可登录 271） | — |
| 会员卡 | **5 张** | 只有试点 5 人；其余会员无卡 → 预约会 422（系统要求持有效卡） |
| 卡类型 | 9 种 | **仍是约刻导出的测试价**（含"东方舞年卡"、¥1111 月卡、重名普拉提次卡） |
| 课次 | **5 节** | 试点课 10-26~10-30，容量 2/1/6/1/6，一周后就空 |
| 预约 / 到课 / 训练流水 | 0 / 0 / 0 | 需要真机跑一次全链路 |
| 徕舞之星 / 场馆 | 按主理人要求**保留未动** | 星星 4 条、场馆 4 张占位图，等他自己在后台填/换实拍 |

## 四、待办（按优先级）
1. **真机全链路验证**：秦卓宇（有卡，余 10 次）约 10-28 → 后台 `/admin/bookings` 看名单 → `/coach` 小桥账号签到 → 确认扣次到 9
2. **排真实课表**（`/admin/schedule`）
3. **卡种价格改真价 + 删测试卡种**（`/admin/cards`），再给真实会员开卡
4. **内容补齐**（主理人自己在后台填）：场馆实拍 4 张、徕舞之星、体态对比照、课程文案
5. **课时口径未定**：约刻无"累计课时"字段，三条路——按卡折算 / 按排课出勤统计 / 后台手填（`/admin/members` 4 个输入框可用）
6. **小程序发布流程**：设体验版（免审核，适合店内验收）→ 提交审核（每次新版本都要）→ 发布
7. **安全收尾**：ADMIN_PASSWORD（口令不写明文，见 .env.local） 太弱；腾讯云密钥在聊天里泄露过，建议轮换（轮换后更新 `studio_settings` 那两行即可）

## 五、已经踩过的坑（别再重复）
1. **云托管环境变量里的 COS_* 值是错的**（`Access Key Id ... does not exist`），不要相信它们；真正生效的是数据库配置
2. 云托管镜像里 `public/brand/uploads` 对运行用户**只读**（EACCES），运行时新增文件也不被静态服务 → 上传必须走 COS 或 `public/media` + `/media/[slug]` 路由
3. `/api/photos` 早期会先 mkdir `/app/miniprogram`（只读）导致 500，已修
4. Dockerfile 的 `apk add python3 make g++` 在云构建机偶发 exit 4，已加重试；runner 阶段 COPY 后要重新 chown public
5. 小程序 `miniprogram/images/poster/` 曾塞了 61MB 4K 图导致包体超限；`project.config.json` 已加 packOptions 忽略
6. **CLI 预览二维码会随命令行退出而失效**；长期验收用体验版二维码
7. 发布流水线会因上一个任务未结束报 `ResourceInUse`，等几分钟再点

## 六、新对话开场建议
先读本文件；需要动手时优先只读核对，不要重复导入约刻数据（会覆盖后台手改内容）。
约刻只读约束已解除过（可登录导出），但**不修改约刻任何数据**。

---

# D5 代码排查与修复（2026-10-22 晚）

> 详细发布与验收步骤见 `docs/D5_发布与验收_20261022.md`。
> 代码已推送 `origin/release-preparation`，HEAD `a23cb3c`；**线上仍是旧包，未发版**。

## 排查结论（对照 5113cd1）

- **阻断已修**：`/api/portal/me` 课时统计只认 `booked/completed`，而签到会把 `bookings.status` 写成 `attended` → 到课后课时反掉 1 节。已把 `attended` 纳入；实测 42→43（约课），签到到课后仍 43，取消回落 43→42。
- 同类目映射同一 key 会重复累加课时 → 改为同 key 只取首条。
- `portal/brand-settings`、`portal/offerings` 补 `Cache-Control: private, no-store`。
- brand-settings 抽 `src/lib/brand-settings.ts` 统一白名单；PUT 只收 14 个白名单字段并截断，未知 key 不落库。
- `portal/offerings` 去掉每次 GET 的 `CREATE/ALTER TABLE`（原来会员每次打开页面都给表加 ACCESS EXCLUSIVE 锁）。
- `admin/offerings` 的 imageUrl 统一清洗；PUT 补 `ensureTableAndSeed`；种子补内置底图。
- 小程序：删掉 brand 页残留的 `goBooking`/`copyConciergeWechat`；`inset:0` 改显式四边（iOS<14.1 遮罩会塌）；`backdrop-filter` 的 rpx 改 px；`.detail-label`/`.mentor-creds` 加深到 `#6D645D`；尊称按 `gender` 渲染（male/男 → 先生，其余与未填 → 女士）。
- `/admin` 首页「全部 278 人」改动态取数。

## 两条必须记住的坑

1. **现网会员 token 是用 `ADMIN_PASSWORD` 签的**（云托管没配 `MEMBER_TOKEN_SECRET`）。所以「轮换弱口令」这条安全待办一旦执行，271 个会员会全部掉线。发版时先把 `MEMBER_TOKEN_SECRET` 配上，掉线一次换长期可轮换。
2. **课程类目编号与顺序不一致**：线上展示 01,02,03,05,04（私教 num=05 但 sort_order=4）。属数据问题，改法有两种（改 num 或改 sort_order），等主理人选。

## 待主理人拍板（不阻塞发版）

课时口径三块可能重复加（基线 + 约课/出勤 + trainings 手工登记）；`trainings` 的 `group`/`assessment` 课时被丢掉；`no_show_deduct` 设置未被代码读取；未到/2 小时内取消的扣次政策。

## 验收工具

`scripts/d5-acceptance.mjs`（只读，`--write` 才写库且自动取消）：
`D5_PORTAL_CODE=... D5_MEMBER_PIN=... node scripts/d5-acceptance.mjs`
另一个只读诊断脚本 `scripts/audit-live-state.mjs`，打印线上库各表计数、卡种、课次、课时基线。

---

# D6 发版状态核对（2026-10-23 14:30，新对话从这里接）

> 结论：**线上已经在跑 c5b1544 的新包**（此前「线上仍是旧包」的说法过期）；
> **`MEMBER_TOKEN_SECRET` 仍未配置**；小程序 **1.3.1 已上传**（未提交审核）。
> 完整证据见 `docs/D5_发版状态核对_20261023.md`，可视化验收见 `docs/D5_线上可视化验收_20261023.md`。

## 一、怎么判定线上已是新包（4 条独立证据，全只读）
1. `/admin` 的 `<title>` = `LAIWU 徕舞 · 统一管理后台`（只存在于 c5b1544 的 layout；旧包是「徕舞 · 管理中心」）
2. 线上 `/admin` SSR HTML 里 `<header>` 只有 **1** 个（旧包两条头叠加）
3. 侧栏文案含「账号与权限」（a23cb3c 整棵树没有这个词）+ lucide 图标，旧 emoji 导航已无
4. 登录限流器生效：同一 IP+邮箱连续 5 次失败后第 6 次返回 `429 密码连续错误超限`（限流器是 c5b1544 新增）

22 个后台页 + `/coach` 全部 200；主要 GET 接口全部 200。

## 二、D5 线上验收
`D5_PORTAL_CODE=A1132370 D5_MEMBER_PIN=190494 node scripts/d5-acceptance.mjs` → **14 PASS / 1 FAIL**，
唯一 FAIL 仍是类目编号 `01,02,03,05,04`（数据问题，等主人选改 num 还是 sort_order）。
数据基线：members 280 / 会员卡 5 / 课次 5 / bookings 0 / attendance 0 / trainings 0 / team 11。
（秦卓宇 id=284 的 42 课时 = 18/16/8 是给 D5 验收用的人为基线；其余 279 人课时仍为空，等口径。）

## 三、`MEMBER_TOKEN_SECRET` 还是没配（唯一没发的配置）
实测：线上新签发的会员 token，用 `.env.local` 的 `ADMIN_PASSWORD` 复算 HMAC **命中**，用 `MEMBER_TOKEN_SECRET` 不匹配。
⇒ 现在改 `ADMIN_PASSWORD` = 271 会员全部掉线。要先在云托管控制台配 `MEMBER_TOKEN_SECRET` 并**重新发布**，
当次会员掉线一次（旧 token 旧密钥签），之后轮换口令就与会员无关。

## 四、小程序 1.3.1
2026-10-23 14:10:53–14:11:00 `cli upload` exit 0，AppID `wx8a00d777dc6631e2`，包体 118.0KB/120,819B。
**只上传，未提交审核、未设体验版**（主人去 mp.weixin.qq.com 点）。
提醒：上一轮三项改动里「问候天数 off-by-one」在**后端** `/api/portal/me`，随线上服务已生效，不在小程序包里。

## 五、一个像 bug 但不是的现象
浏览器地址栏直达线上后台，会先出腾讯云 CloudBase「页面访问提示」404 页（测试域名风险提醒），
点「确定访问」才进后台。实测：请求带同源 Referer 直接放行，地址栏直达才拦。绑定自定义域名后消失。
手机/新设备首次访问都会看到一次，别当成后台坏了。

## 六、这一轮发现的真问题（待修/待确认）
1. **手机端顶栏布局坏**（c5b1544 新 UI）：390 宽下品牌文字被压成竖排、溢出 56px 顶栏叠到内容上，
   右侧「退出」按钮被挤出视口。根因：`AdminHeader.tsx` 品牌文字没 `whiteSpace:nowrap/flexShrink:0`，
   中间搜索框 `width:100%` 挤压。修法很小（品牌文字 nowrap + 窄屏隐藏副标题/压缩搜索框），
   但要随下一次发版一起上。证据见 `docs/D5_线上可视化验收_20261023.md`。
2. 角色权限仍未收窄：只有 `users`（账号管理）是真 owner 校验；`member-cards`/`schedule` 的 `requireRole`
   都带 `|| requireAdmin` 兜底 → 角色/停用状态不拦。其余 30 个路由只验 `requireAdmin`。

## 七、主人待办（控制台/小程序后台）
1. 云托管控制台加 `MEMBER_TOKEN_SECRET`（值在 `.env.local`，64 hex）+ 重新发布
2. mp 后台：确认 1.3.1 → 提交审核 → 发布（可选先设体验版）
3. 类目编号改 num（推荐 A：私教 05→04、瑜伽 04→05）还是改 sort_order
4. 真实卡种价格 / 真实课表（10-30 之后课表就空了）/ 课时口径

## 八、D6 收尾（2026-10-23 14:55）

- **D5 验收 15/15 全 PASS**：类目编号按 A 方案修正（私教 05→04、瑜伽 04→05），线上已生效。
- **写库验证已做**（授权 + 三重守卫 + 行备份）：排课新建 201 → 删除 200；预约 201（totalHours 42→43，booked_count 1）→ 取消 200（回落 42，booked_count 0）→ 写测 booking 行已删。
  收尾计数 member_cards 5 / class_sessions 5 / bookings 0 / attendance 0 / card_transactions 5。
  备份与日志：`backups/d6-write-test-*`。
- **手机端顶栏修复已提交并推送**（`34fe170`）：390 下 scrollWidth 482→390、退出按钮 right 481.75→378、品牌文字不再竖排；1024/1440 不变。
- **安全清理已提交并推送**（`fb24ae7`）：文档/脚本里的明文凭据已移除（飞书密钥改为读环境变量）。
- **待主人操作**：仓库可见性设为私有 + 轮换口令（后台口令、飞书 App Secret、GitHub PAT）+
  云托管控制台配置 `MEMBER_TOKEN_SECRET` 和新的 `ADMIN_PASSWORD` + 控制台部署 `release-preparation`（最新 commit `34fe170`）。
  **实测推送不会自动发版**，仍需控制台点部署；这一步发完顶栏修复才上线。
- 上线后复验顺序：`node scripts/d5-acceptance.mjs`（应 15/15）→ 会员 token 反推签名密钥应命中 `MEMBER_TOKEN_SECRET` → 手机浏览器看后台顶栏 → 点退出确认二次进入需登录。

## 九、认证加固已落地（2026-10-23 15:35）

**退出登录/停用/被吊销现在真的立即生效**（HANDOFF 里「requireAdmin 只验签名」这条已修）：

- `requireAdmin` 改为**异步 + 查 `admin_sessions`**（`getValidAdminSession`），37 个文件 74 处调用全部加 `await`，tsc 0 错误。
- 登录**不再下发 legacy 签名 cookie**（`admin_session`/`_sig`）；`getValidAdminSession` 也去掉签名兜底，
  legacy 签名 cookie 彻底失去通行能力。`proxy.ts` 后台页面守卫改看 `admin_token`。
- 角色收严：`member-cards`（开卡/续卡/冻结）、`schedule`（改课/删课）去掉 `|| requireAdmin` 兜底，
  `sync/feishu` 全量同步改为仅 owner；`/api/admin/users` 本来就是严格 owner。
- 新增 `GET /api/admin/session` + `AdminShell` 挂载时校验：旧 cookie 打开页面外壳会被立刻踢回登录页。
- 登录时顺手清理已过期的 `admin_sessions` 行（之前每次登录新增一行，只增不减）。

本地实测（新构建，生产库）：
- 登录 → `Set-Cookie` 只有 `admin_token`（无 legacy）；
- 有效会话：/admin 200、`/api/admin/session` 200、`/api/members` 200、20 个后台 GET 接口全 200；
- 退出 → /admin 307、`/api/members` 401；**重放退出前的 cookie → API 401、浏览器最终落到 `/admin/login`**；
- 写路径回归：排课新建 201 → 删除 200（session 59），计数回到 5；
- 会员端 6 个接口不受影响；D5 验收 15/15。

## 十、会员卡后台可编辑能力（2026-10-23 16:05）

运营临时性场景全部可在后台处理，不用找开发：

| 需求 | 入口 | 说明 |
|---|---|---|
| 新建卡种（次卡/月卡/季卡/年卡/期限卡） | `/admin/cards` → 卡类型配置 | 名称、类别（count/period）、总次数、有效天数、每周限次、价格 |
| 开卡 | `/admin/cards` → 办理开卡 | 选会员 + 卡种，可指定生效日/到期日 |
| 续卡加次 | `/admin/cards` → 续卡 | 次卡加次数、期限卡延长天数（原有） |
| **临时调次（加减剩余次数）** | `/admin/cards` 每行「调次」 | 新增；只改 remaining_count 不动 total_count，写卡流水（含原因） |
| **延期 / 改到期日** | `/admin/cards` 每行「延期」「改到期」 | 新增；延期从「今天与当前截止日较晚者」往后加 |
| 冻结 / 解冻 | 每行按钮 | 原有 |
| 课时增减（4 类课时） | `/admin/members` 编辑会员 | 普拉提/大器械/维密/私教 4 个字段可直接改 |

API：`PATCH /api/admin/member-cards` 现在支持 `freeze / unfreeze / adjust / extend / setExpiry`，
全部只允许 manager 及以上，全部写 `card_transactions` 留痕。
实测（本地新构建 + 生产库，已回滚）：调次 +3/−3（余额 13→10、total 仍 10）、延期 +30 天、改到期日、
非法参数 400 拦截；卡与流水已还原。

## 十一、边界与剩余链路测试（2026-10-23 16:20，全部回滚）

| 测试 | 结果 |
|---|---|
| 同一课次重复预约 | 201 → 200 `duplicate: true`（不重复占座） |
| 满员（容量 1，两人抢） | 甲 201，秦 409「名额已满」 |
| 开课前 2 小时内预约 | 409「距开课不足 2 小时」 |
| 同日上限 2 节 | 第 1、2 节 201，第 3 节 409「同一天最多预约 2 节」 |
| 超过 7 天预约 | 422「最多提前 7 天预约」 |
| 多卡扣次顺序（两张次卡，10-30 / 11-30 到期） | 扣**到期早的**那张（id=35），cardId=35、余额 10→9 ✅ |
| 待回便签：会员提交 → 管理员回复 | 200 / 200，库内 `reply_status=replied` |
| 体态对比：建 / 改 / 删 | 201 / 200 / 200 |

收尾计数全部还原：members 280 / cards 5 / sessions 5 / bookings 0 / attendance 0 / tx 5 / users 3。
备份与日志：`backups/d6d-*`、`backups/d6e-multicard-*`。

**仍未测（原因）**：周报/日报 AI 生成（调用 DeepSeek 有费用）、飞书同步触发（会写库，且数据权威规则只做基线）、
小程序会员端真机页面（需要你手机）。

**新增运营文档**：`docs/门店SOP_排课与开卡_20261023.md`（排课/开卡/调次/延期/上线检查清单，可直接照着点）。

## 十二、批量开卡导入脚本（2026-10-23 16:35）

`scripts/import-member-cards.mjs`（可入库，工具脚本）：

- 默认 **dry-run**，只出清单不写库；`--commit` 才写，且强制 `ALLOW_DB_WRITE=1 ALLOW_REMOTE_DB_WRITE=1`
- 写前自动备份 `member_cards` / `card_transactions` / `card_types` 到 `backups/cards-import-before-*.json`
- 会员匹配优先级：会员ID → LW编号 → member_code → 登录编号 → 手机号 → 姓名（重名直接报错不猜）
- 卡种按名称匹配；缺失时 `--create-types` 可自动建（也可先在后台建好）
- 幂等键 `import-<会员>-<卡种>-<生效>-<到期>-<剩余>` → 同一张卡重复导入会跳过
- 结束输出对账表 `backups/cards-import-report-*.csv`（行号/结果/会员/卡名/说明）

实测（本地 3001 + 生产库，已回滚）：4 行 CSV → 成功 2（秦卓宇余 7/10、王莉余 3/10）、
失败 2（不存在会员 / 余次大于总数），重复跑 2 行全部「跳过」；回滚后 member_cards 5、tx 5。
模板：`imports/会员卡导入_模板.csv`（imports/ 不入库，只在本机）。

## 十三、AI 与同步（2026-10-23 16:36）

- **周报 AI 生成已实测**：线上 `POST /api/admin/weekly-report` → 200，3.2 秒，237 字，署名小桥；测试报告 id=203 已删。
- **飞书同步暂不跑**：`src/lib/feishu-sync-engine.ts` 里是 `UPDATE members SET name/gender/phone/stage/tags/status`——
  会**覆盖后台手改的会员档案**，违反「导入只做基线」规则。要跑必须先改成「只补空缺、不覆盖非空值」。

## 十四、环境变量与口令轮换完成（2026-10-23 17:00）

云托管已发布 **crm-026**（环境变量变更触发），实测：

| 项 | 结果 |
|---|---|
| `MEMBER_TOKEN_SECRET` 生效 | 线上新签发会员 token 的 HMAC 命中 `.env.local` 的 `MEMBER_TOKEN_SECRET`；不再命中 `ADMIN_PASSWORD` |
| 旧密钥签的会员 token | `/api/portal/me` → **401**（271 个已登录会员掉线一次，需重输邀请码+手机尾号；之后改口令不再影响会员） |
| 数据库里的旧明文口令 | `users.password_hash` 原为明文 `laiwu2025`，已替换为 bcrypt(新口令)；备份 `backups/users-before-pwchange-*.json` |
| 旧口令登录 | **401**（`laiwu2025` 彻底作废） |
| 新口令登录 | 200，Set-Cookie 只有 `admin_token` |
| 后台接口 | /admin、/api/admin/session、/api/members、member-cards、users 全 200 |
| 退出登录 | /admin 307、API 401；**重放退出前 cookie 全部 401** |
| D5 验收 | **15/15 全 PASS** |

新口令在 `backups/新管理员口令_20261023.txt`（GitHub 不入库）；本机 `.env.local` 已同步。

**仍需轮换的凭证**（今天截图里露出的）：DeepSeek API Key、COS SecretId/SecretKey（真正生效的在数据库
`studio_settings`，不是环境变量）、Neon 数据库密码、GitHub PAT。

## 十五、小程序提审注意（2026-10-23）

- 小程序名称「徕舞会员成长陪伴系统」审核不通过（涉及通用词），`mp` 后台还能改 2 次；建议改成品牌名
  （如「徕舞普拉提」）先过名称审核，再提审 1.3.2，避免浪费每月提审次数。
- 主体是**个人**：不能选教育培训类目，当前「工具 > 健康管理」是合规选择；无交易无支付，不需要支付资质。

## 十六、全站自检（2026-10-23 17:20，headless Chrome 实测线上）

| 项 | 结果 |
|---|---|
| 后台首页 `/admin` | header 1 条、main padding 28/32、无 JS 异常 |
| 会员卡 `/admin/cards` | 5 张卡，每行「调次/延期/改到期」各 5 个按钮，余额/剩余天数显示正常 |
| 排课 `/admin/schedule` | **发现并修复**：默认显示本周（10-19~10-25）但课都排在下周 → 一片「无排课」，主人会以为课丢了。已改为首次进入自动跳到「最近有课的那一周」并 toast 提示；本地新构建验证：跳到 10-26~11-01，总计 5 节 |
| 会员档案 `/admin/members` | 280 行正常 |
| 账号与权限 `/admin/settings/users` | 3 个账号（admin 主理人 owner + 2 教练），正常 |
| 手机 390 宽 | scrollWidth=390 无横向溢出、header 56px、汉堡可滑出侧栏（left 0 / right 220） |

排课自动跳周需要下次发版生效（只影响后台，不影响小程序提审）。

## 十七、小程序 1.3.3 已提审（2026-10-23 17:43）

- 版本：**1.3.3**（品牌文案统一为女子塑形 + 无卡会员提示），已设为**体验版**
- 提审时间：2026-10-23 17:43:37，状态：**审核中**，预计 1–7 天（加急额度已用完）
- 提审填写：版本描述=门店会员约课/课时记录工具，无支付无交易；测试账号=邀请码 `A1132370` + 手机尾号 `190494`
  （登录页两框，无短信验证）；测试备注已写明登录方式；用户隐私=「采集用户隐私」（沿用原设置）
- 小程序名称在控制台显示为「**徕舞普拉提女子塑形**」（原「徕舞会员成长陪伴系统」因通用词被拒后改的）
- 上线版本（线上）仍是 **1.2.1**（2026-10-19 发布）；审核通过后需点「发布」才对外
- 审核期间不要再上传新版本/改名称/改类目，否则会影响审核
- 后台最新代码 `124b394`（排课自动跳周）**还没部署**，不影响审核；审核通过后发布前建议一起发

## 十八、小程序 1.3.4 已发布上线（2026-10-25 17:23:50）

- 线上版本：**1.3.4**（发布者 Keuo，2026-10-25 17:23:50），旧版 1.2.1（10-19）已被替换
- 内容：品牌文案全站统一为「女子塑形」（登录页/海报模板/海报 canvas）+ 无卡会员可看不能约 + 提示条
- 发布过程：审核 10-23 提交 → 10-25 审核通过 → 发布时需要管理员扫码验证（已由主理人扫码）
- 发布后复验：线上 `/api/health` 200、D5 验收 15/15 全 PASS
- 小程序名称：徕舞普拉提女子塑形；AppID wx8a00d777dc6631e2

### 微信认证（未通过，需重填）
- 订单 15954120630253703044（2026-10-23 创建，30 元已付，普通认证，主体：秦卓宇）
- 状态：**审核重填**，截止 2026-11-22，还有 3 次机会
- 官方原因原文：「审核电话 075536865948 联系用户，被拒接」→ 认证需电话核对，预留号码联系不上
- 处理：微信认证 → 重填 → 填能接通的手机号 → 留意 0755 来电（众信验证 0755-36615555 / 0755-26224288）
- 影响：不影响发布和使用；只影响「已认证」标识、搜索权重、部分微信能力

### 发布后待办
1. 云托管后台部署 `124b394`（排课页自动跳周）——只影响电脑后台，未部署不影响小程序
2. 卡数据批量开卡（266 人无卡，预约会 422）
3. 通知会员：10-23 换密钥后需重新登录一次小程序（邀请码+手机尾号）

## 十九、分享功能修复（2026-10-25 17:40）

- 原因：`pages/booking`、`pages/cards`、`pages/notes` 三个页面**没有 onShareAppMessage**，微信在这三页不给「转发」入口，所以用户感觉「小程序不能分享」。
- 修复（提交 `1.3.5`，136.8KB）：
  - 三个页面补 onShareAppMessage 与 onShareTimeline
  - stars / brand / me / transformation 四个原有分享页补 onShareTimeline
  - `app.js` 全局 `wx.showShareMenu({ menus: ["shareAppMessage","shareTimeline"] })`
- 状态：1.3.5 已上传（2026-10-25 17:36:51）→ **已设为体验版** → **已提审**（17:40:16，审核中，预计 1 至 7 天）
- 线上仍是 1.3.4：分享可用页为 徕舞之星、了解徕舞、我的蜕变、我的账户、意见反馈；预约、我的卡、课后记录 三页仍不可转发，等 1.3.5 审核通过发布

## 二十、后台新增会员功能（2026-10-25 18:40）

之前后台会员页只有搜索、编辑、导入，**没有新增会员入口**；POST /api/members 存在但没接 UI，而且不生成登录凭据。

已补：
- API：POST /api/members 现在会生成 8 位邀请码 + 6 位登录 PIN，自动 portalEnabled=1；支持手动指定（校验格式）；手机号重复返回 409
- UI：会员页顶部「新增会员」按钮 + 右侧抽屉（姓名必填，手机号、性别、生日、入会日期、导师、备注可选）
- 保存后弹出凭据卡：邀请码 / 登录 PIN 各带复制按钮，可直接发会员；下方「再新增一位会员」可连续录入
- 实测：新增 → 生成的邀请码与 PIN 能直接登录小程序（/api/portal/login 200、/api/portal/me 200）；无姓名 400；测试会员已清理（回到 280 人）

**要部署后后台才看得到这个按钮**（后端 + 后台页面改动）。

## 二十一、批量导入会员与会员卡（2026-10-25 18:50）

- 新增接口 `POST /api/admin/members-import`（manager 及以上）：一次最多 500 行，一行 = 一个会员 +（可选）一张卡
  - 自动生成 8 位邀请码；有手机号 → 登录第二因子是手机尾号后 4 位；无手机号 → 生成 6 位登录 PIN
  - 手机号重复自动跳过；卡名对不上、次数不合理、期限卡缺到期日的行标红并写原因，其他行照常导入
  - 每张卡写 card_transactions，幂等键防重复
- 新增页面 `/admin/members/import`：上传 CSV 或直接粘贴，前 5 行预览，导入结果表显示 邀请码 与 登录第二因子（标明手机尾号还是 PIN），可「下载结果与凭据」CSV
- 会员页新增「批量导入」入口；「新增会员」凭据卡也按手机号区分登录方式
- 实测：2 行导入 → 2 会员 + 2 卡；有手机号用尾号 200、无手机号用 PIN 200；重复手机号跳过；界面导入结果与导出正常；测试数据已清理（会员 280、卡 5）
- 模板：`徕舞批量导入会员与会员卡_模板.xlsx`（桌面与「徕舞后台入口」文件夹各一份）
- **需部署后后台才可用**（后端接口 + 新页面）

## 二十二、部署到线上（2026-10-25 19:00）

- 线上版本：**crm-033**（2026-10-25 18:58:39，全量发布），发布方式 keuohub/fitness-crm
- 重要纠正：云托管的**推送触发已开启**（服务设置 → 流水线 → 推送到 release-preparation 时触发），所以 `git push` 到这个分支会自动构建部署，不需要再去控制台点部署。之前 crm-029 到 crm-033 都是这样自动出的。
- 线上实测（crm-033）：
  - `/admin/members/import` 返回 200，页面可见
  - `POST /api/admin/members-import` 导入 1 行 → 新建会员 1 位 + 开卡 1 张
  - 新会员用生成的登录 PIN 调 `/api/portal/login` 返回 200
  - 测试数据已清理，会员回到 280、会员卡 5
- 后台会员页现在有两个入口：新增会员（单个）、批量导入（CSV/粘贴，含开卡与凭据导出）

## 二十三、卡种课程权限上线（2026-10-25 22:15）

由 Gemini 实施 + 本机复核修正后上线。

### 业务规则
- 卡就是课种权限：卡种绑定可预约课种，没有覆盖该课种的卡不能约
- 瑜伽卡只约瑜伽；大器械独立卡只约大器械；私教卡只约私教
- 年卡一卡通覆盖除私教外 4 类；季卡同口径
- 东方舞年卡、一卡通次卡已停用；新增大器械卡（id 11）、私教卡（id 12）
- 后台「卡类型配置」可点标签开关课种权限，新建卡种支持 5 课种多选与一键全选

### 数据
- 新增 `card_type_courses` 表（card_type_id, course_category_id，唯一索引）
- 已灌 15 条权限映射
- 会员 274 人（清理了会员1-5 与陈知意 6 条测试数据）；有效会员卡仍 5 张，全是瑜伽次卡

### 接口
- `/api/portal/bookings`：按课种校验，三种错误分别提示；未配置权限的卡种按「不限制」放行（过渡策略）
- `/api/coach/check-in`：只在覆盖该课种的卡里扣，专用卡（覆盖课种数少）优先，未配置卡排最后
- `/api/admin/member-cards`：开卡支持自定义总次数、初始可用次数、有效天数或到期日、实收金额；加了次数范围校验
- `/api/admin/card-types`：GET/POST/PUT 带 courseCategoryIds
- `/api/portal/cards`：返回 courseCategoryNames

### 批量导入
- 修复手机号已存在就跳过开卡的 bug，改为复用该会员继续开卡
- 三级匹配：手机号 → 会员编号（兼容 LW 前缀、大小写）→ 唯一姓名（重名拒绝并提示）
- 结果与 CSV 增加 matchedBy；重复开卡按幂等键跳过

### 安全
- 5 处 CHANGE_ME 兜底全部移除，缺 MEMBER_TOKEN_SECRET 直接抛错（不再回落 ADMIN_PASSWORD）

### 本机复核发现并修掉的问题
1. 签到扣卡排序用了 `CASE WHEN course_scope = 0` 引用 SELECT 别名，Postgres 报错，改为子查询表达式
2. 未配置权限的卡排到了最前（会被优先扣），改为排最后
3. 导入的会员编号匹配不支持 LW 前缀，已兼容
4. 开卡接口未校验剩余次数不大于总次数，已加
5. Gemini 的测试脚本排序与实现不一致且断言失败仍打印 PASS，已重写

### 实测
- 瑜伽卡约大器械课返回 422「这张卡不能约高定大器械，请使用季卡或年卡一卡通或大器械卡或联系小桥」
- 临时开年卡一卡通后可约（201），回滚后数据复原
- 扣卡候选顺序：大器械卡 > 季卡 > 年卡一卡通
- 批量导入：老会员补卡成功（matchedBy）、新会员建档、重名拒绝、重复行幂等跳过
- `scripts/test-permissions-and-import.mjs` 全部 PASS
- 测试数据已全部回滚：会员 274、会员卡 5、预约 0
