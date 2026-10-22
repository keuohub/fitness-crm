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
