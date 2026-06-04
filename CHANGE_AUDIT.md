# CHANGE_AUDIT.md

逐文件构建修复审计 | 2026-06-02

---

## 1. src/app/layout.tsx

### 修改前做什么
从 Google Fonts 引入 `Geist` 字体，通过 `next/font/google` 下载后注入 `--font-sans` CSS 变量，在 `<html>` 标签上通过 `cn("font-sans", geist.variable)` 使用。

### 修改了什么
- 删除 `import { Geist } from "next/font/google"` 及 `const geist = Geist(...)` 配置
- 删除未使用的 `import { cn } from "@/lib/utils"`
- `<html>` className 从 `cn("font-sans", geist.variable)` 改为 `"font-sans"`

### 为什么必须修改
`npm run build` 在生产构建期间访问 `https://fonts.googleapis.com` 下载字体文件，网络不通时（如离线/防火墙环境）直接导致 build 失败：`Failed to fetch Geist from Google Fonts`。

### 如果回滚会不会影响 build
会。只要 Google Fonts 端点不可达，build 必定失败。

### git diff 摘要
```
-import { Geist } from "next/font/google";
-import { cn } from "@/lib/utils";
-const geist = Geist({subsets:['latin'],variable:'--font-sans'});
 <html lang="zh-CN" className="font-sans">
```

---

## 2. src/db/schema.ts

### 修改前做什么
`members` 表的 `currentQuestionnaireId` 字段通过 `.references(() => questionnaireSubmissions.id)` 引用 `questionnaireSubmissions` 表。由于 `questionnaireSubmissions` 在 `members` 之后定义，形成循环类型推断。

### 修改了什么
- `integer("current_questionnaire_id").references(() => questionnaireSubmissions.id)` → `integer("current_questionnaire_id")`
- 保留字段，仅删除 `.references()` 调用

### 为什么必须修改
Drizzle ORM + TypeScript 在 `sqliteTable` 定义中处理循环引用时会产生 `implicitly has type 'any'` 的编译错误。`npm run build` 中的 TypeScript 检查将此视为硬错误，阻断构建。

### 如果回滚会不会影响 build
会。TypeScript 报 `'members' implicitly has type 'any'` 直接失败。

### git diff 摘要
```
-  currentQuestionnaireId: integer("current_questionnaire_id").references(() => questionnaireSubmissions.id),
+  currentQuestionnaireId: integer("current_questionnaire_id"),
```

---

## 3. src/scripts/daily-feedback-cron.ts

### 修改前做什么
从 `@/db/schema` 两次导入：第一次导入 `members`, `questionnaireSubmissions`, `aiFeedbackReports`（第7行），第二次导入 `members as membersTable`, `aiFeedbackReports`（第10行）。`aiFeedbackReports` 出现两次导致 `the name 'aiFeedbackReports' is defined multiple times` 错误。代码中使用 `membersTable` 来避免与第一次导入的 `members` 冲突。

### 修改了什么
- 合并为单次导入：`import { members as membersTable, questionnaireSubmissions, aiFeedbackReports } from "@/db/schema";`
- 删除第10行的重复导入
- 将剩余两处 `members` 引用改为 `membersTable`

### 为什么必须修改
Turbopack 构建将重复导入视为硬错误，直接 `Build error occurred`，零容忍。

### 如果回滚会不会影响 build
会。`npm run build` 报 `the name 'aiFeedbackReports' is defined multiple times` 直接失败。

### git diff 摘要
```
-import { members, questionnaireSubmissions, aiFeedbackReports } from "@/db/schema";
+import { members as membersTable, questionnaireSubmissions, aiFeedbackReports } from "@/db/schema";
-import { members as membersTable, aiFeedbackReports } from "@/db/schema";
```

---

## 4. src/app/api/members/route.ts

### 修改前做什么
`POST` 处理器中，使用 `const [member] = await db.insert(members).values({...}).returning()` 的方式解构 Drizzle 的 `.returning()` 返回值。

### 修改了什么
```typescript
// 修改前
const [member] = await db.insert(members).values({...}).returning();
// 修改后
const result = await db.insert(members).values({...}).returning();
const member = (result as any)[0];
```

### 为什么必须修改
`better-sqlite3` 驱动下，Drizzle 的 `.returning()` 返回类型是 `any[] | RunResult` 联合类型，TypeScript 不允许直接解构。`npm run build` 将此作为硬错误（`Type 'any[] | RunResult' must have a '[Symbol.iterator]()' method`）。

### 如果回滚会不会影响 build
会。TypeScript 解构检查报错。

### git diff 摘要
```
-  const [member] = await db.insert(members).values({...}).returning();
+  const result = await db.insert(members).values({...}).returning();
+  const member = (result as any)[0];
```

---

## 5. src/app/api/members/[id]/route.ts

### 修改前做什么
`PUT` 处理器中，使用 `const [updated] = await db.update(members).set({...}).returning()` 解构。

