import { describe, expect, it } from "vitest";
import { newestFirst } from "./playlists";

describe("Watch cards newest first (2026-11-28)", () => {
  it("puts the channel with the most recently seen upload first, others in registry order", () => {
    const list = [{ id: "fed" }, { id: "imf" }, { id: "qse" }, { id: "wb" }];
    const seen = new Map<string, string | undefined>([
      ["fed", "2026-11-25T10:00:00Z"],
      ["qse", "2026-11-28T06:00:00Z"],
      ["imf", undefined],
    ]);
    expect(newestFirst(list, seen).map((p) => p.id)).toEqual([
      "qse",
      "fed",
      "imf",
      "wb",
    ]);
  });
});
