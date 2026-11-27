import { describe, expect, it } from "vitest";
import { inlinePlaylists } from "./InlineVideo";
import type { OfficialPlaylist } from "@/lib/videos/playlists";

const p = (id: string, withLatest = true): OfficialPlaylist => ({
  id,
  name: id,
  listId: `UU${id}`,
  latest: withLatest ? { videoId: id, title: id, thumbnailUrl: "x" } : null,
});

describe("inline videos", () => {
  it("starts after the channels already shown and skips those without a picture", () => {
    const out = inlinePlaylists([p("a"), p("b"), p("c", false), p("d")], 2);
    expect(out.map((x) => x.id)).toEqual(["d", "a", "b"]);
  });
});
