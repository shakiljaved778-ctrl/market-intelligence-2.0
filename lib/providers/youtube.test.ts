import { describe, expect, it } from "vitest";
import { parsePlaylistItems, pickUploadsPlaylist } from "./youtube";

const channels = (title: string) => ({
  items: [
    {
      id: "UCAzhpt9DmG6PnHXjmJTvRGQ",
      snippet: { title },
      contentDetails: { relatedPlaylists: { uploads: "UUAzhpt9DmG6PnHXjmJTvRGQ" } },
    },
  ],
});

describe("YouTube channel lookup", () => {
  it("returns the uploads playlist only when the channel is the expected institution", () => {
    expect(pickUploadsPlaylist(channels("Federal Reserve"), ["federal reserve"])).toBe(
      "UUAzhpt9DmG6PnHXjmJTvRGQ",
    );
    expect(
      pickUploadsPlaylist(channels("Some Other Channel"), ["Federal Reserve"]),
    ).toBeNull();
    expect(pickUploadsPlaylist({ items: [] }, ["Federal Reserve"])).toBeNull();
    expect(
      pickUploadsPlaylist({ error: { code: 403 } }, ["Federal Reserve"]),
    ).toBeNull();
  });
});

describe("YouTube playlist items", () => {
  const item = (videoId: string, title: string, when?: string) => ({
    snippet: {
      title,
      thumbnails: { high: { url: `https://i.ytimg.com/vi/${videoId}/hq.jpg` } },
    },
    contentDetails: { videoId, videoPublishedAt: when },
  });

  it("parses videos newest first and skips private, deleted, undated or malformed ones", () => {
    const v = parsePlaylistItems({
      items: [
        item("abcDEF12345", "FOMC Press Conference", "2026-10-28T18:30:00Z"),
        item("zzzYYY98765", "Chair's remarks", "2026-11-18T15:00:00Z"),
        item("prvPRV12345", "Private video", "2026-11-18T15:00:00Z"),
        item("delDEL12345", "Deleted video", "2026-11-18T15:00:00Z"),
        item("noDate12345", "No date"),
        item("bad", "Bad id", "2026-11-18T15:00:00Z"),
      ],
    });
    expect(v.map((x) => x.videoId)).toEqual(["zzzYYY98765", "abcDEF12345"]);
    expect(v[0]!.thumbnailUrl).toBe("https://i.ytimg.com/vi/zzzYYY98765/hq.jpg");
    expect(v[0]!.publishedAt).toBe("2026-11-18T15:00:00.000Z");
  });

  it("yields nothing for an error body", () => {
    expect(parsePlaylistItems({ error: { code: 403, message: "quota" } })).toEqual([]);
  });
});
