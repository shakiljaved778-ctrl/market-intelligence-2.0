# Mizaan Intelligence — Design Audit (Phase 0)

_Generated 2026-10-31. Design/UX/front-end quality pass. **No data-pipeline, API,
ranking or clustering logic is changed** — issues in that layer are flagged here for
a decision, not fixed._

## 1. Stack detected

| Area | Finding |
|---|---|
| Framework | **Next.js 15.5.25**, **App Router** (Server Components default) |
| React | 19.1.0 |
| CSS | **Tailwind v4.1.14** via `@theme inline`, design tokens as CSS custom properties in `app/globals.css` |
| Fonts | `next/font/google` — Geist Sans, Geist Mono, Newsreader (self-hosted, `display:swap`) |
| Charts | **lightweight-charts 4.2.3** (price), **recharts 2.15** (macro) |
| Theme | Cookie-driven (`mi_theme`), read server-side (`lib/theme/server.ts`), applied as `<html data-theme>` — no flash. Two states today (light/dark); **no "system" state yet.** |
| Embeddings | `@xenova/transformers` (MiniLM) in CI runner only; `HashEmbedder` offline default |
| Data | Fixture mode (zero keys) → in-memory wire + sample quotes; DB/KV optional |

## 2. Page inventory (15 routes)

`/` · `/markets` · `/markets/screener` · `/news` · `/news/[slug]` · `/sections` ·
`/economy` · `/economy/calendar` · `/economy/indicator/[series]` · `/quote/[symbol]` ·
`/recap/[slug]` · `/methodology` · `/about` · `/terms` · `/privacy`

## 3. Before screenshots

`design-audit/before/{light,dark}/{page}-{375,768,1280,1440}.png`
(13 pages × 4 widths × 2 themes, captured against the production build on localhost.)

## 4. Findings — ranked by impact

Legend: **CONFIRMED** (reproduced in code/screens) · **FLAG** (real, but in a layer I
must not change without your decision) · **NOT REPRODUCED** (claim checked, not present).

### P0 — Trust & correctness

1. **CONFIRMED — "Movers" renders twice on the homepage.** `app/page.tsx` renders
   `<Movers/>` in the hero (line ~151, added in the live-data-hero pass) **and** again
   in the "Markets snapshot" section (line ~371). Same 6 rows twice. → Remove the
   snapshot duplicate; keep one Movers next to the Session recap (Phase 4 layout).

2. **CONFIRMED — "sample rows are illustrative" undermines trust.**
   `components/market/Movers.tsx` footer shows _"Illustrative sample prices — no live
   feed configured."_ and the table still shows sample numbers on production. For a
   data product this reads as fake data. → Replace with an explicit **"Sample data —
   no live feed configured"** chip on every sample row + a proper **stale/unavailable**
   state. The real fix is live quotes (needs your Finnhub/FRED keys + Vercel KV).

3. **CONFIRMED — stale session-recap link.** `lib/narrative/read.ts` hardcodes
   `DEMO_DATE = "2026-09-16"`, so the recap slug is always `session-close-2026-09-16`
   even though the wire now leads with late-October stories. → Derive the recap date
   from the **latest wire/candle date** so it always resolves to the newest recap.
   (Config/label only — the recap math off `UNIVERSE` is untouched.)

### P1 — Information quality

4. **CONFIRMED — "Latest" rail is rank-ordered, not time-ordered.** `app/page.tsx`
   uses `clusters.slice(1,9)` (ranking order) for the Latest list, so a 6-days-ago item
   can sit above a 4-days-ago one. → Sort the Latest rail by `eventTime` descending
   (presentation only; ranking is untouched).

5. **CONFIRMED — Pexels mislabelled as a data source.** The hero "Market & macro data
   from" strip lists `FMP, Finnhub, FRED, World Bank, **Pexels**`. Pexels is an **image**
   provider. → Move it to an image/photo credit in the footer.

