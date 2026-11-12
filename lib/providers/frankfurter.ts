import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";

/**
 * Frankfurter FX reference rates (§6) — ECB-based, open, no key. Used at
 * ingestion to convert native-currency prices to USD (§7). The rate used is
 * stored alongside the value; historical values are never re-derived with
 * today's rate.
 *
 * ONLY place FX fetch may target the vendor.
 */
const BASE_URL = "https://api.frankfurter.dev/v1";

const FrankfurterResponse = z.object({
  base: z.string(),
  date: z.string(),
  rates: z.record(z.string(), z.number()),
});

/**
 * USD per 1 unit of `native`. Returns 1 for USD. Returns null if the rate is
 * unavailable, so callers degrade gracefully (§2).
 */
export async function usdPerUnit(native: string): Promise<number | null> {
  const cur = native.toUpperCase();
  if (cur === "USD") return 1;

  const key = `fx:usd-per:${cur}`;
  try {
    const { value } = await swr(key, TTL.fxPair, async () => {
      // Ask for USD priced in `cur`, then invert: 1 native = (1/rate) USD.
      const res = await fetch(`${BASE_URL}/latest?base=${cur}&symbols=USD`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
      const parsed = FrankfurterResponse.parse(await res.json());
      const rate = parsed.rates.USD;
      if (typeof rate !== "number" || rate <= 0) {
        throw new Error(`Frankfurter: no USD rate for ${cur}`);
      }
      return rate;
    });
    return value;
  } catch {
    return null;
  }
}

const SeriesResponse = z.object({
  base: z.string(),
  rates: z.record(z.string(), z.record(z.string(), z.number())),
});

export interface ReferenceRate {
  base: string;
  quote: string;
  date: string; // YYYY-MM-DD (the ECB publication date)
  rate: number; // units of `quote` per 1 `base`
}

/**
 * Daily ECB reference rates for `base` against `symbols`, for the last `days`
 * calendar days. These are once-a-day reference fixings (published around
 * 16:00 CET on TARGET business days) — NOT a live FX feed — and are labelled as
 * such wherever they are shown. Returns [] if unavailable.
 */
export async function referenceRates(
  base: string,
  symbols: string[],
  days = 14,
): Promise<ReferenceRate[]> {
  const b = base.toUpperCase();
  const syms = symbols.map((s) => s.toUpperCase()).filter((s) => s !== b);
  if (syms.length === 0) return [];
  const start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const key = `fx:ref:${b}:${syms.join(",")}:${days}`;
  try {
    const { value } = await swr(key, TTL.fxReference, async () => {
      const res = await fetch(
        `${BASE_URL}/${start}..?base=${b}&symbols=${syms.join(",")}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
      const parsed = SeriesResponse.parse(await res.json());
      const out: ReferenceRate[] = [];
      for (const [date, rates] of Object.entries(parsed.rates)) {
        for (const [quote, rate] of Object.entries(rates)) {
          if (Number.isFinite(rate) && rate > 0)
            out.push({ base: b, quote, date, rate });
        }
      }
      return out;
    });
    return value;
  } catch {
    return [];
  }
}
