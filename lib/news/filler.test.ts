import { describe, expect, it } from "vitest";
import {
  assignFillers,
  FILLER_QUERIES,
  fillerPoolFor,
  type FillerPhoto,
} from "./filler";
import type { Region } from "@/lib/curation/region";

const photo = (n: number): FillerPhoto => ({
  url: `https://images.example/${n}.jpg`,
  credit: `P${n}`,
  creditUrl: `https://example.org/p${n}`,
});

const item = (section: string, region: Region, imageUrl: string | null = null) => ({
  section,
  region,
  imageUrl,
  imageCredit: imageUrl ? { credit: "own", creditUrl: "https://x" } : null,
});

describe("filler photos", () => {
  it("uses the Gulf pool for Gulf markets/economy stories only", () => {
    expect(fillerPoolFor("markets", "QA")).toBe("gcc");
    expect(fillerPoolFor("economy", "GCC")).toBe("gcc");
    expect(fillerPoolFor("markets", "GLOBAL")).toBe("markets");
    expect(fillerPoolFor("sports", "QA")).toBe("sports");
    expect(fillerPoolFor("unknown-section", "GLOBAL")).toBe("general");
  });

  it("has searches for every pool it can pick", () => {
    for (const s of ["markets", "economy", "eureka", "general", "gcc"]) {
      expect(FILLER_QUERIES[s]?.length).toBeGreaterThan(0);
    }
  });

  it("fills only photo-less items, without repeating within a pool", () => {
    const pools = new Map([["markets", [photo(1), photo(2), photo(3)]]]);
    const out = assignFillers(
      [
        item("markets", "GLOBAL"),
        item("markets", "GLOBAL", "https://own.example/a.jpg"),
        item("markets", "GLOBAL"),
        item("markets", "GLOBAL"),
      ],
      pools,
    );
    expect(out[1]!.imageUrl).toBe("https://own.example/a.jpg");
    const fillers = [out[0], out[2], out[3]].map((o) => o!.imageUrl);
    expect(new Set(fillers).size).toBe(3);
    expect(out[0]!.imageCredit?.credit).toBe("P1");
  });

  it("leaves an item alone when its pool is empty", () => {
    const out = assignFillers([item("sports", "GLOBAL")], new Map());
    expect(out[0]!.imageUrl).toBeNull();
  });
});
