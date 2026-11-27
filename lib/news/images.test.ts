import { describe, expect, it } from "vitest";
import { pexelsSrcSet } from "./images";

describe("pexelsSrcSet", () => {
  it("offers smaller copies of a Pexels cover at the same aspect ratio", () => {
    const s = pexelsSrcSet(
      "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    );
    expect(s).toContain("h=167&w=320 320w");
    expect(s).toContain("h=167");
    expect(s).toContain(" 320w");
    expect(s).toContain(" 1200w");
    expect(s).toContain("auto=compress");
  });
  it("leaves other hosts alone", () => {
    expect(pexelsSrcSet("https://example.com/a.jpg")).toBeNull();
    expect(pexelsSrcSet("not a url")).toBeNull();
  });
});
