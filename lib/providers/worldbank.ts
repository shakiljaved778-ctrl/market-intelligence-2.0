import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import type { MacroObservation } from "./fred";

/**
 * World Bank — cross-country macro incl. GCC GDP/inflation (§6). Open, no key.
 * The ONLY place World Bank fetch may target the vendor.
 */
const BASE_URL = "https://api.worldbank.org/v2";

const Response = z.tuple([
  z.object({ total: z.number() }).passthrough(),
  z.array(z.object({ date: z.string(), value: z.number().nullable() })).nullable(),
]);

/** Observations for a country + indicator (e.g. QAT, NY.GDP.MKTP.CD). */
export async function worldBankSeries(
  country: string,
  indicator: string,
): Promise<MacroObservation[]> {
  try {
    const { value } = await swr(
      `wb:${country}:${indicator}`,
      TTL.macroSeries,
      async () => {
        const url = `${BASE_URL}/country/${country}/indicator/${indicator}?format=json&per_page=60`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`World Bank ${res.status}`);
        const [, rows] = Response.parse(await res.json());
        return (rows ?? [])
          .filter((r) => r.value !== null)
          .map((r): MacroObservation => ({ date: r.date, value: r.value }))
          .reverse();
      },
    );
    return value;
  } catch {
    return [];
  }
}
