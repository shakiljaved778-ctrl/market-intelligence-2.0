import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetKvStoreForTests } from "@/lib/cache/store";
import { AlphaVantageProvider } from "./alphavantage";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body));
}

describe("AlphaVantageProvider", () => {
  const av = new AlphaVantageProvider();

  beforeEach(() => {
    __resetKvStoreForTests();
    delete process.env.ALPHAVANTAGE_API_KEY;
    vi.restoreAllMocks();
  });
  afterEach(() => {
    delete process.env.ALPHAVANTAGE_API_KEY;
  });

  it("is unconfigured and makes no call without a key (§2 zero-key)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(av.isConfigured()).toBe(false);
    expect(await av.quote("IBM")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalises a GLOBAL_QUOTE into a USD Quote", async () => {
    process.env.ALPHAVANTAGE_API_KEY = "k";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          "Global Quote": {
            "01. symbol": "IBM",
            "02. open": "100.0",
            "03. high": "105.0",
            "04. low": "99.0",
            "05. price": "104.5",
            "06. volume": "1000000",
            "08. previous close": "101.0",
            "09. change": "3.5",
            "10. change percent": "3.4653%",
          },
        }),
      ),
    );
    const q = await av.quote("ibm");
    expect(q).toMatchObject({
      symbol: "IBM",
      priceUsd: 104.5,
      nativeCurrency: "USD",
      fxRateUsed: 1,
      change: 3.5,
      changePct: 3.4653,
      prevClose: 101,
      provider: "alphavantage",
    });
  });

  it("returns null for an unknown symbol (empty Global Quote) so the registry fails over", async () => {
    process.env.ALPHAVANTAGE_API_KEY = "k";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ "Global Quote": {} })),
    );
    expect(await av.quote("NOPE")).toBeNull();
  });

  it("throws on a rate-limit note so the breaker trips", async () => {
    process.env.ALPHAVANTAGE_API_KEY = "k";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ Note: "call frequency is 25 requests per day" }),
      ),
    );
    await expect(av.quote("IBM")).rejects.toThrow(/rate limit/i);
  });

  it("maps TIME_SERIES_DAILY into ascending candles within the window", async () => {
    process.env.ALPHAVANTAGE_API_KEY = "k";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          "Time Series (Daily)": {
            "2026-09-16": {
              "1. open": "104.0",
              "2. high": "106.0",
              "3. low": "103.0",
              "4. close": "105.0",
              "5. volume": "1200000",
            },
            "2026-09-15": {
              "1. open": "101.0",
              "2. high": "104.0",
              "3. low": "100.0",
              "4. close": "103.0",
              "5. volume": "900000",
            },
          },
        }),
      ),
    );
    const candles = await av.candles("IBM", "1Y");
    expect(candles.map((c) => c.t)).toEqual(["2026-09-15", "2026-09-16"]);
    expect(candles[1]).toEqual({
      t: "2026-09-16",
      o: 104,
      h: 106,
      l: 103,
      c: 105,
      v: 1200000,
    });
  });

  it("skips intraday ranges (degrades to empty, no quota burn)", async () => {
    process.env.ALPHAVANTAGE_API_KEY = "k";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await av.candles("IBM", "1D")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
