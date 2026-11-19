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
 *   - Stored tickers are re-derived at read time with the current matcher.
 * Without a database the wire is the authored Eureka content only — invented
 * demo news appears ONLY under DEMO_MODE=1.
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
      dbReadWireBySlug: async () => null,
      dbReadWire: async () => [
        {
          slug: "live-markets-story",
          title: "Stocks rally as rate-cut bets build",
          tickers: ["AAPL"],
          topics: ["earnings"],
          entities: [],
          sourceIds: ["reuters"],
          sourceCount: 3,
          // A recent, well-sourced live story — it must LEAD the wire. (The
          // stored score is ignored: importance is recomputed at read time.)
          eventTime: new Date(Date.now() - 3_600_000).toISOString(),
          importanceScore: 1,
          articleIds: [9001],
          primaryId: 9001,
          primarySourceId: "reuters",
          primaryDek: "Equities climbed as traders priced in easier policy.",
          brief: null,
          imageUrl: null,
          imageCredit: null,
          members: [
            {
              headline: "Stocks rally as rate-cut bets build",
              sourceName: "Reuters",
              url: "https://example.com/live",
              publishedAt: new Date(Date.now() - 3_600_000).toISOString(),
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
    expect(markets.some((c) => c.slug === "live-markets-story")).toBe(true);
  });
});

describe("wire read — production with no stored news", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("never falls back to invented demo news", async () => {
    vi.stubEnv("DEMO_MODE", "");
    vi.resetModules();
    const { readWire } = await import("./read");
    const all = await readWire();
    // Only Mizaan's own authored, cited Eureka explainers remain.
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((c) => c.section === "eureka")).toBe(true);
    expect(all.some((c) => /opec|federal reserve|fomc/i.test(c.title))).toBe(false);
  });

  it("serves the full sample wire only in demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "1");
    vi.resetModules();
    const { readWire } = await import("./read");
    const all = await readWire();
    expect(all.some((c) => c.section !== "eureka")).toBe(true);
  });
});

describe("wire read — stored tickers are re-derived", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/db/client");
    vi.doUnmock("@/lib/db/queries/wire");
  });

  it("drops false tickers written by the old matcher", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/client", () => ({
      isDbConfigured: () => true,
      getDb: () => null,
    }));
    vi.doMock("@/lib/db/queries/wire", () => ({
      dbReadWireBySlug: async () => null,
      dbReadWire: async () => [
        {
          slug: "nasa-escapade",
          title: "NASA's ESCAPADE Completes Powered Earth Flybys, Now En Route to Mars",
          // What the old case-insensitive symbol match stored.
          tickers: ["NOW", "DEC"],
          topics: [],
          entities: [],
          sourceIds: ["nasa-news"],
          sourceCount: 1,
          eventTime: new Date().toISOString(),
          importanceScore: 40,
          articleIds: [1],
          primaryId: 1,
          primarySourceId: "nasa-news",
          primaryDek:
            "NASA's two ESCAPADE spacecraft have each completed a powered Earth flyby and are now on their way to Mars.",
          brief: null,
          imageUrl: null,
          imageCredit: null,
          members: [
            {
              headline:
                "NASA's ESCAPADE Completes Powered Earth Flybys, Now En Route to Mars",
              sourceName: "NASA",
              url: "https://www.nasa.gov/example",
              publishedAt: new Date().toISOString(),
              dek: "NASA's two ESCAPADE spacecraft have each completed a powered Earth flyby and are now on their way to Mars.",
            },
          ],
        },
      ],
    }));
    const { readWire } = await import("./read");
    const story = (await readWire()).find((c) => c.slug === "nasa-escapade");
    expect(story).toBeDefined();
    expect(story?.tickers).toEqual([]);
    // With no false ticker forcing it into Markets, it files under Science.
    expect(story?.section).toBe("science");
  });
});

