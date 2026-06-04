# PORTAL DESIGN AUDIT — Sprint 6

## Visual System

| Token | Source | Status |
|-------|--------|--------|
| COLORS | `src/lib/design/DESIGN_TOKEN.ts` | 5-color palette (primary/secondary/bg/surface/border) |
| SHADOWS | `src/lib/design/DESIGN_TOKEN.ts` | 3 tiers (soft/card/floating) |
| TYPOGRAPHY | `src/lib/design/DESIGN_TOKEN.ts` | 4 tiers (hero/sectionTitle/body/caption) |
| RADIUS | `src/lib/design/DESIGN_TOKEN.ts` | Unified rounded-3xl (card) / rounded-2xl (button) |

## Motion System

| Preset | Source | Usage |
|--------|--------|-------|
| fadeUp / fadeIn / scaleIn / slideFromRight / heroReveal | `src/lib/design/motion-presets.ts` | All Portal pages |
| staggerContainer / staggerItem | `src/lib/design/motion-presets.ts` | Lists + cards |
| MICRO (hoverLift / hoverCard / tapScale / scrollReveal) | `src/lib/design/motion-presets.ts` | GlassCard + scroll sections |

## Component System

| Component | Path | Features |
|-----------|------|----------|
| GlassCard | `src/components/portal/ui/GlassCard.tsx` | Gradient bg + backdrop-blur + hover lift + tap scale |
| PortalHeader | `src/components/portal/PortalHeader.tsx` | Context-driven: greeting + level badge |
| PortalNav | `src/components/portal/PortalNav.tsx` | Lucide icons + active route highlight |
| AuthGuard | `src/app/portal/_components/AuthGuard.tsx` | Route guard based on PortalMemberContext |

## Page Architecture

| Route | Visual Style | Key Components |
|-------|-------------|----------------|
| `/portal` | Magazine Cover Hero | heroReveal + HeroGlow + TripleRing + Quote |
| `/portal/growth` | Journey Timeline | JourneyProgress + Milestones + BadgeCard |
| `/portal/feedback` | Editorial Reading | First-letter emphasis + scroll progress + line-clamp |
| `/portal/me` | Apple Wallet Card | Scale-in identity card + stats + level bar |
| `/portal/share` | Growth Summary | Days + stats + badges + AI summary |

## Design Debt

| Item | Severity | Fix |
|------|----------|-----|
| `DURATION` / `MICRO` usage not unified across all pages | Low | Could create shared section wrapper |
| HeroGlow animation is CSS `@keyframes` in globals.css | Low | Acceptable for performance |
| `border` usage in GlassCard line separator (Me page) | Low | Replace with `bg` color div |

## Next Phase

- Portal real-time data streaming (SSE)
- Member self-upload (photos, questionnaire)
- Growth forecast / prediction cards
- Dark mode
