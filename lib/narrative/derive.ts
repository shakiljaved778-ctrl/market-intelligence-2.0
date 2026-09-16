import type { DisplayCurrency } from "@/lib/currency/peg";
import type { Candle, Quote } from "@/lib/providers/types";
import type { InstrumentRecapInput } from "./recap";

/**
 * Derive the instrument-recap inputs deterministically from a quote + its daily
 * candles (§9 Stage 5). All context (streak, extremum, reversal) is computed
 * from our own numbers, so the recap is reproducible from these inputs.
 */
export function deriveInstrumentRecap(
  name: string,
  currency: DisplayCurrency,
  quote: Quote,
  candles: Candle[],
): InstrumentRecapInput {
  const closes = candles.map((c) => c.c);
  const n = closes.length;

  // Consecutive same-direction sessions ending at the last bar.
  let streakLength = 0;
  let streakShape: "gain" | "loss" | null = null;
  if (n >= 2) {
    const lastDelta = (closes[n - 1] as number) - (closes[n - 2] as number);
    if (lastDelta !== 0) {
      streakShape = lastDelta > 0 ? "gain" : "loss";
      for (let i = n - 1; i >= 1; i -= 1) {
        const d = (closes[i] as number) - (closes[i - 1] as number);
        if ((streakShape === "gain" && d > 0) || (streakShape === "loss" && d < 0)) {
          streakLength += 1;
        } else break;
      }
    }
  }

  // Extremum: is the latest close a period low/high? "since" = the most recent
  // earlier bar that breached it.
  let extremum: InstrumentRecapInput["extremum"] = null;
  if (n >= 5) {
    const last = closes[n - 1] as number;
    const prior = closes.slice(0, n - 1);
    if (last <= Math.min(...prior)) {
      const j = findLastIndex(prior, (c) => c < last);
      extremum = { kind: "low", sinceDate: (candles[j >= 0 ? j : 0] as Candle).t };
    } else if (last >= Math.max(...prior)) {
      const j = findLastIndex(prior, (c) => c > last);
      extremum = { kind: "high", sinceDate: (candles[j >= 0 ? j : 0] as Candle).t };
    }
  }

  // Reversal: today's direction flipped the prior session's — and only worth
  // saying when BOTH moves were material (>0.25% of price), so noise doesn't
  // trigger a filler sentence.
  let reversed = false;
  if (n >= 3) {
    const last = closes[n - 1] as number;
    const d1 = last - (closes[n - 2] as number);
    const d0 = (closes[n - 2] as number) - (closes[n - 3] as number);
    const material = Math.abs(last) * 0.0025;
    reversed =
      Math.abs(d1) >= material &&
      Math.abs(d0) >= material &&
      Math.sign(d1) !== Math.sign(d0);
  }

  return {
    name,
    currency,
    priceUsd: quote.priceUsd,
    changePct: quote.changePct,
    streakLength,
    streakShape,
    extremum,
    reversed,
  };
}

function findLastIndex<T>(arr: T[], pred: (x: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    if (pred(arr[i] as T)) return i;
  }
  return -1;
}
