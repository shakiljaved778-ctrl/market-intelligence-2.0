import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FxRateRow } from "@/lib/db/queries/market";
import { __resetKvStoreForTests } from "@/lib/cache/store";
import { yearOnYear } from "@/lib/economy/read";
import { __resetQuoteMemo } from "@/lib/market/service";
import {
  FX_SOURCE,
  fxRowsFrom,
  readCommodityRows,
  readCryptoRows,
  readFxRows,
} from "./levels";

function rate(quote: string, date: string, r: number): FxRateRow {
  return { base: "USD", quote, date, rate: r, source: "ecb" };
}

describe("fxRowsFrom (stored ECB reference rates → display pairs)", () => {
  const rates = [
    rate("EUR", "2026-11-12", 0.92),
    rate("EUR", "2026-11-11", 0.925),
    rate("JPY", "2026-11-12", 153),
    rate("JPY", "2026-11-11", 152),
  ];

  it("inverts EUR to the conventional EUR/USD quote", () => {
    const eur = fxRowsFrom(rates).find((r) => r.symbol === "EURUSD");
    expect(eur?.value).toBeCloseTo(1 / 0.92, 6);
    // EUR strengthened (fewer euros per dollar) → EUR/USD rose.
    expect(eur?.changePct).toBeGreaterThan(0);
  });

  it("keeps USD/JPY as stored and computes the day change", () => {
    const jpy = fxRowsFrom(rates).find((r) => r.symbol === "USDJPY");
    expect(jpy?.value).toBe(153);
    expect(jpy?.changePct).toBeCloseTo(((153 - 152) / 152) * 100, 6);
  });

  it("stamps every row with the ECB source and the fixing date", () => {
    for (const r of fxRowsFrom(rates)) {
      expect(r.source).toBe(FX_SOURCE);
      expect(r.asOf).toBe("2026-11-12");
      expect(r.cadence).toBe("daily fixing");
      expect(r.demo).toBe(false);
    }
  });

  it("omits a pair with no stored rate and gives no change with one observation", () => {
    const rows = fxRowsFrom([rate("EUR", "2026-11-12", 0.92)]);
    expect(rows.map((r) => r.symbol)).toEqual(["EURUSD"]);
    expect(rows[0]?.changePct).toBeNull();
  });
});

describe("level rows — PRODUCTION (no demo mode, nothing stored)", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "");
    __resetKvStoreForTests();
    __resetQuoteMemo();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns no FX, commodity or crypto rows rather than sample values", async () => {
    expect(await readFxRows()).toEqual([]);
    expect(await readCommodityRows()).toEqual([]);
    expect(await readCryptoRows()).toEqual([]);
  });
});

describe("level rows — DEMO MODE", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "1");
    __resetKvStoreForTests();
    __resetQuoteMemo();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("flags every sample row as demo", async () => {
    const rows = [...(await readFxRows()), ...(await readCommodityRows())];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.demo)).toBe(true);
  });
});

describe("yearOnYear", () => {
  it("computes the percent change on the same month a year earlier", () => {
    const obs = [
      { date: "2025-10-01", value: 300 },
      { date: "2025-11-01", value: 302 },
      { date: "2026-10-01", value: 309 },
      { date: "2026-11-01", value: 310 },
    ];
    expect(yearOnYear(obs)).toEqual([
      { date: "2026-10-01", value: 3 },
      { date: "2026-11-01", value: 2.65 },
    ]);
  });
  it("emits nothing without a year-earlier observation", () => {
    expect(yearOnYear([{ date: "2026-11-01", value: 310 }])).toEqual([]);
  });
});
