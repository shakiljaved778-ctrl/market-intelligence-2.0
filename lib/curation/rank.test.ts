import { describe, expect, it } from "vitest";
import type { ClusterResult } from "./cluster";
import { computeImportance, type RankContext } from "./rank";

function cluster(over: Partial<ClusterResult>): ClusterResult {
  return {
    articleIds: [1],
    primaryId: 1,
    title: "t",
    tickers: [],
    entities: [],
    topics: [],
    sourceIds: ["outlet-a"],
    sourceCount: 1,
    eventTime: "2026-09-16T20:00:00.000Z",
    ...over,
  };
}

const now = new Date("2026-09-16T20:00:00.000Z");

describe("computeImportance (§9 Stage 4)", () => {
  const ctx: RankContext = {
    tiers: { "outlet-a": "outlet", "outlet-b": "outlet", "fed-press": "primary" },
    tickerMovePct: { AAPL: 4 },
    now,
  };

  it("rises with the count of distinct sources", () => {
    const one = computeImportance(
      cluster({ sourceIds: ["outlet-a"], sourceCount: 1 }),
      ctx,
    );
    const three = computeImportance(
      cluster({ sourceIds: ["outlet-a", "outlet-b", "fed-press"], sourceCount: 3 }),
      ctx,
    );
    expect(three).toBeGreaterThan(one);
  });

  it("rewards presence of a primary/regulator source", () => {
    const outletOnly = computeImportance(cluster({ sourceIds: ["outlet-a"] }), ctx);
    const withPrimary = computeImportance(cluster({ sourceIds: ["fed-press"] }), ctx);
    expect(withPrimary).toBeGreaterThan(outletOnly);
  });

  it("decays with age but never to zero for covered news", () => {
    const fresh = computeImportance(cluster({ sourceCount: 3 }), ctx);
    const old = computeImportance(
      cluster({ sourceCount: 3, eventTime: "2026-09-14T20:00:00.000Z" }),
      ctx,
    );
    expect(old).toBeLessThan(fresh);
    expect(old).toBeGreaterThan(0);
  });
});
