# DOMAIN PLAN — 徕舞成长系统

## 推荐域名结构

```
                     laiwufitness.com
                    /        |         \
                   /         |          \
          www.laiwu...   portal.lai...   crm.laiwu...
           (品牌官网)     (会员端)        (管理后台)
```

| 子域名 | 用途 | 路由映射 | 用户 |
|--------|------|----------|------|
| `www.laiwufitness.com` | 品牌官网 | `/`、`/stories` | 所有人 |
| `portal.laiwufitness.com` | 会员成长端 | `/portal/*` | 会员 |
| `crm.laiwufitness.com` | 管理后台 | `/admin/*`、`/members/*` | 教练/管理员 |

---

## 备选域名（按优先级）

| 优先级 | 域名 | 说明 |
|--------|------|------|
| 1 | `laiwufitness.com` | 首选，品牌一致 |
| 2 | `laiwu.fitness` | 更短，`.fitness` TLD 匹配行业 |
| 3 | `laiwu.fit` | 最短，但 `.fit` 认知度低 |
| 4 | `zhongxianglaiwu.com` | 全品牌名，较长 |

---

## DNS 配置

```
# A 记录（Vercel）
www     CNAME   cname.vercel-dns.com
portal  CNAME   cname.vercel-dns.com
crm     CNAME   cname.vercel-dns.com

# 根域名重定向
@       A       76.76.21.21  (Vercel)
```

---

## Vercel 项目配置

建议单项目多域名：

```
Project: fitness-crm
Domains:
  - www.laiwufitness.com
  - portal.laiwufitness.com
  - crm.laiwufitness.com
```

Next.js middleware 根据 `Host` header 路由：

```typescript
// middleware.ts 扩展
const hostname = request.headers.get("host") || "";

if (hostname.startsWith("crm.")) {
  // 仅允许 /admin 和 /members 路径
} else if (hostname.startsWith("portal.")) {
  // 重写根路径 / → /portal
}
```

---

## HTTPS

- Vercel 自动提供 Let's Encrypt SSL 证书
- 强制 HTTPS 重定向（Vercel 默认开启）
- HSTS: `Strict-Transport-Security: max-age=63072000`

---

## 成本估算

| 项目 | 费用 |
|------|------|
| 域名注册 (laiwufitness.com) | ~$12/年 |
| Vercel Pro (团队协作) | $20/月 |
| 总计 | ~$260/年 |

Hobby 计划（免费）也可用，但限制 100GB 带宽/月。
