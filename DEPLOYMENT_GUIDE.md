# Deployment Guide — 徕舞成长系统

## Option 1: Vercel (Recommended)

Vercel supports Next.js natively, but **SQLite does not work** on serverless. You must:

1. Migrate database to Vercel Postgres, Turso, or use `vercel/edge-config` for small data
2. Set all environment variables in Vercel dashboard
3. Deploy via `vercel` CLI or GitHub integration

**Verdict**: Not recommended for SQLite. Consider only if you migrate to a hosted DB.

## Option 2: Railway

Railway supports persistent disks + Node.js.

1. Create a new Railway project from GitHub repo
2. Add a "Volume" mount at `/app/data` for SQLite persistence
3. Set `DATABASE_URL` to `file:/app/data/fitness.db` (if using Prisma) or keep as `fitness.db`
4. Set all environment variables
5. Build command: `npm run build`
6. Start command: `npm start`

## Option 3: Self-host (Alibaba Cloud / Tencent Cloud / VPS)

**Recommended for current stage.** Simple, low cost, full control.

```
# On Ubuntu 22.04 / Debian 12:

# 1. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install PM2
npm install -g pm2

# 3. Clone repo
git clone <repo-url> /opt/laiwu
cd /opt/laiwu

# 4. Create .env.local with production keys
# 5. npm install (not allowed in Codex, but OK on server)
npm install

# 6. Build
npm run build

# 7. Start with PM2
pm2 start npm --name "laiwu" -- start
pm2 save
pm2 startup

# 8. Nginx reverse proxy
sudo apt install -y nginx
# Configure /etc/nginx/sites-available/laiwu:
#   server { listen 80; server_name your-domain.com;
#     location / { proxy_pass http://localhost:3001; } }
sudo ln -s /etc/nginx/sites-available/laiwu /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 9. HTTPS with Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Database Backup (Cron)

```bash
# Add to crontab: daily backup at 2am
0 2 * * * cp /opt/laiwu/fitness.db /opt/laiwu/backups/fitness-$(date +\%Y\%m\%d).db
```

## Environment Setup (Server)

```env
# .env.local on production server
DEEPSEEK_API_KEY=sk-...
FEISHU_APP_ID=cli_aa9f954ccd79dbc8
FEISHU_APP_SECRET=lmJG16xBayLglDXmrQH2mg7joYwlZ3vK
FEISHU_BASE_TOKEN=RnlqbnTcBaGIW0skLLWclgHbnzb
FEISHU_TABLE_ID=tblg1rCqMOOjksj5
ADMIN_EMAIL=admin@laiwu.fitness
ADMIN_PASSWORD=<change-this>
```

## Port

Application serves on **port 3001** (port 3000 is reserved for CCX).

## Post-Deploy Verification

```bash
curl -I https://your-domain.com
curl https://your-domain.com/manifest.json
curl https://your-domain.com/api/platform-stats
```
