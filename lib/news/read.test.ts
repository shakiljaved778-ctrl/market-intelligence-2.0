import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: evergreen editorial sections (e.g. Eureka's Nobel explainers) are
 * our own authored content and are never ingested into Postgres. When the live
 * DB wire is served they must still be merged in from fixtures — otherwise the
 * section shows "0 stories" the moment POSTGRES_URL is configured (the bug this
 * covers). See lib/news/read.ts + the `evergreen` flag in content/sections.yaml.
 */
describe("wire read — evergreen editorial merge", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/db/client");
    vi.doUnmock("@/lib/db/queries/wire");
  });

  it("merges evergreen sections into the live DB wire", async () => {
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

    // The live wire story is served...
    const all = await readWire();
    expect(all.some((c) => c.slug === "live-markets-story")).toBe(true);

    // ...and the evergreen Eureka pieces (never in the DB) are merged in.
    const eureka = await readWire({ section: "eureka" });
    expect(eureka.length).toBeGreaterThan(0);
    expect(eureka.some((c) => /nash/i.test(c.title))).toBe(true);
  });
});
