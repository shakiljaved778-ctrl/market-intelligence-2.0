import Link from "next/link";
import { ChangePill } from "@/components/market/ChangePill";
import { compactStamp, stampText, type StampInput } from "@/lib/market/provenance";
import { readCommodityRows, readCryptoRows, readFxRows } from "@/lib/market/levels";
import { readGccIndices } from "@/lib/market/indices";
import { readUniverse } from "@/lib/market/read";

/**
 * Market tape — a smooth CSS marquee of the instruments Mizaan holds a REAL
 * value for: GCC index closes (when a licensed feed supplies them), FX
 * reference rates, energy benchmarks, the largest crypto assets and a handful
 * of US mega-caps. Each item prints its own source and time. With nothing
 * stored the tape does not render at all — it never shows a placeholder level.
 *
 * Pauses on hover/focus; under prefers-reduced-motion it becomes a static
 * scrollable rail (handled in CSS). The track renders the items twice for a
 * seamless loop; the second copy is aria-hidden.
 */
interface TapeItem {
  key: string;
  name: string;
  value: string;
  changePct: number | null;
  stamp: StampInput;
}

const TAPE_EQUITIES = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA"];

function num(v: number, dp: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

async function tapeItems(): Promise<TapeItem[]> {
  const [gcc, fx, commodities, crypto, universe] = await Promise.all([
    readGccIndices(),
    readFxRows(),
    readCommodityRows(),
    readCryptoRows(3),
    readUniverse(),
  ]);
  const items: TapeItem[] = [];
  for (const i of gcc) {
    items.push({
      key: i.symbol,
      name: i.name,
      value: num(i.level, 2),
      changePct: i.changePct,
      stamp: i.stamp,
    });
  }
  for (const r of commodities) {
    items.push({
      key: r.symbol,
      name: r.name,
      value: `$${num(r.value, 2)}`,
      changePct: r.changePct,
      stamp: { source: r.source, asOf: r.asOf, cadence: r.cadence, demo: r.demo },
    });
  }
  for (const r of fx.filter((f) => f.cadence !== "pegged")) {
    items.push({
      key: r.symbol,
      name: r.name.replace(/ /g, ""),
      value: num(r.value, r.value < 10 ? 4 : 2),
      changePct: r.changePct,
      stamp: { source: r.source, asOf: r.asOf, cadence: r.cadence, demo: r.demo },
    });
  }
  for (const r of crypto) {
    items.push({
      key: r.symbol,
      name: r.name,
      value: `$${num(r.value, r.value < 10 ? 4 : 2)}`,
      changePct: r.changePct,
      stamp: { source: r.source, asOf: r.asOf, demo: r.demo },
    });
  }
  for (const sym of TAPE_EQUITIES) {
    const row = universe.find((u) => u.symbol === sym);
    if (!row) continue;
    items.push({
      key: row.symbol,
      name: row.symbol,
      value: `$${num(row.priceUsd, 2)}`,
      changePct: row.changePct,
      stamp: row.priced,
    });
  }
  return items;
}

function Item({ item }: { item: TapeItem }) {
  return (
    <span
      className="border-hairline flex shrink-0 items-center gap-2.5 border-r px-4 py-2"
      title={stampText(item.stamp) ?? undefined}
    >
      <span className="text-ink-2 text-[11px] font-medium">{item.name}</span>
      <span className="tnum text-ink text-[12px]">{item.value}</span>
      <ChangePill pct={item.changePct} className="text-[11px]" />
      <span className="text-ink-4 text-[10px]">{compactStamp(item.stamp)}</span>
    </span>
  );
}

export async function TickerTape() {
  const items = await tapeItems();
  if (items.length === 0) return null;
  return (
    <div className="border-hairline bg-surface/80 border-b backdrop-blur">
      <div className="ticker-tape" aria-label="Market tape: latest stored prices">
        <div className="ticker-track">
          <Link href="/markets" className="flex">
            {items.map((item) => (
              <Item key={item.key} item={item} />
            ))}
          </Link>
          <span className="flex" aria-hidden data-ticker-dup>
            {items.map((item) => (
              <Item key={`dup-${item.key}`} item={item} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
