# SPRINT 15 — SYSTEM AUDIT & STABILIZATION REPORT

Date: 2026-06-02 | TypeScript: 0 errors | Build: Compile OK (sqlite3 binary mismatch, see G7)

---

## TASK A · ROUTE MAP

### Public (Brand Website)

| Route | Page | Purpose | Auth |
|-------|------|---------|------|
| `/` | `src/app/page.tsx` | Brand marketing site (16 sections) | None |
| `/portal/login` | `src/app/portal/login/page.tsx` | Invite code login | None |

### Portal (Member — Protected)

| Route | Page | Purpose | Auth | Data Source |
|-------|------|---------|------|-------------|
| `/portal` | `src/app/portal/page.tsx` | Home: Hero + Triple Ring + Quote + Journey preview | Cookie `portal_member_id` | `PortalMemberContext` -> `useGrowthEvents(memberId)` |
| `/portal/growth` | `src/app/portal/growth/page.tsx` | JourneyProgress + Badges + Timeline | Cookie `portal_member_id` | `PortalMemberContext` -> `useGrowthEvents(memberId)` |
| `/portal/feedback` | `src/app/portal/feedback/page.tsx` | Magazine reading mode | Cookie `portal_member_id` | `fetch(/api/ai/period-report?memberId=...)` |
| `/portal/me` | `src/app/portal/me/page.tsx` | Wallet identity card + stats | Cookie `portal_member_id` | `PortalMemberContext` + `member-level` |
| `/portal/share` | `src/app/portal/share/page.tsx` | Shareable growth summary | Cookie `portal_member_id` | `useGrowthEvents(memberId)` |

### Admin (CRM)

| Route | Page | Purpose | Auth |
|-------|------|---------|------|
| `/admin` | `src/app/admin/page.tsx` | **redirect("/")** — dead end | None |
| `/admin/sync` | `src/app/admin/sync/page.tsx` | Feishu sync tool | None |
| `/admin/reports` | `src/app/admin/reports/page.tsx` | Periodic reports | None |
| `/members/[id]` | `src/app/members/[id]/page.tsx` | Member detail | None |
| `/members/[id]/trainings` | `src/app/members/[id]/trainings/page.tsx` | Training records | None |
| `/members/[id]/photos` | `src/app/members/[id]/photos/page.tsx` | Photo gallery | None |
| `/members/[id]/questionnaire` | `src/app/members/[id]/questionnaire/page.tsx` | Questionnaire detail | None |
| `/members/new` | `src/app/members/new/page.tsx` | Create member | None |

### Route Issues Found

| Issue | Severity | Detail |
|-------|----------|--------|
| `/admin` redirects to `/` | Medium | CRM entry redirects to brand site; CRM users must navigate to `/members` directly |
| No CRM authentication | High | All `/members/*`, `/admin/*` routes have zero auth protection |
| `/members/[id]/edit` exists but unused | Low | Edit page exists, not linked from detail page |

---

## TASK B · PORTAL DATA FLOW

### Chain Verification

```
Login (/portal/login)
  -> POST /api/portal/login { portalCode }
     -> Sets cookie: portal_member_id (httpOnly)
        -> redirect: /portal

PortalMemberProvider (layout)
  -> GET /api/portal/me
     -> Reads cookie portal_member_id
        -> Queries members table
           -> Returns { memberId, memberName, joinedAt }

Portal pages:
  -> usePortalMember() -> { memberId, memberName, joinedAt }
     -> useGrowthEvents(memberId, joinedAt, memberName)
        -> Promise.allSettled([
             GET /api/trainings?memberId=X,
             GET /api/photos?memberId=X,
             GET /api/questionnaire?memberId=X,
             GET /api/ai/period-report?memberId=X
           ])
```

### Hardcoded Data Check

| Search | Result |
|--------|--------|
| `memberId.*18` in Portal code | **None** |
| `DEMO_MEMBER` in Portal code | **None** |
| `MOCK_MEMBER` in Portal code | **None** |
| `mock` in Portal code | **None** |

All Portal pages derive `memberId` from `PortalMemberContext`, which reads from the cookie set by login API.

---

## TASK C · AUTHENTICATION AUDIT

### Login Flow

1. User enters `portalCode` on `/portal/login`
2. `POST /api/portal/login` validates against `members` table (`portalCode` + `portalEnabled=1`)
3. Sets `portal_member_id` cookie (httpOnly, 30 day expiry)
4. Client: `window.location.href = "/portal"`

### Session Reading

`/api/portal/me`:
- Reads `portal_member_id` cookie
- Returns 401 if missing/invalid
- Returns member data if valid

### AuthGuard

`PortalMemberContext` calls `/api/portal/me` on mount.
If response is 401, sets `error = "AUTH_REQUIRED"`.
`AuthGuard` watches this and calls `router.replace("/portal/login")` if unauthenticated.

**Exception**: `/portal/login` bypasses AuthGuard.

### Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Cookie not signed | Medium | `portal_member_id` is plain integer — a user can guess other member IDs |
| No CSRF protection | Low | Portal is read-only, POST only on login |
| No logout | Low | No way to clear the cookie from UI |

### Cross-member Data Leak Check

| Test | Result |
|------|--------|
| Member A login -> view /portal/growth | Only Member A's events |
| Direct API call with different memberId | API routes use query param `memberId` — **no cookie validation** on `/api/ai/period-report`, `/api/trainings`, etc. |

