import { describe, expect, it, vi } from "vitest";
import { cacheGet, cachePut } from "@/lib/cache/swr";
import type { ProviderRegistry } from "@/lib/providers";
import { refreshCandles } from "./candles";

vi.mock("@/lib/db/queries/candles", () => ({
  persistDailyCandles: vi.fn(async () => 0),
}));

const bar = { t: "2026-11-19T00:00:00.000Z", o: 1, h: 2, l: 0.5, c: 1.5, v: 10 };

function registry(result: { candles: (typeof bar)[]; provider: string } | null) {
  return {
    candlesWithSource: vi.fn(async () => result),
  } as unknown as ProviderRegistry;
}

describe("refreshCandles (EOD job)", () => {
  it("fetches from the provider even when an older (empty) series is cached", async () => {
    await cachePut("market:candles:TST1:5Y", 3600, { candles: [], provider: "" });
    const out = await refreshCandles(
      "tst1",
      "5Y",
      registry({ candles: [bar], provider: "fmp" }),
    );
    expect(out).toEqual([bar]);
    expect(await cacheGet("market:candles:TST1:5Y")).toEqual({
      candles: [bar],
      provider: "fmp",
    });
  });

  it("an empty fetch keeps the good cached series", async () => {
    await cachePut("market:candles:TST2:1M", 3600, { candles: [bar], provider: "fmp" });
    const out = await refreshCandles("TST2", "1M", registry(null));
    expect(out).toEqual([bar]);
    expect(await cacheGet("market:candles:TST2:1M")).toEqual({
      candles: [bar],
      provider: "fmp",
    });
  });
});
