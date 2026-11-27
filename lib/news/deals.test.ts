import { describe, expect, it } from "vitest";
import { buildTrackers, statedValue } from "./deals";
import type { WireCluster } from "./read";

describe("statedValue", () => {
  it("quotes an amount exactly as the text states it", () => {
    expect(
      statedValue("QIIB Successfully Issues $500 Million Senior Unsecured Sukuk"),
    ).toBe("$500 Million");
    expect(
      statedValue("Ahlibank Completes New Bonds Issuance of USD 500 Million"),
    ).toBe("USD 500 Million");
    expect(statedValue("KKR agrees $2bn buyout")).toBe("$2bn");
  });
  it("never invents a value", () => {
    expect(statedValue("Dukhan Bank signs agreement with Anthropic", null)).toBeNull();
    expect(statedValue("Fund closes oversubscribed round")).toBeNull();
  });
  it("falls back to the summary", () => {
    expect(
      statedValue("Startup raises Series A", "The round of $30m was led by STV."),
    ).toBe("$30m");
  });
});

const c = (over: Partial<WireCluster>): WireCluster =>
  ({
    slug: over.slug ?? "s",
    title: over.title ?? "t",
    tickers: [],
    topics: [],
    entities: [],
    sourceIds: [],
    sourceCount: 1,
    eventTime: "2026-11-27T10:00:00Z",
    importanceScore: 10,
    articleIds: [],
    primaryId: 1,
    section: "ibanking",
    region: "GLOBAL",
    dek: null,
    imageUrl: null,
    imageCredit: null,
    ...over,
  }) as WireCluster;

describe("buildTrackers", () => {
  it("sorts each tracker into its table, newest first", () => {
    const t = buildTrackers(
      [
        c({
          slug: "a",
          title: "QIIB Issues $500 Million Sukuk",
          eventTime: "2026-11-26T10:00:00Z",
        }),
        c({ slug: "b", title: "Co files for IPO", topics: ["ipo"] }),
        c({
          slug: "c",
          title: "Bank issues green bonds",
          eventTime: "2026-11-27T12:00:00Z",
        }),
        c({ slug: "d", section: "venture", title: "Startup raises $30m" }),
        c({ slug: "e", section: "privateequity", title: "KKR buyout" }),
        c({ slug: "old", title: "Old sukuk", eventTime: "2026-10-01T10:00:00Z" }),
      ],
      Date.parse("2026-11-28T00:00:00Z"),
    );
    const byId = Object.fromEntries(t.map((x) => [x.id, x.rows.map((r) => r.slug)]));
    expect(byId["sukuk-bonds"]).toEqual(["c", "a"]);
    expect(byId.ipos).toEqual(["b"]);
    expect(byId.funding).toEqual(["d"]);
    expect(byId["private-equity"]).toEqual(["e"]);
  });
});
