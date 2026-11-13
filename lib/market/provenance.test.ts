import { describe, expect, it } from "vitest";
import {
  delayLabel,
  formatAsOf,
  sourceLabel,
  stampText,
  summaryStamp,
} from "@/lib/market/provenance";

describe("delayLabel", () => {
  it("labels no delay, delayed and end-of-day honestly", () => {
    expect(delayLabel(0)).toBeNull();
    expect(delayLabel(15)).toBe("15 min delayed");
    expect(delayLabel(120)).toBe("2h delayed");
    expect(delayLabel(1440)).toBe("end of day");
  });
});

describe("formatAsOf", () => {
  it("prints a timestamp in Doha time", () => {
    // 14:45 UTC is 17:45 in Doha (UTC+3, no DST).
    expect(formatAsOf("2026-11-12T14:45:00.000Z")).toBe("12 Nov, 17:45 AST");
  });
  it("prints a date-only observation without a clock time", () => {
    expect(formatAsOf("2026-11-12")).toBe("12 Nov");
    expect(formatAsOf("2026-11-12", true)).toBe("12 Nov 2026");
  });
  it("returns null for an unparseable value", () => {
    expect(formatAsOf("not a date")).toBeNull();
  });
});

describe("stampText", () => {
  it("states source and time for a real quote", () => {
    expect(
      stampText({
        source: "finnhub",
        asOf: "2026-11-12T14:45:00.000Z",
        delayMinutes: 0,
        status: "ok",
      }),
    ).toBe("Finnhub · 12 Nov, 17:45 AST");
  });
  it("states the delay when the feed is delayed", () => {
    expect(
      stampText({
        source: "fmp",
        asOf: "2026-11-12T14:30:00.000Z",
        delayMinutes: 15,
        status: "ok",
      }),
    ).toBe("FMP · 12 Nov, 17:30 AST · 15 min delayed");
  });
  it("labels a last close and an end-of-day feed", () => {
    expect(
      stampText({
        source: "finnhub",
        asOf: "2026-11-11T21:00:00.000Z",
        delayMinutes: 0,
        status: "eod",
      }),
    ).toBe("Finnhub · 12 Nov, 00:00 AST · close");
    expect(stampText({ source: "eodhd", asOf: "2026-11-11", delayMinutes: 1440 })).toBe(
      "EODHD · 11 Nov · end of day",
    );
  });
  it("uses the cadence qualifier for reference rates", () => {
    expect(
      stampText({ source: "ecb", asOf: "2026-11-12", cadence: "daily fixing" }),
    ).toBe("ECB reference rate · 12 Nov · daily fixing");
  });
  it("never dresses demo data up as market data", () => {
    expect(
      stampText({ source: "demo", asOf: "2026-11-12T14:45:00.000Z", demo: true }),
    ).toBe("Demo data — not market data");
  });
  it("returns null when there is nothing real to stamp", () => {
    expect(stampText({ source: null, asOf: null })).toBeNull();
  });
});

describe("sourceLabel", () => {
  it("maps provider ids and keeps human labels as recorded", () => {
    expect(sourceLabel("coingecko")).toBe("CoinGecko");
    expect(sourceLabel("FRED (EIA)")).toBe("FRED (EIA)");
  });
});

describe("summaryStamp", () => {
  it("lists distinct sources and the time span covered", () => {
    expect(
      summaryStamp([
        { source: "finnhub", asOf: "2026-11-11T21:00:00.000Z", delayMinutes: 0 },
        { source: "coingecko", asOf: "2026-11-12T14:45:00.000Z", delayMinutes: 0 },
      ]),
    ).toBe(
      "Source Finnhub, CoinGecko · prices as of 12 Nov, 00:00 AST to 12 Nov, 17:45 AST",
    );
  });
  it("is null with no real rows, and says so for demo rows", () => {
    expect(summaryStamp([])).toBeNull();
    expect(summaryStamp([{ source: "demo", asOf: "2026-11-12", demo: true }])).toBe(
      "Demo data — not market data",
    );
  });
});
