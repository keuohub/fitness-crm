# Production Checklist — 徕舞成长系统

## Environment Variables (.env.local)

| Variable | Value | Required |
|----------|-------|----------|
| DEEPSEEK_API_KEY | sk-... | Yes (AI feedback) |
| FEISHU_APP_ID | 由部署环境注入（不写入文档） | Yes (sync) |
| FEISHU_APP_SECRET | 由部署环境注入（不写入文档） | Yes (sync) |
| FEISHU_BASE_TOKEN | RnlqbnTcBaGIW0skLLWclgHbnzb | Yes (sync) |
| FEISHU_TABLE_ID | tblg1rCqMOOjksj5 | Yes (sync) |
| ADMIN_EMAIL | admin@laiwu.fitness | Yes (CRM login) |
| ADMIN_PASSWORD | 由部署环境注入（不写入文档） | Yes (CRM login) |

## Database

- File: `fitness.db` (SQLite, WAL mode)
- Backup: `cp fitness.db fitness.db.backup` before deploy
- Tables: members, trainings, photos, questionnaire_submissions, ai_feedback_reports, member_memories, daily_health_logs

## Admin Account

- URL: `/admin/login`
- Email: `admin@laiwu.fitness`
- Password: 由部署环境注入，首次部署必须更换（不写入文档）

## Portal Access

- Each member needs `portalCode` + `portalEnabled=1` in DB
- Generate via CRM member detail page or `/api/portal/admin`
- Members login at `/portal/login`

## Pre-Deploy Checks

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes (may need `npm rebuild better-sqlite3`)
- [ ] `fitness.db` has at least 1 member with `portalEnabled=1`
- [ ] Admin can login at `/admin/login`
- [ ] Portal login works with valid invite code
- [ ] Brand homepage loads at `/`

## Post-Deploy Checks

- [ ] HTTPS enabled
- [ ] `manifest.json` accessible at `/manifest.json`
- [ ] iOS "Add to Home Screen" shows correct icon and name
- [ ] Portal PWA opens in standalone mode (no browser chrome)
- [ ] Feishu sync works via `/admin/sync`
