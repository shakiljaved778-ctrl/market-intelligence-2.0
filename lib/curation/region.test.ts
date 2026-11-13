import { describe, expect, it } from "vitest";
import { classifyRegion, isGccRegion } from "./region";

describe("classifyRegion", () => {
  it("tags a single GCC country from the headline", () => {
    expect(classifyRegion({ title: "QNB posts record third-quarter profit" })).toBe(
      "QA",
    );
    expect(classifyRegion({ title: "Aramco raises its dividend" })).toBe("SA");
    expect(classifyRegion({ title: "Emaar sales jump on Dubai demand" })).toBe("AE");
  });

  it("tags GCC when two countries or the bloc itself are named", () => {
    expect(classifyRegion({ title: "Saudi and UAE bourses rally on oil" })).toBe("GCC");
    expect(
      classifyRegion({ title: "GCC central banks hold rates after the Fed" }),
    ).toBe("GCC");
  });

  it("uses the source's region when the source is in the Gulf", () => {
    expect(
      classifyRegion({ title: "Monetary policy statement", sourceRegion: "QA" }),
    ).toBe("QA");
  });

  it("does not read ordinary words as Gulf news", () => {
    expect(
      classifyRegion({ title: "Hurricane season ends in the Gulf of Mexico" }),
    ).toBe("GLOBAL");
    expect(classifyRegion({ title: "Pif and paf: a children's book review" })).toBe(
      "GLOBAL",
    );
    expect(classifyRegion({ title: "Fed holds rates", sourceRegion: "US" })).toBe(
      "GLOBAL",
    );
  });

  it("knows which regions are Gulf regions", () => {
    expect(isGccRegion("QA")).toBe(true);
    expect(isGccRegion("GCC")).toBe(true);
    expect(isGccRegion("GLOBAL")).toBe(false);
  });
});
