import { INDEX_TRACKERS } from "@/content/index-board";
import { readSeries } from "@/lib/economy/read";
import { readCommodityRows, readCryptoRows, readFxRows } from "@/lib/market/levels";
import { getQuotes } from "@/lib/market/service";
import type { StampInput } from "@/lib/market/provenance";
import type { DisplayCurrency } from "@/lib/currency/peg";
import { formatMoney } from "@/lib/format/currency";

/**
 * Cards for the index board (components/market/IndexBoard.tsx): US index
 * trackers, the 10-year Treasury yield, oil, Bitcoin and EUR/USD. Every card
 * is a REAL stored value with its source and time; anything not stored is
 * simply left out — never a placeholder (§2). Under DEMO_MODE only, demo rows
 * appear stamped "Demo data".
 */
export interface BoardCard {
  key: string;
  label: string;
  /** Qualifier under the label, e.g. "via SPY ETF". */
  via: string | null;
  value: string;
  changePct: number | null;
  stamp: StampInput;
  href: string | null;
}

function num(v: number, dp: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** PURE: percent change between the last two observations, or null. */
export function lastChangePct(obs: { value: number }[]): number | null {
  const last = obs.at(-1)?.value;
  const prev = obs.at(-2)?.value;
  if (last === undefined || prev === undefined || prev === 0) return null;
  return ((last - prev) / prev) * 100;
}

/**
 * Prices follow the reader's USD/QAR choice (§7); yields, percentages and the
 * EUR/USD rate are currency-neutral and are never converted.
 */
export async function readIndexBoard(
  currency: DisplayCurrency = "USD",
): Promise<BoardCard[]> {
  const [quotes, tenYear, commodities, crypto, fx] = await Promise.all([
    getQuotes(INDEX_TRACKERS.map((t) => t.symbol)),
    readSeries("FRED:DGS10").catch(() => null),
    readCommodityRows().catch(() => []),
    readCryptoRows(1).catch(() => []),
    readFxRows().catch(() => []),
  ]);
  const cards: BoardCard[] = [];

  for (const t of INDEX_TRACKERS) {
    const p = quotes.get(t.symbol);
    if (!p?.value) continue;
    cards.push({
      key: t.symbol,
      label: t.label,
      via: t.via ?? `via ${t.symbol} ETF`,
      value: formatMoney(p.value.priceUsd, currency),
      changePct: p.value.changePct,
      stamp: p,
      href: null,
    });
  }

  if (tenYear && tenYear.observations.length > 0) {
    const last = tenYear.observations.at(-1)!;
    cards.push({
      key: "US10Y",
      label: "US 10-yr yield",
      via: null,
      value: `${num(last.value, 2)}%`,
      // A yield's move is shown as its relative change, like every other card.
      changePct: lastChangePct(tenYear.observations),
      stamp: {
        source: tenYear.source,
        asOf: last.date,
        cadence: "daily",
        demo: tenYear.demo,
      },
      href: "/economy",
    });
  }

  for (const r of commodities) {
    if (!/brent|wti/i.test(`${r.symbol} ${r.name}`)) continue;
    cards.push({
      key: r.symbol,
      label: /brent/i.test(`${r.symbol} ${r.name}`) ? "Brent crude" : "WTI crude",
      via: null,
      value: formatMoney(r.value, currency),
      changePct: r.changePct,
      stamp: { source: r.source, asOf: r.asOf, cadence: r.cadence, demo: r.demo },
      href: "/markets",
    });
  }

  for (const r of crypto) {
    cards.push({
      key: r.symbol,
      label: r.name,
      via: null,
      value: formatMoney(r.value, currency, {
        maximumFractionDigits: r.value < 10 ? 4 : 2,
      }),
      changePct: r.changePct,
      stamp: { source: r.source, asOf: r.asOf, demo: r.demo },
      href: `/quote/${r.symbol}`,
    });
  }

  const eurusd = fx.find((r) => r.symbol === "EURUSD");
  if (eurusd) {
    cards.push({
      key: eurusd.symbol,
      label: "EUR/USD",
      via: null,
      value: num(eurusd.value, 4),
      changePct: eurusd.changePct,
      stamp: {
        source: eurusd.source,
        asOf: eurusd.asOf,
        cadence: eurusd.cadence,
        demo: eurusd.demo,
      },
      href: "/markets",
    });
  }
  return cards;
}
