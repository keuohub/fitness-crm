FROM node:20-alpine AS base

WORKDIR /app

# 安装依赖
FROM base AS deps
# better-sqlite3 需要编译工具；云托管构建机偶发拉不到 apk 索引（exit 4），加重试与索引更新
RUN (apk update || true) \
 && (apk add --no-cache libc6-compat python3 make g++ \
     || (sleep 10 && (apk update || true) && apk add --no-cache libc6-compat python3 make g++))
COPY package.json package-lock.json ./
RUN npm ci

# 构建生产版本
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 运行镜像
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 确保图片上传目录存在并拥有写入权限
RUN mkdir -p /app/public/member-photos && chown -R nextjs:nodejs /app/public

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# COPY 会把 public 里的子目录变成 root 所有，必须在 COPY 之后再放开写权限，
# 否则运行时上传会 EACCES（public/media 需要能新建目录和写文件）
RUN mkdir -p /app/public/media && chown -R nextjs:nodejs /app/public

USER nextjs

EXPOSE 3001

CMD ["npm", "start", "--", "-p", "3001"]
