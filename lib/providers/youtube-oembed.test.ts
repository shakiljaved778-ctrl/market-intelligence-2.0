import { describe, expect, it } from "vitest";
import { latestFromOEmbeds, videoIdFromThumbnail } from "./youtube-oembed";

describe("YouTube oEmbed — latest upload", () => {
  it("reads the video id from a thumbnail URL", () => {
    expect(
      videoIdFromThumbnail("https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg"),
    ).toBe("abcDEF12345");
    expect(videoIdFromThumbnail("https://i.ytimg.com/vi_webp/abcDEF12345/x.webp")).toBe(
      "abcDEF12345",
    );
    expect(videoIdFromThumbnail("https://example.com/img.jpg")).toBeNull();
    expect(videoIdFromThumbnail(undefined)).toBeNull();
  });

  const playlist = {
    thumbnail_url: "https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg",
  };

  it("returns the newest video when its channel is the expected institution", () => {
    expect(
      latestFromOEmbeds(
        playlist,
        { title: " FOMC Press Conference ", author_name: "Federal Reserve" },
        ["Federal Reserve"],
      ),
    ).toEqual({
      videoId: "abcDEF12345",
      title: "FOMC Press Conference",
      thumbnailUrl: "https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg",
    });
  });

  it("rejects a video from another channel, or missing data — never shows it", () => {
    expect(
      latestFromOEmbeds(playlist, { title: "x", author_name: "Someone Else" }, [
        "Federal Reserve",
      ]),
    ).toBeNull();
    expect(
      latestFromOEmbeds(null, { title: "x", author_name: "Federal Reserve" }, [
        "Federal Reserve",
      ]),
    ).toBeNull();
    expect(latestFromOEmbeds(playlist, null, ["Federal Reserve"])).toBeNull();
  });
});
