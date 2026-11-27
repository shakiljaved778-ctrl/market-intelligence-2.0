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
  it("leaves out channels already shown, never wraps, skips those without a picture", () => {
    const out = inlinePlaylists([p("a"), p("b"), p("c", false), p("d")], 2);
    expect(out.map((x) => x.id)).toEqual(["d"]);
  });

  it("uses every channel with a picture when none is shown elsewhere", () => {
    const out = inlinePlaylists([p("a"), p("b", false), p("c")]);
    expect(out.map((x) => x.id)).toEqual(["a", "c"]);
  });
});
