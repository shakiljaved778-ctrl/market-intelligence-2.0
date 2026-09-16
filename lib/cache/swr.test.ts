import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetKvStoreForTests } from "./store";
import { swr } from "./swr";

describe("swr (stale-while-revalidate)", () => {
  beforeEach(() => __resetKvStoreForTests());

  it("serves from cache on the second call within the TTL", async () => {
    const fetcher = vi.fn(async () => ({ price: 42 }));

    const first = await swr("q:AAPL", 60, fetcher);
    const second = await swr("q:AAPL", 60, fetcher);

    expect(first.state).toBe("miss");
    expect(second.state).toBe("fresh");
    expect(second.value).toEqual({ price: 42 });
    // The vendor was hit once; the second read never called it. (§6 gate)
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("serves stale immediately and refreshes in the background once stale", async () => {
    vi.useFakeTimers();
    try {
      let n = 0;
      const fetcher = vi.fn(async () => ({ n: ++n }));

      const first = await swr("q:x", 1, fetcher);
      expect(first).toEqual({ value: { n: 1 }, state: "miss" });

      vi.advanceTimersByTime(2000); // now stale
      const stale = await swr("q:x", 1, fetcher);
      expect(stale.state).toBe("stale");
      expect(stale.value).toEqual({ n: 1 }); // stale value served instantly

      // Let the background refresh settle.
      await vi.runAllTimersAsync();
      const refreshed = await swr("q:x", 1, fetcher);
      expect(refreshed.value).toEqual({ n: 2 });
    } finally {
      vi.useRealTimers();
    }
  });
});
