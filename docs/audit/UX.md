# UX, accessibility and performance audit

27 Nov 2026. Screenshots are of production (www.mizaan.tech) before the fixes
below were released, at 1440 / 768 / 390 px, in `docs/audit/ux/`. Photos
are blanked in these captures because the audit machine cannot reach the photo
host; the generative cover underneath shows instead. The layout is unchanged.

| Page | Desktop 1440 | Tablet 768 | Phone 390 |
| --- | --- | --- | --- |
| Home | [home-1440](ux/home-1440.jpg) | [home-768](ux/home-768.jpg) | [home-390](ux/home-390.jpg) |
| Markets | [markets-1440](ux/markets-1440.jpg) | [markets-768](ux/markets-768.jpg) | [markets-390](ux/markets-390.jpg) |
| Section (Economy) | [section-1440](ux/section-1440.jpg) | [section-768](ux/section-768.jpg) | [section-390](ux/section-390.jpg) |
| Story | [story-1440](ux/story-1440.jpg) | [story-768](ux/story-768.jpg) | [story-390](ux/story-390.jpg) |
| Quote (AAPL) | [quote-1440](ux/quote-1440.jpg) | [quote-768](ux/quote-768.jpg) | [quote-390](ux/quote-390.jpg) |

## Lighthouse (mobile, production, median of 3)

Run by `.github/workflows/lighthouse.yml` (run 46077919874) on the deploy
before these fixes.

| Page | Performance | Accessibility | LCP | Notes |
| --- | --- | --- | --- | --- |
| Home | 83 | ≥ 95 | 4.4 s | |
| Markets | ≥ 90 | ≥ 95 | 3.1 s | |
| Wire | 85 | 94 | 4.1 s | |
| Section front | 89 | 94 | 3.7 s | |
| Economy | **73** | ≥ 95 | 3.5 s | Total Blocking Time 727 ms — fixed below |
| Quote | 86 | ≥ 95 | 3.9 s | |

All pages clear the brief's P0 floor of 80 except Economy, which this release
fixes. LCP is 3–4.4 s against a 2.5 s target; it is the main performance
gap (see "Not fixed").

### After the fixes (production, run of 27 Nov 23:34 UTC)

| Page | Performance | Accessibility | LCP |
| --- | --- | --- | --- |
| Home | 84 | ≥ 95 | 4.3 s |
| Markets | ≥ 90 | ≥ 95 | 3.5 s |
| Wire | 87 | ≥ 95 | 3.9 s |
| Section front | 89 | ≥ 95 | 3.6 s |
| Economy | ≥ 90 | ≥ 95 | 3.2 s |
| Quote | 87 | ≥ 95 | 3.9 s |

Every page now clears the P0 floor (80) and the accessibility target (95).
LCP remains above 2.5 s everywhere; the homepage payload is the next lever.

## Fixed in this release

| Issue | Fix | Verified |
| --- | --- | --- |
| **Sideways scroll on tablets**: every page 909 px wide at 768 px, 1108 px at 1024 px | Pill nav from 1024 px (bottom tab bar below), market-status pill from 1280 px | No overflow at 360, 390, 768, 900, 1024, 1280, 1440 px on four pages, both nav versions |
| **Economy TBT 727 ms**: ~30 Recharts charts hydrating | Static server-rendered SVG sparklines on the tiles | 12 sparks and 1 interactive chart in demo; no client errors |
| **Story headline** still in the serif face | Bold sans, per the owner's headline decision (Originals unchanged) | Phone screenshot |
| **Homepage date line** wrapped with a stray "·" on phones | Date only below 640 px | Phone screenshot |
| **Contrast**: index-board and tape stamps used `--ink-4` (reserved for decoration) | `--ink-3`; board cards on the lighter surface | Local Lighthouse: wire 94 → 96 |
| **Heading order**: wire items and homepage section titles | h2 (no visual change) | Local Lighthouse |
| **Label-in-name**: logo link and video buttons | Text-based names | Local Lighthouse |
| **Quote page a11y 89**: a heading inside each fundamentals `<dl>`; a colour-only link | Heading outside the list; inline links underlined | Production: ≥ 95 |
| **Homepage LCP 6–7 s**: every cover fetched at 1200 px and lazy-loaded | Responsive srcset for Pexels covers; the lead photo loads eagerly at high priority | Production: 75 → 84, LCP 4.3 s |

## Not fixed, needs a decision or more work

1. **`--ink-3` contrast (owner decision).** Secondary text on the cream
   background is about 4.4:1, just under WCAG AA's 4.5:1 for small text, and is
   flagged across pages (the "Intelligence" under the logo too). Darkening the
   token slightly fixes it everywhere, but it is a design-system change
   (CLAUDE.md: Phase 3, owner-approved). The logo stays as is.
2. **LCP 3–4.4 s on mobile.** The homepage serialises the whole ranked wire into
   the page (about 0.9 MB of HTML), and the lead photo comes from a remote host.
   Trimming the payload and preloading the lead image are the next levers
   (ROADMAP engineering follow-ups).
3. **One heading-order flag on the homepage** (a compact story card's h3).
   Minor.
4. **Cold-start empty section** (seen once): ROADMAP engineering follow-ups.

## Already in place (checked, no change)

- **Video facade:** a thumbnail and play button; YouTube's player loads only on
  click. Channel labels come from verified channel IDs.
- **Reduced motion:** the tickers stop under `prefers-reduced-motion`, and
  their duplicate copy is `aria-hidden`.
- **Price direction:** always ▲/▼ plus a sign, never colour alone. There is
  also a colour-blind-safe mode.
- **Empty states:** honest "no data" states throughout. A missing value is
  never shown as a zero or a placeholder.
