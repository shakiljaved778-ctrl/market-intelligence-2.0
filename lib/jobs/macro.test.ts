import { afterEach, describe, expect, it, vi } from "vitest";

describe("macroTask time budget", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.doUnmock("@/lib/providers/fred");
    vi.doUnmock("@/lib/providers/worldbank");
    vi.doUnmock("@/lib/providers/frankfurter");
    vi.doUnmock("@/lib/db/queries/market");
  });

  it("stops starting new series once the budget is spent, and still stores FX", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T13:00:00Z"));
    const calls: string[] = [];
    // Each provider call "takes" 10 s (the per-request limit).
    const slow = (id: string) => async () => {
      calls.push(id);
      vi.setSystemTime(Date.now() + 10_000);
      return [{ date: "2026-01-01", value: 1 }];
    };
    vi.doMock("@/lib/providers/fred", () => ({
      fredSeries: (code: string) => slow(code)(),
    }));
    vi.doMock("@/lib/providers/worldbank", () => ({
      worldBankSeries: (_c: string, code: string) => slow(code)(),
    }));
    vi.doMock("@/lib/providers/frankfurter", () => ({
      referenceRates: async () => [{ date: "2026-11-13", quote: "EUR", rate: 0.9 }],
    }));
    const persistFxRates = vi.fn(async () => 1);
    vi.doMock("@/lib/db/queries/market", async (orig) => ({
      ...(await orig<typeof import("@/lib/db/queries/market")>()),
      persistSeries: async () => 1,
      persistFxRates,
    }));
    const { macroTask, MACRO_SERIES_BUDGET_MS } = await import("./tasks");
    const { SERIES } = await import("@/lib/economy/series");

    await macroTask();
    // 10 s per call: calls start at 0, 10, 20, 30 s; at 40 s the 35 s budget is spent.
    expect(calls.length).toBe(Math.floor(MACRO_SERIES_BUDGET_MS / 10_000) + 1);
    expect(calls.length).toBeLessThan(SERIES.length);
    expect(persistFxRates).toHaveBeenCalledOnce();
  });
});
