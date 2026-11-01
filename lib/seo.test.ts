import { describe, expect, it } from "vitest";
import { SITE_URL } from "./site";
import {
  breadcrumbLd,
  canonical,
  corporationLd,
  graph,
  newsArticleLd,
  ogImage,
  organizationLd,
  siteLd,
  websiteLd,
} from "./seo";

describe("canonical", () => {
  it("is absolute, single-host, query-free and without a trailing slash", () => {
    expect(canonical("/markets")).toBe(`${SITE_URL}/markets`);
    expect(canonical("/news?section=markets")).toBe(`${SITE_URL}/news`);
    expect(canonical("/markets/")).toBe(`${SITE_URL}/markets`);
  });
});

describe("ogImage", () => {
  it("points at the /api/og design with an encoded title", () => {
    const u = ogImage("Fed holds rates at 4.5%", "economy");
    expect(u.startsWith(`${SITE_URL}/api/og?`)).toBe(true);
    expect(u).toContain("title=Fed+holds");
    expect(u).toContain("kicker=economy");
  });
});

describe("site JSON-LD", () => {
  it("is a valid graph with Organization + WebSite and a SearchAction", () => {
    const ld = siteLd();
    const parsed = JSON.parse(JSON.stringify(ld)) as typeof ld;
    expect(parsed["@context"]).toBe("https://schema.org");
    const types = parsed["@graph"].map((n) => n["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    const website = parsed["@graph"].find((n) => n["@type"] === "WebSite");
    expect((website?.potentialAction as { "@type": string })["@type"]).toBe(
      "SearchAction",
    );
    expect(organizationLd().url).toBe(SITE_URL);
    expect(websiteLd().url).toBe(SITE_URL);
  });
});

describe("newsArticleLd", () => {
  it("has the required NewsArticle fields and isBasedOn sources", () => {
    const a = newsArticleLd({
      headline: "Fed holds rates",
      description: "The FOMC held.",
      slug: "fed-holds",
      datePublished: "2026-11-01T12:00:00.000Z",
      section: "Economy",
      sources: ["https://fed.gov/a", "https://reuters.com/b"],
      imageUrl: null,
    });
    expect(a["@type"]).toBe("NewsArticle");
    expect(a.headline).toBe("Fed holds rates");
    expect(a.datePublished).toBe("2026-11-01T12:00:00.000Z");
    expect(a.dateModified).toBe("2026-11-01T12:00:00.000Z"); // defaults to published
    expect(a.url).toBe(`${SITE_URL}/news/fed-holds`);
    expect(a.isBasedOn).toEqual(["https://fed.gov/a", "https://reuters.com/b"]);
    expect(Array.isArray(a.image)).toBe(true);
  });
});

describe("breadcrumbLd", () => {
  it("numbers positions from 1 and resolves canonical items", () => {
    const b = breadcrumbLd([
      { name: "Home", path: "/" },
      { name: "Markets", path: "/markets" },
    ]) as { itemListElement: { position: number; item: string }[] };
    expect(b.itemListElement[0]!.position).toBe(1);
    expect(b.itemListElement[1]!.item).toBe(`${SITE_URL}/markets`);
  });
});

describe("corporationLd", () => {
  it("carries the ticker symbol", () => {
    const c = corporationLd({
      name: "Apple",
      ticker: "AAPL",
      url: `${SITE_URL}/quote/AAPL`,
    });
    expect(c["@type"]).toBe("Corporation");
    expect(c.tickerSymbol).toBe("AAPL");
  });
});

describe("graph", () => {
  it("wraps entities in a schema.org graph", () => {
    const g = graph(organizationLd(), breadcrumbLd([{ name: "Home", path: "/" }]));
    expect(g["@context"]).toBe("https://schema.org");
    expect(g["@graph"]).toHaveLength(2);
    expect(() => JSON.parse(JSON.stringify(g))).not.toThrow();
  });
});
