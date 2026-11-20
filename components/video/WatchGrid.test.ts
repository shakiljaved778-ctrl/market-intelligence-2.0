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
    expect(html).toContain("Play the latest videos from Federal Reserve");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("ytimg");
  });
});
