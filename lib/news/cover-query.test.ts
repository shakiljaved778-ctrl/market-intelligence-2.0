import { describe, expect, it } from "vitest";
import { coverQuery, gccPlace } from "./cover-query";

describe("cover photo queries", () => {
  it("searches a Gulf story's city rather than an entity name", () => {
    expect(gccPlace("QA")).toBe("Doha");
    expect(gccPlace("SA")).toBe("Riyadh");
    expect(gccPlace("GCC")).toBe("Gulf city skyline");
    expect(coverQuery("economy", gccPlace("QA"))).toBe("economy finance city Doha");
  });

  it("has no place for stories outside the Gulf", () => {
    expect(gccPlace("GLOBAL")).toBeNull();
    expect(gccPlace(null)).toBeNull();
  });
});
