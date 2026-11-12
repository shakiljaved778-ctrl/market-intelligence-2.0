import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetKvStoreForTests } from "@/lib/cache/store";
import { referenceRates } from "./frankfurter";

/**
 * The FX job depends on the shape of Frankfurter's time-series response. This
 * pins the parser to the documented shape and to its failure behaviour (an
 * unexpected body yields no rows — never a guessed rate).
 */
describe("referenceRates (ECB reference rates via Frankfurter)", () => {
  beforeEach(() => __resetKvStoreForTests());
  afterEach(() => vi.unstubAllGlobals());

  it("requests a USD-base series for the given currencies and flattens it", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        amount: 1,
        base: "USD",
        start_date: "2026-11-11",
        end_date: "2026-11-12",
        rates: {
          "2026-11-11": { EUR: 0.925, JPY: 152.1 },
          "2026-11-12": { EUR: 0.921, JPY: 152.7 },
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const rows = await referenceRates("USD", ["EUR", "JPY", "USD"], 14);

    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("https://api.frankfurter.dev/v1/");
    expect(url).toContain("..?base=USD&symbols=EUR,JPY");
    expect(rows).toHaveLength(4);
    expect(rows).toContainEqual({
      base: "USD",
      quote: "EUR",
      date: "2026-11-12",
      rate: 0.921,
    });
  });

  it("returns no rows when the provider errors or the body is not the expected shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    );
    expect(await referenceRates("USD", ["EUR"], 14)).toEqual([]);

    __resetKvStoreForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ unexpected: true }) })),
    );
    expect(await referenceRates("USD", ["EUR"], 14)).toEqual([]);
  });

  it("drops non-positive rates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          base: "USD",
          rates: { "2026-11-12": { EUR: 0, GBP: 0.79 } },
        }),
      })),
    );
    const rows = await referenceRates("USD", ["EUR", "GBP"], 14);
    expect(rows.map((r) => r.quote)).toEqual(["GBP"]);
  });
});
