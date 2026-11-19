import { describe, expect, it } from "vitest";
import { parseYoutubeFeed } from "./youtube";

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Federal Reserve</title>
 <entry>
  <id>yt:video:abcDEF12345</id>
  <yt:videoId>abcDEF12345</yt:videoId>
  <title>FOMC Press Conference, November 2026</title>
  <author><name>Federal Reserve</name></author>
  <published>2026-11-05T19:30:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>zzzYYY98765</yt:videoId>
  <title>Chair&#39;s remarks &amp; Q&amp;A</title>
  <author><name>Federal Reserve</name></author>
  <published>2026-11-18T15:00:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>bad</yt:videoId>
  <title>Malformed id</title>
  <published>2026-11-18T15:00:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>noDate12345</yt:videoId>
  <title>No date</title>
 </entry>
</feed>`;

describe("YouTube channel feed", () => {
  it("parses entries newest first, decoding entities", () => {
    const v = parseYoutubeFeed(FEED);
    expect(v.map((x) => x.videoId)).toEqual(["zzzYYY98765", "abcDEF12345"]);
    expect(v[0]!.title).toBe("Chair's remarks & Q&A");
    expect(v[0]!.author).toBe("Federal Reserve");
    expect(v[0]!.publishedAt).toBe("2026-11-18T15:00:00.000Z");
    expect(v[0]!.thumbnailUrl).toBe("https://i.ytimg.com/vi/zzzYYY98765/hqdefault.jpg");
  });

  it("skips entries without a valid id, title or date — never fills them in", () => {
    expect(parseYoutubeFeed(FEED)).toHaveLength(2);
    expect(parseYoutubeFeed("<html>not a feed</html>")).toEqual([]);
  });
});
