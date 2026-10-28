# SPRINT 21 — PWA + PRODUCTION READY REPORT

Date: 2026-06-02 | TypeScript: 0 errors

---

## Summary

Portal is now PWA-ready. Can be installed to iOS/Android home screen, launches in standalone mode with custom icon and splash. Production checklist and deployment guide documented.

---

## New/Modified Files

| File | Status | Purpose |
|------|--------|---------|
| `public/manifest.json` | NEW | PWA manifest: name, icons, display: standalone, theme_color #C27B57 |
| `public/icons/icon-192.svg` | NEW | 192x192 PWA icon (warm "L" monogram) |
| `public/icons/icon-512.svg` | NEW | 512x512 PWA icon |
| `public/icons/apple-touch-icon.svg` | NEW | 180x180 Apple touch icon |
| `src/app/layout.tsx` | MODIFIED | Added `manifest`, `appleWebApp`, `icons`, `viewport` metadata |
| `src/components/portal/InstallPrompt.tsx` | NEW | `beforeinstallprompt` handler with bottom sheet prompt |
| `src/app/portal/page.tsx` | MODIFIED | Added `<InstallPrompt />` to Portal home |
| `src/components/portal/ui/LoadingStates.tsx` | NEW | `Spinner`, `PageLoading`, `SkeletonCard`, `ErrorState`, `EmptyState` |
| `src/lib/image-placeholder.ts` | NEW | Shared `WARM_BLUR` base64 placeholder |
| `PRODUCTION_CHECKLIST.md` | NEW | Pre-deploy and post-deploy verification steps |
| `DEPLOYMENT_GUIDE.md` | NEW | VPS/Vercel/Railway deployment instructions with Nginx + PM2 |

---

## PWA Features

| Feature | Status |
|---------|--------|
| `manifest.json` with `display: standalone` | Done |
| 192x192 + 512x512 SVG icons | Done |
| `apple-touch-icon` + `apple-mobile-web-app-capable` | Done |
| `theme-color` and `background-color` | Done |
| Install prompt (beforeinstallprompt) | Done |
| `viewport: user-scalable=false` | Done |
| Offline shell | Partial (Next.js static assets cached by browser; full SW not yet) |

---

## Installation Flow

1. Member visits `/portal/login` and logs in with invite code
2. On Portal home, browser fires `beforeinstallprompt` event
3. After 2 second delay, bottom sheet appears: "添加到主屏幕"
4. Tap "添加" -> native PWA install dialog
5. App appears on home screen with "L" monogram icon
6. Opens in standalone mode (no Safari/Chrome chrome)

---

## Loading States

Unified components in `LoadingStates.tsx`:
- `Spinner` — centered spinner
- `PageLoading` — full page spinner
- `SkeletonCard` — animated placeholder with N lines
- `ErrorState` — error message + retry button
- `EmptyState` — "暂无数据" with description

---

## Production Readiness

- **Environment variables** documented in `PRODUCTION_CHECKLIST.md`
- **Database backup** command included
- **Deployment guide** covers VPS (Nginx + PM2 + Certbot), Railway, and Vercel (with SQLite caveat)
- **Admin credentials** documented with change-on-first-deploy note

---

## Remaining (for future sprints)

- Service Worker with full offline caching (`next-pwa` or custom SW)
- Push notifications for new AI feedback
- Splash screen customization for iOS
- Real PNG icon generation (currently SVG — works in most browsers)
