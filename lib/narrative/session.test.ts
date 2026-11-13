import { describe, expect, it } from "vitest";
import type { Instrument } from "@/content/instruments";
import type { Quote } from "@/lib/providers/types";
import { buildSessionClose, isClosingQuote, nyDate, type SessionRow } from "./session";

const SESSION = "2026-11-11"; // a Wednesday
// 21:00Z in November = 16:00 New York: the cash close.
const CLOSE = "2026-11-11T21:00:00.000Z";

function inst(
  symbol: string,
  sector: string,
  over: Partial<Instrument> = {},
): Instrument {
  return {
    symbol,
    name: `${symbol} Corp`,
    exchange: "NYSE",
    assetClass: "equity",
    nativeCurrency: "USD",
    sector,
    country: "US",
    ...over,
  };
}

function q(symbol: string, changePct: number, over: Partial<Quote> = {}): Quote {
  return {
    symbol,
    priceUsd: 100,
    nativePrice: null,
    nativeCurrency: "USD",
    fxRateUsed: 1,
    change: changePct,
    changePct,
    open: null,
    high: null,
    low: null,
    prevClose: 100,
    volume: null,
    marketCapUsd: null,
    provider: "finnhub",
    dataDelayMinutes: 0,
    asOf: CLOSE,
    ...over,
  };
}

function rows(moves: number[], sector = "Technology"): SessionRow[] {
  return moves.map((m, i) => ({
    instrument: inst(`T${i}`, sector),
    quote: q(`T${i}`, m),
  }));
}

describe("isClosingQuote", () => {
  it("accepts a quote struck at the New York close on the session date", () => {
    expect(isClosingQuote(q("A", 1), SESSION)).toBe(true);
  });
  it("rejects a mid-session quote and a quote from another day", () => {
    expect(
      isClosingQuote(q("A", 1, { asOf: "2026-11-11T16:00:00.000Z" }), SESSION),
    ).toBe(false);
    expect(
      isClosingQuote(q("A", 1, { asOf: "2026-11-10T21:00:00.000Z" }), SESSION),
    ).toBe(false);
  });
  it("derives the New York calendar date", () => {
    // 02:00Z on the 12th is still the 11th in New York.
    expect(nyDate("2026-11-12T02:00:00.000Z")).toBe("2026-11-11");
  });
});

describe("buildSessionClose", () => {
  it("builds a recap from real closing quotes, naming its universe", () => {
    const r = buildSessionClose(rows([2, 1, -1, 3, -0.5]), SESSION);
    expect(r).not.toBeNull();
    expect(r?.slug).toBe("session-close-2026-11-11");
    expect(r?.coverage).toEqual({ priced: 5, tracked: 5 });
    expect(r?.sources).toEqual(["finnhub"]);
    // Breadth is stated for the tracked universe — never as a whole-market count.
    expect(r?.output.bodyMd).toContain("Among the 5 US large caps Mizaan tracks");
    expect(r?.output.bodyMd).toContain("3 names rose and 2 fell");
    // The largest absolute move is the standout.
    expect(r?.output.bodyMd).toContain("T3 Corp was the standout");
  });

  it("publishes NOTHING when closing-price coverage is below 80%", () => {
    const all = rows([1, 1, 1, 1, 1]);
    // Only 3 of 5 have a closing quote; the other two are stale mid-session.
    for (const r of all.slice(3)) r.quote.asOf = "2026-11-11T16:00:00.000Z";
    expect(buildSessionClose(all, SESSION)).toBeNull();
  });

  it("publishes nothing with no tracked US equities at all", () => {
    expect(buildSessionClose([], SESSION)).toBeNull();
    const crypto: SessionRow[] = [
      {
        instrument: inst("BTC", "Crypto", { assetClass: "crypto", exchange: "CRYPTO" }),
        quote: q("BTC", 2),
      },
    ];
    expect(buildSessionClose(crypto, SESSION)).toBeNull();
  });

  it("ignores fixture quotes entirely", () => {
    const all = rows([1, 1, 1, 1, 1]);
    for (const r of all) r.quote.provider = "fixture";
    expect(buildSessionClose(all, SESSION)).toBeNull();
  });

  it("names the weakest sector by average, only with enough members", () => {
    const tech = rows([1, 2, 1], "Technology");
    const energy = rows([-2, -3, -1], "Energy").map((r, i) => ({
      instrument: { ...r.instrument, symbol: `E${i}`, name: `E${i} Corp` },
      quote: { ...r.quote, symbol: `E${i}` },
    }));
    // One very weak name in a sector with a single member must NOT be named.
    const lone: SessionRow = {
      instrument: inst("L0", "Utilities"),
      quote: q("L0", -9),
    };
    const r = buildSessionClose([...tech, ...energy, lone], SESSION);
    expect(r?.output.bodyMd).toContain("Energy was the weakest of the sectors tracked");
    expect(r?.output.bodyMd).not.toContain("Utilities");
  });

  it("is reproducible from its inputs", () => {
    const a = buildSessionClose(rows([2, 1, -1, 3, -0.5]), SESSION);
    const b = buildSessionClose(rows([2, 1, -1, 3, -0.5]), SESSION);
    expect(a?.output.bodyMd).toBe(b?.output.bodyMd);
  });
});
