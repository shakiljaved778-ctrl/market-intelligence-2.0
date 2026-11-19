import { describe, expect, it } from "vitest";
import type { WireCluster } from "@/lib/news/read";
import { photoFirst } from "./homepage";
import { coverQueries } from "./cover-query";

const s = (slug: string, imageUrl: string | null) =>
  ({ slug, imageUrl }) as unknown as WireCluster;

describe("photoFirst (a band's big card shows a photo when any story has one)", () => {
  it("moves the first story with a photo to the front, keeping the rest in order", () => {
    const out = photoFirst([
      s("a", null),
      s("b", null),
      s("c", "x.jpg"),
      s("d", "y.jpg"),
    ]);
    expect(out.map((c) => c.slug)).toEqual(["c", "a", "b", "d"]);
  });

  it("leaves a band unchanged when the first story has a photo, or none do", () => {
    expect(photoFirst([s("a", "x"), s("b", null)]).map((c) => c.slug)).toEqual([
      "a",
      "b",
    ]);
    expect(photoFirst([s("a", null), s("b", null)]).map((c) => c.slug)).toEqual([
      "a",
      "b",
    ]);
    expect(photoFirst([])).toEqual([]);
  });
});

describe("coverQueries", () => {
  it("tries further phrasings of a Gulf place, then the section's plain search", () => {
    expect(coverQueries("economy", "Doha")).toEqual([
      "economy finance city Doha",
      "Doha skyline",
      "Doha city architecture",
      "Doha business district",
      "economy finance city",
      "business finance city",
    ]);
  });

  it("uses no place phrasings for a non-place extra", () => {
    expect(coverQueries("markets", "Nvidia")).toEqual([
      "stock market trading Nvidia",
      "stock market trading",
      "business finance city",
    ]);
  });
});
