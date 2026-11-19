import { describe, expect, it } from "vitest";
import { pickVideoStrip } from "./read";

const v = (channel: string, day: number) => ({
  channel,
  publishedAt: `2026-11-${String(day).padStart(2, "0")}T12:00:00.000Z`,
});

describe("video strip", () => {
  it("takes each channel's newest video first, newest first overall", () => {
    const strip = pickVideoStrip(
      [v("fed", 19), v("fed", 18), v("fed", 17), v("imf", 10), v("ecb", 5)],
      4,
    );
    expect(strip.map((x) => `${x.channel}${x.publishedAt.slice(8, 10)}`)).toEqual([
      "fed19",
      "fed18",
      "imf10",
      "ecb05",
    ]);
  });

  it("is capped and empty-safe", () => {
    expect(pickVideoStrip([], 4)).toEqual([]);
    expect(pickVideoStrip([v("a", 1), v("b", 2), v("c", 3)], 2)).toHaveLength(2);
  });
});

describe("content/videos.yaml", () => {
  it("parses: every channel has an identifier, expected titles and a licence note", async () => {
    const { loadVideoChannels } = await import("./channels");
    const channels = loadVideoChannels();
    expect(channels.length).toBeGreaterThan(0);
    for (const c of channels) {
      expect(c.channelId || c.handle || c.username).toBeTruthy();
      expect(c.expect_titles.length).toBeGreaterThan(0);
    }
    expect(new Set(channels.map((c) => c.id)).size).toBe(channels.length);
  });
});