describe("wire read — editorial exclusions (content/exclusions.yaml)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/db/client");
    vi.doUnmock("@/lib/db/queries/wire");
  });

  const row = (
    slug: string,
    title: string,
    dek: string,
    brief: string | null = null,
  ) => ({
    slug,
    title,
    tickers: [],
    topics: [],
    entities: [],
    sourceIds: ["qna-economy-local"],
    sourceCount: 1,
    eventTime: new Date(Date.now() - 3_600_000).toISOString(),
    importanceScore: 1,
    articleIds: [1],
    primaryId: 1,
    primarySourceId: "qna-economy-local",
    primaryDek: dek,
    brief: brief ? { md: brief, model: "m#v4" } : null,
    imageUrl: null,
    imageCredit: null,
    members: [
      {
        headline: title,
        sourceName: "Qatar News Agency — Economy",
        url: `https://example.com/${slug}`,
        publishedAt: new Date(Date.now() - 3_600_000).toISOString(),
        dek,
      },
    ],
  });

  it("hides stored QCB and Qatar-politics stories from lists and pages", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/client", () => ({
      isDbConfigured: () => true,
      getDb: () => null,
    }));
    const rows = [
      row(
        "qcb-fee-guide",
        "QCB Issues the Guide on Bank Commission and Fee Ceilings",
        "Doha, November 18 (QNA) - The Qatar Central Bank issued a guide on bank fees.",
      ),
      row(
        "minister-meets-georgia",
        "Minister of Commerce and Industry Meets Georgia's Deputy Prime Minister",
        "Doha, November 18 (QNA) - The minister met the visiting delegation to discuss ties.",
      ),
      row(
        "qatar-gold-price",
        "Gold Price in Qatari Market Falls by 2.05% This Week",
        "Doha, November 18 (QNA) - The price of gold in the Qatari market fell this week.",
      ),
      row(
        "brief-mentions-qcb",
        "Qatar's real GDP improves in the third quarter",
        "Doha, November 18 (QNA) - Qatar's real gross domestic product rose in the quarter.",
        "## The details\nThe QCB is expected to follow.",
      ),
    ];
    vi.doMock("@/lib/db/queries/wire", () => ({
      dbReadWire: async () => rows,
      dbReadWireBySlug: async (slug: string) =>
        rows.find((r) => r.slug === slug) ?? null,
    }));
    const { readWire, readCluster } = await import("./read");
    const slugs = (await readWire()).map((c) => c.slug);
    expect(slugs).toContain("qatar-gold-price");
    expect(slugs).not.toContain("qcb-fee-guide");
    expect(slugs).not.toContain("minister-meets-georgia");
    // A story whose only problem is its AI article keeps its place, without it.
    expect(slugs).toContain("brief-mentions-qcb");
    expect((await readCluster("brief-mentions-qcb"))?.body).toBeNull();
    expect(await readCluster("qcb-fee-guide")).toBeNull();
    expect(await readCluster("minister-meets-georgia")).toBeNull();
    expect(await readCluster("qatar-gold-price")).not.toBeNull();
  });
});

describe("wire read — database unreachable", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.resetModules();
    vi.doUnmock("@/lib/db/client");
    vi.doUnmock("@/lib/db/queries/wire");
  });

  const liveRow = {
    slug: "live-markets-story",
    title: "Stocks rally as rate-cut bets build",
    tickers: [],
    topics: [],
    entities: [],
    sourceIds: ["sec-press"],
    sourceCount: 1,
    eventTime: new Date().toISOString(),
    importanceScore: 1,
    articleIds: [1],
    primaryId: 1,
    primarySourceId: "sec-press",
    primaryDek: "Equities climbed as traders priced in easier policy ahead.",
    brief: null,
    imageUrl: null,
    imageCredit: null,
    members: [
      {
        headline: "Stocks rally as rate-cut bets build",
        sourceName: "SEC",
        url: "https://example.com/live",
        publishedAt: new Date().toISOString(),
        dek: "Equities climbed.",
      },
    ],
  };

  async function setup(reads: (() => unknown)[]) {
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("@/lib/db/client", () => ({
      isDbConfigured: () => true,
      getDb: () => null,
    }));
    let i = 0;
    vi.doMock("@/lib/db/queries/wire", () => ({
      dbReadWireBySlug: async () => null,
      dbReadWire: async () => {
        const r = reads[Math.min(i, reads.length - 1)]!;
        i += 1;
        return r();
      },
    }));
    return import("./read");
  }

  const down = () => {
    throw new Error("[db] dbReadWire timed out");
  };

  it("serves the last good wire instead of an empty homepage", async () => {
    const { readWire } = await setup([() => [liveRow], down]);
    expect((await readWire()).some((c) => c.slug === liveRow.slug)).toBe(true);
    // Database now unreachable: the same story is still served.
    expect((await readWire()).some((c) => c.slug === liveRow.slug)).toBe(true);
  });

  it("does not serve a last good wire older than the limit", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { readWire, LAST_GOOD_MAX_AGE_MS } = await setup([() => [liveRow], down]);
    await readWire();
    vi.setSystemTime(Date.now() + LAST_GOOD_MAX_AGE_MS + 60_000);
    expect((await readWire()).some((c) => c.slug === liveRow.slug)).toBe(false);
  });

  it("with no wire held, falls back to the authored content only", async () => {
    vi.stubEnv("DEMO_MODE", "");
    const { readWire } = await setup([down]);
    const all = await readWire();
    expect(all.every((c) => c.section === "eureka")).toBe(true);
  });
});
