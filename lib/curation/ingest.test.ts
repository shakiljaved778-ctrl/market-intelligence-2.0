import Parser from "rss-parser";
import { describe, expect, it } from "vitest";
import { normalizeFeedXml } from "./ingest";

// Shape of the Qatar News Agency feed as served on 2026-11-13: RSS 2.0 with no
// version attribute on the root element.
const QNA = `<rss xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><channel>
<title>Economy Local</title><link>Economy Local</link><description>Economy Local</description>
<item><guid>B8A03190</guid>
<link>https://qna.org.qa/en/News-Area/News/2026-11/13/oman-crude-oil-price-rises</link>
<title>Oman Crude Oil Price Rises</title>
<description>Muscat, November 13 (QNA) - Oman's official crude oil price rose on Friday.</description>
<pubDate>Fri, 13 Nov 2026 14:13:24 Z</pubDate></item>
</channel></rss>`;

describe("normalizeFeedXml", () => {
  it("lets a versionless RSS 2.0 feed parse, with its dates", async () => {
    await expect(new Parser().parseString(QNA)).rejects.toThrow();
    const feed = await new Parser().parseString(normalizeFeedXml(QNA));
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]?.title).toBe("Oman Crude Oil Price Rises");
    expect(feed.items[0]?.isoDate).toBe("2026-11-13T14:13:24.000Z");
  });

  it("leaves a feed that declares its version untouched", () => {
    const xml = '<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>';
    expect(normalizeFeedXml(xml)).toBe(xml);
  });

  it("leaves Atom and RDF feeds untouched", () => {
    const atom = '<feed xmlns="http://www.w3.org/2005/Atom"></feed>';
    const rdf = '<rdf:RDF xmlns:rdf="x"><rss-thing/></rdf:RDF>';
    expect(normalizeFeedXml(atom)).toBe(atom);
    expect(normalizeFeedXml(rdf)).toBe(rdf);
  });
});
