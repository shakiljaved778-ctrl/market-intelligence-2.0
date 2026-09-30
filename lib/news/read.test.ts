import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: our curated fixture wire (the Eureka Nobel explainers AND the
 * wider editorial stories) is our own authored content, never ingested into
 * Postgres. When the live DB wire is served it must still be merged in from
 * fixtures — otherwise added stories vanish the moment POSTGRES_URL is set (the
 * bug this covers). See lib/news/read.ts (loadAll merges both, deduped by slug).
 */
describe("wire read — curated fixture merge into the live DB wire", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/db/client");
    vi.doUnmock("@/lib/db/queries/wire");
  });

  it("merges the curated fixture wire into the live DB wire", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/client", () => ({
      isDbConfigured: () => true,
      getDb: () => null,
    }));
    vi.doMock("@/lib/db/queries/wire", () => ({
      dbReadWire: async () => [
        {
          slug: "live-markets-story",
          title: "Stocks rally as rate-cut bets build",
          tickers: ["AAPL"],
          topics: ["earnings"],
          entities: [],
          sourceIds: ["reuters"],
          sourceCount: 3,
          eventTime: "2026-09-26T12:00:00.000Z",
          importanceScore: 0.95,
          articleIds: [9001],
          primaryId: 9001,
          primaryDek: "Equities climbed as traders priced in easier policy.",
          brief: null,
          imageUrl: null,
          imageCredit: null,
          members: [
            {
              headline: "Stocks rally as rate-cut bets build",
              sourceName: "Reuters",
              url: "https://example.com/live",
              publishedAt: "2026-09-26T12:00:00.000Z",
              dek: "Equities climbed.",
            },
          ],
        },
      ],
    }));

    const { readWire } = await import("./read");

    // The live DB wire story is served...
    const all = await readWire();
    expect(all.some((c) => c.slug === "live-markets-story")).toBe(true);
    // ...alongside the curated fixture wire (many more stories than the 1 in DB).
    expect(all.length).toBeGreaterThan(1);

    // The Eureka explainers (never in the DB) are merged in...
    const eureka = await readWire({ section: "eureka" });
    expect(eureka.length).toBeGreaterThan(0);
    expect(eureka.some((c) => /nash/i.test(c.title))).toBe(true);

    // ...and so are the wider curated markets stories (not just Eureka).
    const markets = await readWire({ section: "markets" });
    expect(markets.length).toBeGreaterThan(1);
  });
});