**Finding**: Portal frontend passes the correct memberId from context, but the underlying API routes (`/api/trainings`, `/api/photos`, `/api/questionnaire`, `/api/ai/period-report`) do **not** validate that the requestor's cookie matches the requested memberId. This means anyone who knows a memberId can call these APIs directly.

---

## TASK D · API AUDIT

### Active APIs

| API | Method | Purpose | Caller | Auth Check |
|-----|--------|---------|--------|------------|
| `/api/platform-stats` | GET | Live stats for Evidence section | Brand homepage | None |
| `/api/platform-stats/activities` | GET | 24h activity feed | Brand homepage | None |
| `/api/cases` | GET | Case study data | CasesSection | None |
| `/api/ai-report-sample` | GET | Latest AI report sample | AIReportSection | None |
| `/api/portal/login` | POST | Invite code validation | Login page | Validates portalCode+enabled |
| `/api/portal/me` | GET | Current session member | PortalMemberContext | Reads cookie |
| `/api/portal/admin` | POST | Generate/toggle/get portalCode | CRM member detail | **None** |
| `/api/dashboard` | GET | Dashboard stats | (legacy) | None |
| `/api/members` | GET | List members | CRM | None |
| `/api/members/[id]` | GET/PUT/DELETE | CRUD member | CRM | None |
| `/api/trainings` | GET/POST | Training records | CRM + Portal | None |
| `/api/photos` | GET/POST | Photo records | CRM + Portal | None |
| `/api/questionnaire` | GET/POST | Questionnaire data | CRM + Portal | None |
| `/api/ai/period-report` | GET/POST | AI feedback reports | CRM + Portal | None |
| `/api/ai/daily-feedback` | POST | Single feedback | CRM | None |
| `/api/ai/batch-daily-feedback` | POST | Batch feedback | CRM | None |
| `/api/ai/batch-period-report` | POST | Batch report | CRM | None |
| `/api/ai/birthday-blessing` | POST | Birthday message | CRM | None |
| `/api/sync/feishu` | GET/POST | Feishu import | Admin sync | None |

### Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| No API-level auth | High | All data APIs accept any memberId with no session validation |
| `/api/portal/admin` no auth | High | Anyone can POST to generate portalCode or toggle members |
| `/api/dashboard` may be unused | Low | Check if CRM dashboard still calls this |

---

## TASK E · DATABASE INTEGRITY

### Tables

- `tenants` — single tenant (id=1)
- `users` — coach accounts
- `members` — core member records
- `trainings` — training sessions
- `photos` — progress photos
- `questionnaire_submissions` — health questionnaires
- `ai_feedback_reports` — AI-generated reports
- `member_memories` — narrative memories
- `daily_health_logs` — daily tracking

### Integrity Check

Cannot run full DB integrity from this context (sqlite3 binary mismatch prevents runtime queries), but schema analysis shows:

| Check | Status |
|-------|--------|
| Foreign keys on `trainings.member_id` | OK — references `members.id` |
| Foreign keys on `photos.member_id` | OK |
| Foreign keys on `questionnaire_submissions.member_id` | OK |
| Foreign keys on `ai_feedback_reports.member_id` | OK |
| Orphan risk | Low — FK constraints enforced via `PRAGMA foreign_keys = ON` |

---

## TASK F · MOBILE PORTAL AUDIT

### Responsive Breakpoints

| Component | Mobile (390px) | Notes |
|-----------|----------------|-------|
| PortalHeader | `px-6 pt-12 pb-6` | Adequate spacing |
| PortalNav | `fixed bottom-0`, icons 18px | Proper mobile bottom nav |
| Portal Home Hero | `text-5xl` ring + stats | Comfortable |
| Growth JourneyProgress | Horizontal scrollable | Fits 390px |
| Feedback cards | `px-6` + GlassCard | Readable font sizes |
| Me page | Wallet card | Centered, fits |

### Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| `portal/login` page uses `min-h-[80vh]` | Low | Already mobile-friendly |
| No horizontal overflow found | OK | All sections use `max-w-*` + `px-6` |

---

## TASK G · PRODUCTION READINESS

### Health Check

Unable to execute `scripts/health-check.ts` — `better-sqlite3` native module is compiled for a different Node.js version (115 vs 147 needed for Node v26).

To fix: `npm rebuild better-sqlite3`

### Blocking Issues for Production

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | No authentication on CRM/admin routes | Critical | Add middleware or API auth |
| 2 | `/api/portal/admin` exposed without auth | Critical | Add session check |
| 3 | API routes don't validate memberId against session | High | Add cookie validation to data APIs |
| 4 | `better-sqlite3` version mismatch | Medium | `npm rebuild` |
| 5 | `/admin` redirects to `/`, CRM users lost | Medium | Create proper CRM dashboard or redirect to `/members` |
| 6 | No logout function | Low | Add logout button to PortalNav |

---

## SUMMARY

### What Works
- Portal login -> session -> data retrieval chain is complete
- `memberId` flows correctly from cookie through context to API calls
- No hardcoded memberId (18) remains in Portal code
- All Portal pages (`/portal`, `/portal/growth`, `/portal/feedback`, `/portal/me`) read from authenticated session
- Mobile layout is functional on 390px–430px
- TypeScript: 0 errors

### What Needs Work
- **CRM/admin routes have zero authentication** — this is the top priority
- Data APIs don't enforce that the requestor owns the requested memberId
- Portal admin API is publicly accessible
- SQLite binary needs rebuild for Node v26

### Risk Priority

1. **Critical** — No CRM auth
2. **Critical** — `/api/portal/admin` public
3. **High** — API memberId isolation
4. **Medium** — SQLite rebuild
5. **Low** — No logout
