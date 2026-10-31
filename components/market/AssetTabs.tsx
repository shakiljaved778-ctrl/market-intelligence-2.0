"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkline, sparkSeries } from "@/components/ui/Sparkline";
import type { MarketQuoteRow } from "@/fixtures/markets-extra";

function fmt(p: number): string {
  const d = Math.abs(p) < 5 ? 4 : 2;
  return p.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function Row({ r, link }: { r: MarketQuoteRow; link?: boolean }) {
  const sd = r.changePct > 0 ? "up" : r.changePct < 0 ? "down" : "flat";
  const color = sd === "up" ? "text-up" : sd === "down" ? "text-down" : "text-ink-3";
  const glyph = sd === "up" ? "▲" : sd === "down" ? "▼" : "–";
  const sign = r.changePct > 0 ? "+" : r.changePct < 0 ? "−" : "";

  const name = (
    <span className="min-w-0">
      <span className="tnum text-ink text-[13px] font-medium">{r.symbol}</span>
      <span className="text-ink-3 ml-2 text-[12px]">{r.name}</span>
      {r.note ? <span className="t-micro text-ink-4 ml-2">{r.note}</span> : null}
    </span>
  );

  return (
    <li className="border-hairline flex items-center justify-between gap-3 border-b py-2.5 last:border-0">
      {link ? (
        <Link href={`/quote/${r.symbol}`} className="hover:text-brand min-w-0">
          {name}
        </Link>
      ) : (
        name
      )}
      <span className="flex items-center gap-3">
        <Sparkline
          values={sparkSeries(r.symbol, r.changePct)}
          dir={sd}
          width={48}
          height={16}
        />
        <span className="tnum text-ink text-[13px]">
          {fmt(r.price)}
          {r.unit ? <span className="text-ink-4">{r.unit}</span> : null}
        </span>
        <span className={`tnum w-[68px] text-right text-[12px] ${color}`}>
          <span aria-hidden>{glyph}</span> {sign}
          {Math.abs(r.changePct).toFixed(2)}%
        </span>
      </span>
    </li>
  );
}

type TabId = "fx" | "commodities" | "crypto";

export function AssetTabs({
  fx,
  commodities,
  crypto,
}: {
  fx: MarketQuoteRow[];
  commodities: MarketQuoteRow[];
  crypto: MarketQuoteRow[];
}) {
  const tabs = [
    { id: "fx" as const, label: "FX", rows: fx, link: false },
    {
      id: "commodities" as const,
      label: "Commodities",
      rows: commodities,
      link: false,
    },
    { id: "crypto" as const, label: "Crypto", rows: crypto, link: true },
  ];
  const [active, setActive] = useState<TabId>("fx");
  const cur = tabs.find((t) => t.id === active)!;

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
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={`rounded-[5px] px-3 py-1.5 text-[13px] transition-colors ${
              active === t.id ? "bg-brand-soft text-brand" : "text-ink-3 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ul className="px-4">
        {cur.rows.map((r) => (
          <Row key={r.symbol} r={r} link={cur.link} />
        ))}
      </ul>
      <p className="text-ink-3 t-micro border-hairline border-t px-4 py-2">
        Illustrative sample · trends indicative · no live feed configured
      </p>
    </div>
  );
}
