import Link from "next/link";
import { NoData } from "@/components/market/Provenance";
import { summaryStamp } from "@/lib/market/provenance";
import type { MarketRow } from "@/lib/market/read";

/**
 * Sector heatmap — server-rendered (no client chart library, so the tiles are
 * in the HTML and need no JavaScript). Built ONLY from instruments with a real
 * stored price. Tiles are grouped by sector and coloured by the session change;
 * every tile also prints its glyph, sign and figure, so colour is never the
 * only cue (§12). Tiles are equal-sized: we do not have a sourced market cap
 * for every name, so we do not pretend to size by one.
 */
function fillFor(pct: number): string {
  const rounded = Number(pct.toFixed(2));
  if (rounded === 0) return "var(--surface-2)";
  const inten = Math.min(46, 10 + Math.abs(rounded) * 12);
  return `color-mix(in srgb, var(--${rounded > 0 ? "up" : "down"}) ${inten}%, var(--surface-2))`;
}

function label(pct: number): string {
  const rounded = Number(pct.toFixed(2));
  const glyph = rounded > 0 ? "▲" : rounded < 0 ? "▼" : "–";
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${glyph} ${sign}${Math.abs(rounded).toFixed(2)}%`;
}

export function SectorHeatmap({ rows }: { rows: MarketRow[] }) {
  const equities = rows.filter((r) => r.assetClass === "equity" && r.sector);
  if (equities.length === 0) {
    return (
      <NoData>
        No equity prices are available right now, so there is nothing to map. The
        heatmap fills in as soon as the market feed delivers prices.
      </NoData>
    );
  }
  const bySector = new Map<string, MarketRow[]>();
  for (const r of equities) {
    const key = r.sector as string;
    bySector.set(key, [...(bySector.get(key) ?? []), r]);
  }
  const groups = [...bySector.entries()]
    .map(([sector, members]) => ({
      sector,
      members: members.sort((a, b) => b.changePct - a.changePct),
      avg: members.reduce((n, m) => n + m.changePct, 0) / members.length,
    }))
    .sort((a, b) => b.members.length - a.members.length);

  const stamp = summaryStamp(equities.map((r) => r.priced));

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <section
            key={g.sector}
            aria-label={`${g.sector} sector`}
            className="border-hairline bg-surface rounded-[8px] border p-2"
          >
            <div className="flex items-baseline justify-between px-1 pb-2">
              <h3 className="t-micro text-ink-2">{g.sector}</h3>
              <span className="tnum text-ink-3 text-[11px]">avg {label(g.avg)}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {g.members.map((m) => (
                <Link
                  key={m.symbol}
                  href={`/quote/${m.symbol}`}
                  title={`${m.name} — ${label(m.changePct)}`}
                  className="text-ink flex min-h-[44px] flex-col justify-center rounded-[4px] px-2 py-1.5"
                  style={{ background: fillFor(m.changePct) }}
                >
                  <span className="tnum text-[12px] font-medium">{m.symbol}</span>
                  <span className="tnum text-[11px]">{label(m.changePct)}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="text-ink-3 mt-2 text-[11px]">
        Grouped by sector, coloured by change versus the prior close. Equal-sized tiles.
        {stamp ? ` ${stamp}.` : ""}
      </p>
    </div>
  );
}
