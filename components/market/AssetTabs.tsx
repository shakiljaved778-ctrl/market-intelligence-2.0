"use client";

import { useState } from "react";
import Link from "next/link";
import { ChangePill } from "@/components/market/ChangePill";
import { stampText } from "@/lib/market/provenance";
import type { LevelRow } from "@/lib/market/levels";

function fmt(p: number): string {
  const d = Math.abs(p) < 10 ? 4 : 2;
  return p.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function Row({ r }: { r: LevelRow }) {
  const stamp = stampText(
    { source: r.source, asOf: r.asOf, cadence: r.cadence, demo: r.demo },
    // A peg is reviewed rarely — show the year so "1 Jan" is not ambiguous.
    r.cadence === "pegged",
  );
  const name = (
    <span className="min-w-0">
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="tnum text-ink text-[13px] font-medium">{r.symbol}</span>
        <span className="text-ink-3 text-[12px]">{r.name}</span>
        {r.note ? <span className="t-micro text-ink-4">{r.note}</span> : null}
      </span>
      {stamp ? (
        <span className="text-ink-3 mt-0.5 block text-[11px]">{stamp}</span>
      ) : null}
    </span>
  );
  return (
    <li className="border-hairline flex items-center justify-between gap-3 border-b py-2.5 last:border-0">
      {r.href ? (
        <Link href={r.href} className="hover:text-brand min-w-0">
          {name}
        </Link>
      ) : (
        name
      )}
      <span className="flex shrink-0 items-center gap-3">
        <span className="tnum text-ink text-right text-[13px]">
          {fmt(r.value)}
          {r.unit ? (
            <span className="text-ink-4 ml-1 text-[11px]">{r.unit}</span>
          ) : null}
        </span>
        <ChangePill pct={r.changePct} className="w-[68px] justify-end text-[12px]" />
      </span>
    </li>
  );
}

type TabId = "fx" | "commodities" | "crypto";

const EMPTY: Record<TabId, string> = {
  fx: "No FX reference rates are available right now.",
  commodities:
    "No commodity prices are available right now. Energy benchmarks appear here once the daily data feed delivers them.",
  crypto: "No crypto prices are available right now.",
};

/**
 * FX · Commodities · Crypto. All three panels are rendered in the HTML (the
 * inactive ones are `hidden`), so the content exists without JavaScript and for
 * crawlers; the buttons only switch which panel is visible. Each row prints its
 * source and time. A class with no real data shows a plain empty state.
 */
export function AssetTabs({
  fx,
  commodities,
  crypto,
}: {
  fx: LevelRow[];
  commodities: LevelRow[];
  crypto: LevelRow[];
}) {
  const tabs: { id: TabId; label: string; rows: LevelRow[] }[] = [
    { id: "fx", label: "FX", rows: fx },
    { id: "commodities", label: "Commodities", rows: commodities },
    { id: "crypto", label: "Crypto", rows: crypto },
  ];
  // Open on the first tab that has data, so the block is never blank on arrival.
  const first = tabs.find((t) => t.rows.length > 0)?.id ?? "fx";
  const [active, setActive] = useState<TabId>(first);

  return (
    <div className="border-hairline bg-surface rounded-[8px] border">
      <div
        role="tablist"
        aria-label="Asset classes"
        className="border-hairline flex gap-1 border-b p-1"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`asset-tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`asset-panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={`min-h-[44px] rounded-[5px] px-3 py-1.5 text-[13px] transition-colors ${
              active === t.id ? "bg-brand-soft text-brand" : "text-ink-3 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`asset-panel-${t.id}`}
          aria-labelledby={`asset-tab-${t.id}`}
          hidden={active !== t.id}
        >
          {t.rows.length > 0 ? (
            <ul className="px-4">
              {t.rows.map((r) => (
                <Row key={r.symbol} r={r} />
              ))}
            </ul>
          ) : (
            <p className="text-ink-3 px-4 py-8 text-center text-[13px]">
              {EMPTY[t.id]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
