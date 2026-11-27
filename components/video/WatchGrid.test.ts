import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { officialPlaylists } from "@/lib/videos/playlists";
import { WatchGrid } from "./WatchGrid";

describe("official playlists (no YouTube key)", () => {
  it("maps each channel id to its uploads playlist", () => {
    const fed = officialPlaylists().find((p) => p.id === "federal-reserve");
    expect(fed?.listId).toBe("UUAzhpt9DmG6PnHXjmJTvRGQ");
    // Channels known only by handle/username have no playlist.
    expect(officialPlaylists().some((p) => p.id === "ecb")).toBe(false);
  });

  it("renders drawn playlist cards with no YouTube request before play", () => {
    const html = renderToStaticMarkup(
      createElement(WatchGrid, { videos: [], playlists: officialPlaylists() }),
    );
    expect(html).toContain("play the latest videos");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("ytimg");
  });

  it("shows the newest video's picture and title once the job has stored them", () => {
    const html = renderToStaticMarkup(
      createElement(WatchGrid, {
        videos: [],
        playlists: [
          {
            id: "federal-reserve",
            name: "Federal Reserve",
            listId: "UUAzhpt9DmG6PnHXjmJTvRGQ",
            latest: {
              videoId: "Txga74VI9UE",
              title: "FOMC Press Conference",
              thumbnailUrl: "https://i.ytimg.com/vi/Txga74VI9UE/hqdefault.jpg",
            },
          },
        ],
      }),
    );
    expect(html).toContain("https://i.ytimg.com/vi/Txga74VI9UE/hqdefault.jpg");
    expect(html).toContain("FOMC Press Conference");
    expect(html).toContain("Latest · Federal Reserve · YouTube");
    expect(html).not.toContain("<iframe");
  });
});
