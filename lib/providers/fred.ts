import { z } from "zod";
import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";

/**
 * FRED (St. Louis Fed) — US macro series (§6). Free key, no hard limit. Macro
 * is a distinct concern from instrument quotes, so it lives outside the
 * MarketDataProvider registry. The ONLY place FRED fetch may target the vendor.
 */
const BASE_URL = "https://api.stlouisfed.org/fred";

export interface MacroObservation {
  date: string;
  value: number | null;
}

const ObservationsResponse = z.object({
  observations: z.array(
    z.object({
      date: z.string(),
      value: z.string(),
    }),
  ),
});

export function isFredConfigured(): boolean {
  return Boolean(process.env.FRED_API_KEY);
}

/** Observations for a FRED series (e.g. CPIAUCSL). Empty array if unavailable. */
export async function fredSeries(seriesId: string): Promise<MacroObservation[]> {
  if (!isFredConfigured()) return [];
  const key = process.env.FRED_API_KEY as string;
  try {
    const { value } = await swr(
      `fred:series:${seriesId}`,
      TTL.macroSeries,
      async () => {
        const url = `${BASE_URL}/series/observations?series_id=${encodeURIComponent(
          seriesId,
        )}&api_key=${key}&file_type=json`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`FRED ${res.status}`);
        const parsed = ObservationsResponse.parse(await res.json());
        return parsed.observations.map(
          (o): MacroObservation => ({
            date: o.date,
            value: o.value === "." ? null : Number(o.value),
          }),
        );
      },
    );
    return value;
  } catch {
    return [];
  }
}