6. **CONFIRMED — inconsistent source-count semantics.** The hero stat tile shows
   `totalSources` = **sum of every cluster's source count** (~hundreds) labelled
   "source reports clustered", while each story shows its own "3 sources". Both are
   correct but read as contradictory. → Relabel the aggregate ("source reports across
   the wire") and visually separate it from per-story counts.

7. **FLAG (clustering) — near-duplicate Bitcoin stories in Crypto.** Four separate
   "Bitcoin rallies / pushes higher / climbs" items exist (`fixtures/articles.ts` ids
   ~225, ~ (outlet-d), ~ (ETF), 215–216). They sit on different days/sources so the
   48h single-link clusterer keeps them apart, but in the Crypto section they read as
   dupes. **Not a render bug.** Options for you: (a) content de-dup (trim redundant
   fixtures — safe, content only), or (b) widen the clustering window / raise topic
   boost for same-instrument stories (pipeline change — needs your sign-off).

### P2 — Editorial / classification

8. **FLAG (classifier) — possible section misfiling.** Checked the specific example:
   **"FTSE 100 climbs to a record…" classifies correctly as _markets_**, not Tech & AI
   (the classifier uses word-boundary matching, so "chipmakers" ≠ "chip"). So that
   claim is **NOT REPRODUCED** today. The real risk remains: the classifier checks
   non-financial keywords **first**, so a markets headline that contains a strong
   non-financial term (e.g. "satellite", "vaccine") would mis-route. No classifier
   change made (per instruction). Recommend a small review set + priority tweak if/when
   you want it.

9. **NOT REPRODUCED — raw feed titles like "Monetary policy decisions".** No such
   unedited title exists in the current fixtures (all are editorially written). This
   would apply to **live RSS ingest**; recommend a title-casing/cleanup step in the
   ingest path when live sources are enabled.

### P2 — Brand / markup (verify against screenshots)

10. **PARTIAL — wordmark.** Code stacks `MIZAAN` over `INTELLIGENCE` (`flex-col`),
    with `INTELLIGENCE` hidden below the `sm` breakpoint. It is **not** run together as
    "MIZAANINTELLIGENCE" in the markup, but the hierarchy is weak (same family, tight
    stacking, hidden on mobile). → Phase 3 rebuilds the wordmark: `MIZAAN` in Newsreader
    + `Intelligence` in Inter small-caps `--ink-3`, always visible, with the balance-beam
    ◆ mark.

11. **PARTIAL — "duplicate" nav.** There are two `<nav>` elements (desktop
    `hidden md:flex`, mobile `md:hidden`). They are **mutually exclusive via
    `display:none`**, so screen readers announce only one at a time — **not** a true
    double-announce. Still, two labelled landmarks is avoidable. → Phase 3 consolidates
    to one responsive `<nav>`.

## 5. Contrast audit (WCAG 2.2) — proposed Phase 1 palette

Verified with a relative-luminance script (`design-audit/contrast.cjs`). Body text
target **4.5:1**, large/UI **3:1**.

**DARK ("Terminal Night") — all pass**, including `ink3/bg` 5.82, `ink4/bg` 3.26,
`signal/bg` 9.42, `up/bg` 8.70, `down/bg` 6.92.

**LIGHT ("Ledger") — three to resolve:**
| Pair | Ratio | Target | Verdict |
|---|---|---|---|
| ink / bg | 16.27 | 4.5 | PASS |
| ink2 / bg | 8.85 | 4.5 | PASS |
| ink3 / bg | **4.43** | 4.5 | **FAIL (small text)** — ok on surface (4.90); restrict ink3 small-text to surfaces, or darken to ~#63676F |
| ink4 / bg | **2.39** | 3 | **FAIL** — ink4 is decorative/disabled only, **never meaningful text** |
| brand / bg | 10.02 | 4.5 | PASS |
| signal / bg | **3.30** | 4.5 | **FAIL as text** — saffron is for the ◆ glyph + large/bold rank scores (3:1 large = pass); for small "computed" text darken to ~#8A5A12 |
| up / bg | 4.79 | 4.5 | PASS |
| down / bg | 4.98 | 4.5 | PASS |

**Colorblind-safe mode:** `up #2563EB` light/bg **4.60 PASS**; `down #D97706` light/bg
**2.83 FAIL** → use a darker orange on light (e.g. **#B45309**, ~4.6:1). Dark mode both pass.

## 6. Open decisions for you

- **A. Live data** — sample quotes stay until you add **Finnhub + FRED** keys and a
  **Vercel KV** store. Want me to wire it (I'll walk you through the env setup)?
- **B. Bitcoin dupes (finding 7)** — content de-dup (safe) vs clustering-window change
  (pipeline). Which?
- **C. Classifier priority (finding 8)** — leave as-is, or add a markets-override review
  set? (I will not touch it without your yes.)
- **D. Light `signal`/`ink3` tweaks** — approve the darker values above so the light
  theme passes AA for text while keeping the saffron accent for glyphs.

---
Phases 1–6 proceed from here; each commits separately and re-screenshots to
`design-audit/after/`.
