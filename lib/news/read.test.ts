import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Live-mode wire contract (lib/news/read.ts, loadAll):
 *   - Real ingested news (the clusters the ingest/cluster jobs persist to
 *     Postgres) LEADS — ranked by importance, never buried beneath fixtures.
 *   - The evergreen Eureka explainers are still merged in (they're our own
 *     authored content, never ingested, so the Eureka section would otherwise
 *     be empty) — but un-shifted, so they age against the real clock and fall to
 *     their natural low rank instead of masquerading as today's news.
 *   - The authored DEMO stories (non-Eureka fixtures) are dropped in live mode.
 * With no DB the full, date-shifted fixture wire renders on its own (§2).
 */
describe("wire read — live mode: real news leads, demo fixtures dropped, Eureka kept", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/db/client");
    vi.doUnmock("@/lib/db/queries/wire");
  });

  it("leads with real DB news, keeps Eureka, and drops the demo fixtures", async () => {
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
          // A recent, well-sourced live story — it must LEAD the wire.
          importanceScore: 99,
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

    const all = await readWire();
    // The live DB story is served AND leads — real news first, not a fixture.
    expect(all.some((c) => c.slug === "live-markets-story")).toBe(true);
    expect(all[0]!.slug).toBe("live-markets-story");

    // The Eureka explainers (never in the DB) are still merged in...
    const eureka = await readWire({ section: "eureka" });
    expect(eureka.length).toBeGreaterThan(0);
    expect(eureka.some((c) => /nash/i.test(c.title))).toBe(true);

    // ...but the authored DEMO stories (non-Eureka fixtures) are dropped, so
    // ingested news isn't buried. The Fed/OPEC demo clusters must be gone.
    expect(all.some((c) => /opec/i.test(c.title))).toBe(false);
    expect(all.some((c) => /federal reserve|fomc/i.test(c.title))).toBe(false);

    // The only markets-section story is the live one (demo markets fixtures gone).
    const markets = await readWire({ section: "markets" });
    expect(markets.every((c) => c.slug === "live-markets-story")).toBe(true);
  });
});
