import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VideoGrid } from "./VideoGrid";

describe("VideoGrid", () => {
  it("renders a click-to-play card per video and loads no player up front", () => {
    const html = renderToStaticMarkup(
      createElement(VideoGrid, {
        videos: [
          {
            videoId: "abcDEF12345",
            channel: "federal-reserve",
            channelName: "Federal Reserve",
            title: "FOMC Press Conference",
            publishedAt: "2026-10-28T18:30:00.000Z",
            thumbnailUrl: "https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg",
          },
        ],
      }),
    );
    expect(html).toContain("Play video: FOMC Press Conference (Federal Reserve)");
    expect(html).toContain("Federal Reserve · 28 Oct 2026");
    expect(html).not.toContain("<iframe");
    expect(html).toContain("official YouTube channels");
  });

  it("renders nothing with no videos", () => {
    expect(renderToStaticMarkup(createElement(VideoGrid, { videos: [] }))).toBe("");
  });
});
