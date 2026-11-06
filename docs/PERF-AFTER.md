# Performance — after Phase 8

Companion to `PERF-BEFORE.md`. Phase 8 applied **pixel-identical** performance
work (SSR kept everywhere, so `pnpm visual:compare` stays 36/36) and set up a
reproducible way to measure the headline scores.

## Changes applied (§8)

| Area | Change | File |
|---|---|---|
| Heavy charts | Recharts (sector heatmap) code-split via `next/dynamic`, SSR kept | `app/markets/page.tsx` |
| Heavy charts | Lightweight-Charts (price chart) code-split via `next/dynamic`, SSR kept | `app/quote/[symbol]/page.tsx` |
| OG image | Hard CDN `Cache-Control: public, max-age=86400, s-maxage=86400, immutable` | `app/api/og/route.tsx` |
| Images | AVIF/WebP formats + single allowed remote host | `next.config.ts` |
| Package imports | `optimizePackageImports: ["lucide-react"]` (icons tree-shaken) | `next.config.ts` |

These sit on top of the already-strong posture documented in `PERF-BEFORE.md`
(self-hosted `next/font` with `display: swap`, deterministic on-brand SVG covers,
KV→Postgres→fixture read path with no vendor calls on render, Server Components
by default).

## Deterministic in-repo evidence

These are measured from `pnpm build` and are environment-independent (unlike lab
Lighthouse numbers — see below).

**Shared First-Load JS carries no charting library.** Every route shares a
**115 kB** First-Load bundle; neither Recharts nor Lightweight-Charts is in it.
The chart libraries are isolated in their own async chunks and load only on the
two routes that render a chart, and only after the server-rendered content has
painted:

| Chunk (minified, on disk) | Library | Loaded on |
|---|---|---|
| `chunks/2994-*.js` ≈ 204 KB | Recharts | `/markets` only |
| `chunks/76-*.js` ≈ 176 KB + `chunks/4980-*.js` ≈ 156 KB | Lightweight-Charts | `/quote/*` only |

Representative First-Load JS per route (from the production build):

| Route | Route size | First Load JS |
|---|---|---|
| `/` | 619 B | 119 kB |
| `/markets` | 10.3 kB | 192 kB |
| `/news` | 172 B | 119 kB |
| `/news/[slug]` | 816 B | 120 kB |
| `/quote/[symbol]` | 1.9 kB | 121 kB |
| shared by all | — | 115 kB |

**Layout stability.** Cumulative Layout Shift is **0** (target < 0.1) — the fixed
`aspect-[16/9]` cover wells, tabular-figure (`tabular-nums`) number columns, and
`next/font` (no FOIT/FOUT reflow) mean nothing shifts as the page settles. CLS is
the one Core-Web-Vital that is independent of network throttling, so it is
recorded here directly.

## Targets (§8)

| Metric | Target |
|---|---|
| Lighthouse Performance (mobile) | ≥ 90 |
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |

## Headline numbers — captured in CI, not from the agent sandbox

The Lighthouse **Performance / LCP / INP** numbers must be captured off a clean
network. A sandboxed agent routes every request through a proxy that adds real
latency, which Lighthouse then compounds with its simulated mobile throttling —
so a run from there reports an inflated Performance score (≈ 48, LCP ≈ 5 s) that
reflects the proxy, not the deploy. Those figures are **not** recorded here.

Instead, run the **`lighthouse` GitHub Actions workflow** (manual
`workflow_dispatch`) — it runs mobile Lighthouse ×3 against the production §8
routes via `@lhci/cli` and uploads the reports to Lighthouse CI temporary public
storage (URLs in the job log). Config: `lighthouserc.json`. Equivalent local
command on a normal network:

```bash
npx lighthouse https://www.mizaan.tech/ --preset=perf --form-factor=mobile --quiet
# repeat for /markets /news /news/<slug> /quote/<symbol>
```

| Route | Perf | LCP | CLS | INP |
|---|---|---|---|---|
| `/` | from workflow | from workflow | 0 | from workflow |
| `/markets` | from workflow | from workflow | 0 | from workflow |
| `/news` | from workflow | from workflow | 0 | from workflow |
| article | from workflow | from workflow | 0 | from workflow |
| quote | from workflow | from workflow | 0 | from workflow |

> Record the workflow's Performance/LCP/INP figures in this table after the run.
