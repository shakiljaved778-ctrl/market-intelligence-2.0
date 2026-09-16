import { describe, expect, it } from "vitest";
import {
  instrumentRecap,
  sessionRecap,
  weeklyRecap,
  type InstrumentRecapInput,
  type SessionRecapInput,
} from "./recap";

const base: InstrumentRecapInput = {
  name: "Brent Crude",
  currency: "USD",
  priceUsd: 71.4,
  changePct: -2.3,
  streakLength: 3,
  streakShape: "loss",
  extremum: null,
  reversed: false,
};

describe("recap reproducibility (§9 gate)", () => {
  it("is a pure function of its inputs — reproducible from stored inputs", () => {
    const a = instrumentRecap(base);
    // Regenerate from the STORED inputs (round-tripped through JSON like the DB).
    const stored = JSON.parse(JSON.stringify(a.inputs)) as InstrumentRecapInput;
    const b = instrumentRecap(stored);
    expect(b.bodyMd).toBe(a.bodyMd);
    expect(a.inputs).toEqual(base);
  });
});

describe("instrumentRecap template forms", () => {
  it("reports a consecutive streak with the right ordinal + plural", () => {
    expect(instrumentRecap(base).bodyMd).toContain("third consecutive decline");
  });

  it("prefers an extremum clause over the streak", () => {
    const out = instrumentRecap({
      ...base,
      extremum: { kind: "low", sinceDate: "2026-08-14T00:00:00.000Z" },
    });
    expect(out.bodyMd).toContain("lowest close since 14 August");
    expect(out.bodyMd).not.toContain("consecutive");
  });

  it("never emits a context clause that contradicts the settle direction", () => {
    // Settled UP on the day but the candle streak was a decline → suppress it.
    const out = instrumentRecap({
      ...base,
      changePct: 0.6,
      streakShape: "loss",
      streakLength: 3,
    });
    expect(out.bodyMd).toContain("settled higher");
    expect(out.bodyMd).not.toContain("decline");
  });

  it("degrades to a single sentence when little changed", () => {
    const out = instrumentRecap({
      ...base,
      changePct: 0.02,
      streakLength: 0,
      streakShape: null,
    });
    expect(out.bodyMd).toContain("little changed");
    expect(out.bodyMd.split(". ").length).toBe(1);
  });
});

describe("sessionRecap", () => {
  it("handles all-up indices and singular/plural breadth", () => {
    const input: SessionRecapInput = {
      kind: "session_close",
      currency: "USD",
      date: "2026-09-16",
      indices: [
        { name: "S&P 500", changePct: 0.4 },
        { name: "Nasdaq", changePct: 0.6 },
      ],
      breadth: { advancers: 1, decliners: 5 },
    };
    const out = sessionRecap(input).bodyMd;
    expect(out).toContain("higher");
    expect(out).toContain("1 gainer to 5 decliners");
  });

  it("says 'mixed' when indices diverge", () => {
    const out = sessionRecap({
      kind: "session_close",
      currency: "USD",
      date: "2026-09-16",
      indices: [
        { name: "S&P 500", changePct: 0.4 },
        { name: "FTSE 100", changePct: -0.3 },
      ],
    }).bodyMd;
    expect(out).toContain("mixed");
  });
});

describe("weeklyRecap", () => {
  it("summarises the week with a leader and a laggard", () => {
    const out = weeklyRecap({
      currency: "USD",
      weekEnding: "2026-09-16",
      index: { name: "S&P 500", changePct: 1.2 },
      best: { name: "Tesla", changePct: 6.2 },
      worst: { name: "Exxon", changePct: -2.1 },
    }).bodyMd;
    expect(out).toContain("gained 1.2%");
    expect(out).toContain("Tesla led");
    expect(out).toContain("Exxon lagged");
  });
});
