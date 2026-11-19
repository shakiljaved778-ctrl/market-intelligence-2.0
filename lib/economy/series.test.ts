import { afterEach, describe, expect, it, vi } from "vitest";
import { SERIES } from "./series";

describe("economy series registry", () => {
  it("tracks GDP, real growth and inflation for all six GCC economies", () => {
    for (const iso3 of ["QAT", "SAU", "ARE", "KWT", "BHR", "OMN"]) {
      for (const code of ["NY.GDP.MKTP.CD", "NY.GDP.MKTP.KD.ZG", "FP.CPI.TOTL.ZG"]) {
        const s = SERIES.find((x) => x.id === `WB:${iso3}:${code}`);
        expect(s, `${iso3} ${code}`).toBeDefined();
        expect(s?.provider).toBe("worldbank");
        expect(s?.source).toBe("World Bank");
      }
    }
  });

  it("keeps the ids already stored and linked", () => {
    for (const id of [
      "WB:QAT:NY.GDP.MKTP.CD",
      "WB:SAU:NY.GDP.MKTP.CD",
      "WB:ARE:NY.GDP.MKTP.CD",
    ]) {
      expect(SERIES.some((s) => s.id === id)).toBe(true);
    }
  });

  it("has unique ids", () => {
    expect(new Set(SERIES.map((s) => s.id)).size).toBe(SERIES.length);
  });
});

describe("readMacroSeries", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/db/queries/market");
  });

  it("puts Gulf economies first and rounds World Bank percentages for display", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/queries/market", () => ({
      dbSeriesObservations: async () => [
        { seriesId: "FRED:UNRATE", date: "2026-10-01", value: 4.1 },
        { seriesId: "WB:KWT:FP.CPI.TOTL.ZG", date: "2024-12-31", value: 2.91834 },
      ],
    }));
    const { readMacroSeries } = await import("./read");
    const series = await readMacroSeries();
    expect(series.map((s) => s.id)).toEqual(["WB:KWT:FP.CPI.TOTL.ZG", "FRED:UNRATE"]);
    expect(series[0]?.observations.at(-1)?.value).toBe(2.9);
    expect(series[1]?.observations.at(-1)?.value).toBe(4.1);
  });
});
