# CHANGE AUDIT — SPRINT 5

## TASK 1 — Portal 登录体系

### src/app/api/portal/login/route.ts (新增)
- **功能**: POST 接收 { portalCode }，在 DB 查询 portalCode 匹配且 portalEnabled=1 的会员
- **修改**: 新建文件
- **依赖**: drizzle-orm eq/and, Next.js cookies API

### src/app/api/portal/me/route.ts (新增)
- **功能**: GET 读取 cookie portal_member_id，查 DB 返回会员信息
- **修改**: 新建文件

### src/app/portal/_components/AuthGuard.tsx (新增)
- **功能**: 读取 PortalMemberContext，未登录时 replace 到 /portal/login
- **修改**: 新建文件
- **风险**: 路由守卫依赖客户端 useEffect，SSR 阶段不做拦截

### src/app/portal/layout.tsx (修改)
- **原**: 直接渲染 PortalHeader + children + PortalNav
- **改为**: PortalMemberProvider > AuthGuard > 原结构
- **为什么**: 全局注入会员上下文 + 路由守卫

### src/app/portal/login/page.tsx (修改)
- **原**: Mock 密码 "LAIWU0010"，手动 router.push
- **改为**: fetch POST /api/portal/login，根据 API 返回跳转

---

## TASK 2 — PortalMemberProvider

### src/context/PortalMemberContext.tsx (新增)
- **功能**: React Context Provider，useEffect 中 fetch /api/portal/me
- **导出**: usePortalMember() hook

### src/app/portal/page.tsx (修改)
- **原**: const DEMO_MEMBER_ID=18, DEMO_MEMBER_NAME, DEMO_JOINED_AT
- **改为**: usePortalMember() 获取 memberId/name/joinedAt

### src/app/portal/growth/page.tsx (修改)
- **同上**

### src/app/portal/feedback/page.tsx (修改)
- **同上**

### src/app/portal/me/page.tsx (修改)
- **同上**

### src/components/portal/PortalHeader.tsx (修改)
- **同上**

---

## TASK 3 — 邀请码管理 API

### src/app/api/portal/admin/route.ts (新增)
- **功能**: POST action=generate-code|toggle-enabled|get-code
- **generate-code**: crypto.randomBytes 生成 8 位 hex + 启用 Portal
- **toggle-enabled**: 翻转 portalEnabled 0/1
- **get-code**: 返回当前 portalCode + portalEnabled + portalActivatedAt

---

## TASK 4 — 勋章去 Emoji

### src/lib/member-badges.ts (修改)
- **原**: Badge 接口有 icon: string，值为 Emoji
- **改为**: 删除 icon 字段，Badge 接口只有 id/name/description/unlocked

### src/app/members/[id]/_components/BadgeCard.tsx (修改)
- **原**: {badge.icon} 渲染 Emoji
- **改为**: BADGE_INITIALS 映射 + 圆形陶土橙/灰色背景徽章 + 中文首字

---

## TASK 5 — 分享页

### src/app/portal/share/page.tsx (新增)
- **功能**: 展示天数/等级/训练/问卷/照片/AI反馈数据 + 勋章清单 + AI 生成总结语
- **复用**: usePortalMember + useGrowthEvents + getGrowthStats + generateBadges