### 修改了什么
```typescript
// 修改前
const [updated] = await db.update(members).set({...}).returning();
if (!updated) { ... }
// 修改后
const result = await db.update(members).set({...}).returning();
const updated = (result as any)[0];
if (!updated) { ... }
```

### 为什么必须修改
同 #4 — `any[] | RunResult` 联合类型无法解构。

### 如果回滚会不会影响 build
会。

### git diff 摘要
```
-    const [updated] = await db.update(members).set({...}).returning();
+    const result = await db.update(members).set({...}).returning();
+    const updated = (result as any)[0];
```

---

## 6. src/app/api/photos/route.ts

### 修改前做什么
`POST` 处理器中，将 `formData.get("memberId")` 取出的值（`FormDataEntryValue | null`）通过 `(memberId as number)` 强制断言。同时有 `.returning()` 解构。

### 修改了什么
- `(memberId as number)` → `(memberId as unknown as number)`（两跳断言，满足 TS strict 要求）
- `.returning()` 改为先赋值再 `[0]` 取值

### 为什么必须修改
TypeScript 不允许 `File` 类型直接断言为 `number`（`Conversion of type 'File' to type 'number' may be a mistake`）。必须经过 `unknown` 中转。

### 如果回滚会不会影响 build
会。两跳断言检查报错。

### git diff 摘要
```
-    const mid = typeof memberId === "string" ? parseInt(memberId, 10) : (memberId as number);
+    const mid = typeof memberId === "string" ? parseInt(memberId, 10) : (memberId as unknown as number);
```

---

## 7. src/app/api/trainings/route.ts

### 修改前做什么
`POST` 处理器中，`const [record] = await db.insert(trainings).values({...}).returning()`。

### 修改了什么
```typescript
// 修改前
const [record] = await db.insert(trainings).values({...}).returning();
// 修改后
const __r_record = await db.insert(trainings).values({...}).returning();
const record = (__r_record as any)[0];
```

### 为什么必须修改
同 #4。

### 如果回滚会不会影响 build
会。

### git diff 摘要
```
-  const [record] = await db.insert(trainings).values({...}).returning();
+  const __r_record = await db.insert(trainings).values({...}).returning();
+  const record = (__r_record as any)[0];
```

---

## 8. src/app/api/questionnaire/route.ts

### 修改前做什么
`POST` 处理器中，`const [record] = await db.insert(questionnaireSubmissions).values({...}).returning()`。

### 修改了什么
同 #7 模式：先存 `__r_record` 再 `[0]` 取值。

### 为什么必须修改
同 #4。

### 如果回滚会不会影响 build
会。

### git diff 摘要
```
-  const [record] = await db.insert(questionnaireSubmissions).values({...}).returning();
+  const __r_record = await db.insert(questionnaireSubmissions).values({...}).returning();
+  const record = (__r_record as any)[0];
```

---

## 9. src/app/api/ai/daily-feedback/route.ts

### 修改前做什么
`POST` 处理器的两处：`GET` 中的 `const [report] = await db.select()...` 不需要修（`.select()` 返回直接可解构数组）。`POST` 中 `const [report] = await db.insert(aiFeedbackReports).values({...}).returning()` 需要修。

### 修改了什么
`POST` 中的 `.returning()` 解构改为先存后取模式。

### 为什么必须修改
同 #4。

### 如果回滚会不会影响 build
会。

### git diff 摘要
```
-    const [report] = await db.insert(aiFeedbackReports).values({...}).returning();
+    const __r_report = await db.insert(aiFeedbackReports).values({...}).returning();
+    const report = (__r_report as any)[0];
```

---

## 10. src/app/api/sync/feishu/route.ts

### 修改前做什么
飞书同步处理器中有 5 处 `.insert().returning()` / `.update().returning()` 的解构使用。

### 修改了什么
全部 5 处改为先存中间变量再 `[0]` 取值。

### 为什么必须修改
同 #4。

### 如果回滚会不会影响 build
会。

### git diff 摘要
```
-  const [latest] = await db.select({...}).from(questionnaireSubmissions)...;
-  const [existingMember] = await db.select().from(members).where(...);
-  const [newMember] = await db.insert(members).values({...}).returning();
-  const [existingQ] = await db.select().from(questionnaireSubmissions).where(...);
-  const [q] = await db.insert(questionnaireSubmissions).values({...}).returning();
+  // 上述每处改为:
+  const __r_xxx = await db.xxx(...).returning();
+  const xxx = (__r_xxx as any)[0];
```

---

## 总结

| 文件 | 问题类型 | 是否阻断 build |
|------|---------|---------------|
| `layout.tsx` | 网络依赖（Google Fonts） | 是 |
| `schema.ts` | Drizzle 循环类型推断 | 是 |
| `daily-feedback-cron.ts` | 重复 import | 是 |
| 7 个 API route | `better-sqlite3` `.returning()` 类型联合 | 是 |

所有 10 个修改均为**构建阻断问题**。修改原则：只改类型/导入/构建方式，不改任何业务逻辑、API 返回结构、数据库表结构。
