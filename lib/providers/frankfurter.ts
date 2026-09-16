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
