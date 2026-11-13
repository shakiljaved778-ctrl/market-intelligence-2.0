import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * A briefing for a date must contain the stories published in THAT date's
 * window (the 24 hours before 07:00 Doha) — an archive page for a past date
 * must never show today's wire. Market rows appear only on the day they
 * describe, and never as sample values.
 */
const story = (slug: string, eventTime: string) => ({
  slug,
  title: `Story ${slug}`,
  tickers: [],
  topics: [],
  entities: [],
  sourceIds: ["src"],
  sourceCount: 2,
  eventTime,
  importanceScore: 50,
  articleIds: [1],
  primaryId: 1,
  section: "markets",
  dek: null,
  imageUrl: null,
  imageCredit: null,
});

describe("buildBriefing", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/news/read");
    vi.doUnmock("@/lib/market/levels");
  });

  async function load() {
    vi.resetModules();
    vi.doMock("@/lib/news/read", () => ({
      readWire: async () => [
        story("in-window", "2026-11-11T18:00:00.000Z"), // 21:00 Doha on the 11th
        story("at-cutoff", "2026-11-12T04:00:00.000Z"), // exactly 07:00 Doha
        story("too-old", "2026-11-11T03:00:00.000Z"), // before the window opens
        story("after-cutoff", "2026-11-12T09:00:00.000Z"), // later that morning
      ],
    }));
    vi.doMock("@/lib/market/levels", () => ({
      readCommodityRows: async () => [
        {
          symbol: "DCOILBRENTEU",
          name: "Brent crude",
          value: 74.2,
          changePct: 1.1,
          unit: "USD/bbl",
          source: "FRED (EIA)",
          asOf: "2026-11-10",
          cadence: "daily",
          demo: false,
        },
      ],
      readFxRows: async () => [
        {
          symbol: "DEMO",
          name: "Demo pair",
          value: 1,
          changePct: 0,
          source: "Demo data",
          asOf: "2026-11-12",
          cadence: "demo",
          demo: true,
        },
      ],
      readCryptoRows: async () => [],
    }));
    return import("./briefing");
  }

  it("keeps only stories inside a past date's window", async () => {
    const { buildBriefing } = await load();
    // Built well after the date: an archive view.
    const later = Date.parse("2026-11-20T12:00:00.000Z");
    const b = await buildBriefing("2026-11-12", false, later);
    expect(b.topStories.map((s) => s.slug)).toEqual(["in-window", "at-cutoff"]);
    // No market rows on an archive page: no historical snapshot is stored.
    expect(b.markets).toEqual([]);
  });

  it("carries real, stamped market rows on the day itself and never demo rows", async () => {
    const { buildBriefing } = await load();
    const morning = Date.parse("2026-11-12T04:00:00.000Z");
    const b = await buildBriefing("2026-11-12", false, morning);
    expect(b.markets).toHaveLength(1);
    expect(b.markets[0]?.name).toBe("Brent crude");
    expect(b.markets[0]?.stamp).toBe("FRED (EIA) · 10 Nov · daily");
  });

  it("has no stories for a date with nothing in its window", async () => {
    const { buildBriefing } = await load();
    const later = Date.parse("2026-11-20T12:00:00.000Z");
    const b = await buildBriefing("2026-11-05", false, later);
    expect(b.topStories).toEqual([]);
  });

  it("renders an email with no market table when there are no real rows", async () => {
    const { buildBriefing, renderBriefingHtml } = await load();
    const later = Date.parse("2026-11-20T12:00:00.000Z");
    const html = renderBriefingHtml(
      await buildBriefing("2026-11-12", false, later),
      "https://example.com/unsub",
    );
    expect(html).not.toContain("Index closes");
    expect(html).not.toContain(">Markets<");
    expect(html).toContain("Story in-window");
  });
});
