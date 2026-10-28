# SPRINT 22 — REAL USER PILOT REPORT

Date: 2026-06-02 | TypeScript: 0 errors

---

## Summary

Pilot infrastructure complete. Usage tracking is now embedded in every Portal page. 15 pilot members scripted with unique portal codes. Admin dashboard for observing real usage.

---

## New/Modified Files

| File | Status | Purpose |
|------|--------|---------|
| `src/scripts/seed-pilot-members.ts` | NEW | Creates 15 pilot members with portal codes |
| `src/db/schema.ts` | MODIFIED | Added `portal_usage_logs` table |
| `src/app/api/portal/track/route.ts` | NEW | POST to log usage events, GET for admin stats |
| `src/components/portal/UsageTracker.tsx` | NEW | Auto-tracks page view + duration on every Portal page |
| `src/app/portal/layout.tsx` | MODIFIED | Added `<UsageTracker />` |
| `src/app/portal/login/page.tsx` | MODIFIED | Added login tracking via sendBeacon |
| `src/app/admin/usage/page.tsx` | NEW | Admin dashboard: logins, page views, shares, top pages |
| `package.json` | MODIFIED | Added `seed:pilot` script |

---

## Pilot Group (15 members)

To activate: `npm run seed:pilot`

This will:
- Create 15 members (王莉 through 林静) if they don't exist
- Generate unique 8-char portal codes for each
- Set `portalEnabled = 1` so they can log in at `/portal/login`

## Usage Tracking

**Automatic (no code changes needed in pages):**
- `UsageTracker` component in Portal layout tracks every page view with duration
- Login page tracks successful logins via `navigator.sendBeacon`

**Admin Dashboard:**
- URL: `/admin/usage`
- Shows: logins, page views, shares, unique active members, top 5 pages
- Filters: last 7 days / 14 days / 30 days

**Database:**
- Table: `portal_usage_logs`
- Columns: `member_id`, `event`, `page`, `duration_seconds`, `created_at`
- Events: `login`, `page_view`, `share`, `feedback`

---

## Feedback Collection (TBD — manual for pilot)

For the pilot phase, coach will collect feedback through:
1. Direct conversation during training sessions
2. Observation of Portal usage via admin dashboard

Questions to ask:
- Which page do you visit most?
- Which page is confusing?
- Would you open Portal daily?

---

## Data Verification Checklist

| Step | How to Verify |
|------|---------------|
| Feishu -> CRM | Run sync at `/admin/sync`, check member list |
| CRM -> Portal | Login as member, verify name/days/events match CRM |
| Portal -> Growth Report | Open `/portal/report`, verify score/stage match training data |

---

## Key Questions (to answer after 7-14 days of pilot)

1. Most visited page? (observed via `/admin/usage`)
2. Least visited page? (observed via `/admin/usage`)
3. Features with zero usage? (observed via `/admin/usage`)
4. Most valuable feature? (from coach feedback)
5. What to remove? (from observation + feedback)

Answer these after real usage data accumulates.
