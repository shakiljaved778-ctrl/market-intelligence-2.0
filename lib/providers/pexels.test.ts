import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetKvStoreForTests } from "@/lib/cache/store";
import { isPexelsConfigured, searchPexels } from "./pexels";

const SAMPLE = {
  photos: [
    {
      alt: "A trading floor",
      photographer: "Jane Doe",
      photographer_url: "https://www.pexels.com/@jane",
      src: { landscape: "https://images.pexels.com/x/landscape.jpg" },
    },
  ],
};

describe("pexels cover provider", () => {
  beforeEach(() => {
    __resetKvStoreForTests();
    delete process.env.PEXELS_API_KEY;
    vi.restoreAllMocks();
  });
  afterEach(() => {
    delete process.env.PEXELS_API_KEY;
  });

  it("returns null and makes no call when the key is absent (§2 zero-key)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(isPexelsConfigured()).toBe(false);
    expect(await searchPexels("stock market")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves a landscape cover with credit and caches it (one call)", async () => {
    process.env.PEXELS_API_KEY = "test-key";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(SAMPLE)));
    vi.stubGlobal("fetch", fetchMock);

    const first = await searchPexels("stock market trading");
    expect(first).toEqual({
      url: "https://images.pexels.com/x/landscape.jpg",
      alt: "A trading floor",
      credit: "Jane Doe",
      creditUrl: "https://www.pexels.com/@jane",
    });

    // Second call for the same query is served from cache — no new vendor hit.
    const second = await searchPexels("stock market trading");
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives stories that search the same phrase different photos, with one call", async () => {
    process.env.PEXELS_API_KEY = "test-key";
    const many = {
      photos: Array.from({ length: 15 }, (_, i) => ({
        alt: `Doha ${i}`,
        photographer: "P",
        photographer_url: "https://www.pexels.com/@p",
        src: { landscape: `https://images.pexels.com/${i}.jpg` },
      })),
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(many)));
    vi.stubGlobal("fetch", fetchMock);

    const slugs = [
      "qse-index-opens-lower-1a",
      "meeza-cloud-deal-2b",
      "state-budget-q3-3c",
    ];
    // The cluster job looks covers up one story at a time.
    const urls: (string | undefined)[] = [];
    for (const slug of slugs) {
      urls.push((await searchPexels("economy finance city Doha", slug))?.url);
    }
    expect(new Set(urls).size).toBeGreaterThan(1);
    // The same story always gets the same photo.
    expect((await searchPexels("economy finance city Doha", slugs[0]))?.url).toBe(
      urls[0],
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("skips photos already used by another story, and gives null when all are taken", async () => {
    process.env.PEXELS_API_KEY = "test-key";
    const two = {
      photos: [0, 1].map((i) => ({
        alt: `p${i}`,
        photographer: "P",
        photographer_url: "https://www.pexels.com/@p",
        src: { landscape: `https://images.pexels.com/${i}.jpg` },
      })),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(two))),
    );
    const first = await searchPexels("stock market trading", "a");
    const used = new Set([first!.url]);
    const second = await searchPexels("stock market trading", "a", used);
    expect(second?.url).not.toBe(first?.url);
    used.add(second!.url);
    expect(await searchPexels("stock market trading", "a", used)).toBeNull();
  });

  it("returns null (not a throw) when the vendor errors", async () => {
    process.env.PEXELS_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    expect(await searchPexels("anything")).toBeNull();
  });
});
