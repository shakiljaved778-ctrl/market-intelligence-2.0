import { afterEach, describe, expect, it, vi } from "vitest";
import { CoinGeckoProvider } from "./coingecko";

afterEach(() => vi.unstubAllGlobals());

describe("CoinGecko batch (2026-11-28: the last coins never got a price)", () => {
  it("prices every coin from one request", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        bitcoin: { usd: 90000, usd_24h_change: 1 },
        arbitrum: { usd: 0.5, usd_24h_change: -2 },
        aptos: { usd: 6, usd_24h_change: 0 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const p = new CoinGeckoProvider();
    const [btc, arb, apt] = await Promise.all([
      p.quote("BTC"),
      p.quote("ARB"),
      p.quote("APT"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(btc?.priceUsd).toBe(90000);
    expect(arb?.changePct).toBe(-2);
    expect(apt?.provider).toBe("coingecko");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("arbitrum");
  });

  it("returns null for a symbol it does not know, so the registry fails over", async () => {
    expect(await new CoinGeckoProvider().quote("AAPL")).toBeNull();
  });
});
