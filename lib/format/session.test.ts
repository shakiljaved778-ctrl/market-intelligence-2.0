import { describe, expect, it } from "vitest";
import { sessionFor, sessionTimes } from "./session";

// 2026-09-16 is a Wednesday.
const wed = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 16, h, m, 0));

describe("sessionFor", () => {
  it("marks a US exchange open during regular hours", () => {
    // 15:00Z = 11:00 ET (EDT) Wednesday → open.
    expect(sessionFor("NASDAQ", wed(15)).state).toBe("open");
  });

  it("marks pre- and post-market correctly", () => {
    expect(sessionFor("NYSE", wed(12)).state).toBe("pre"); // 08:00 ET
    expect(sessionFor("NYSE", wed(21)).state).toBe("post"); // 17:00 ET
  });

  it("closes US exchanges on the weekend", () => {
    const sat = new Date(Date.UTC(2026, 8, 19, 15, 0, 0));
    expect(sessionFor("NASDAQ", sat).state).toBe("closed");
  });

  it("treats crypto as always open and never delayed", () => {
    const s = sessionFor("CRYPTO", wed(3));
    expect(s.state).toBe("open");
    expect(s.delayed).toBe(false);
  });

  it("reports a GCC exchange's real session state, flagged as delayed data", () => {
    // 09:00Z Wednesday = 12:00 in Doha → QSE (09:30–13:15) is open.
    const s = sessionFor("QSE", wed(9));
    expect(s.state).toBe("open");
    expect(s.delayed).toBe(true);
    // 11:00Z = 14:00 in Doha → closed for the day.
    expect(sessionFor("QSE", wed(11)).state).toBe("post");
  });

  it("uses the right trading week per Gulf market", () => {
    // 2026-09-18 is a Friday, 2026-09-20 a Sunday. 08:00Z = 11:00 Doha/Riyadh,
    // 12:00 Dubai — inside regular hours for all four.
    const fri = new Date(Date.UTC(2026, 8, 18, 8, 0, 0));
    const sun = new Date(Date.UTC(2026, 8, 20, 8, 0, 0));
    // Qatar and Saudi Arabia: Sunday–Thursday.
    expect(sessionFor("QSE", fri).state).toBe("closed");
    expect(sessionFor("TADAWUL", fri).state).toBe("closed");
    expect(sessionFor("QSE", sun).state).toBe("open");
    expect(sessionFor("TADAWUL", sun).state).toBe("open");
    // UAE: Monday–Friday.
    expect(sessionFor("DFM", fri).state).toBe("open");
    expect(sessionFor("ADX", fri).state).toBe("open");
    expect(sessionFor("DFM", sun).state).toBe("closed");
    expect(sessionFor("ADX", sun).state).toBe("closed");
  });

  it("returns a safe default for an unknown exchange", () => {
    expect(sessionFor(null, wed(15)).state).toBe("closed");
  });
});

describe("sessionTimes", () => {
  it("returns the venue's open and close as UTC instants", () => {
    // New York in September is UTC-4: 09:30 → 13:30Z, 16:00 → 20:00Z.
    const ny = sessionTimes("NYSE", wed(15));
    expect(ny?.open.toISOString()).toBe("2026-09-16T13:30:00.000Z");
    expect(ny?.close.toISOString()).toBe("2026-09-16T20:00:00.000Z");
    expect(ny?.days).toBe("Mon–Fri");
    // Doha is UTC+3 all year: 09:30 → 06:30Z, 13:15 → 10:15Z.
    const qse = sessionTimes("QSE", wed(9));
    expect(qse?.open.toISOString()).toBe("2026-09-16T06:30:00.000Z");
    expect(qse?.close.toISOString()).toBe("2026-09-16T10:15:00.000Z");
    expect(qse?.days).toBe("Sun–Thu");
  });

  it("handles the New York winter offset (UTC-5)", () => {
    const jan = new Date(Date.UTC(2026, 0, 14, 15, 0, 0));
    expect(sessionTimes("NASDAQ", jan)?.open.toISOString()).toBe(
      "2026-01-14T14:30:00.000Z",
    );
  });

  it("is null for 24/7 and unknown venues", () => {
    expect(sessionTimes("CRYPTO", wed(3))).toBeNull();
    expect(sessionTimes("NOPE", wed(3))).toBeNull();
  });
});

describe("exchange holidays (2026-11-27)", () => {
  it("closes the US markets on Christmas Day", () => {
    const xmas = new Date(Date.UTC(2026, 11, 25, 16, 0, 0)); // 11:00 ET
    const s = sessionFor("NYSE", xmas);
    expect(s.state).toBe("closed");
    expect(s.label).toBe("Closed · Christmas Day");
  });

  it("closes early the day after Thanksgiving", () => {
    // 17:00Z = 12:00 ET: open, early close; 18:30Z = 13:30 ET: closed for the day.
    expect(sessionFor("NASDAQ", new Date(Date.UTC(2026, 10, 27, 17, 0))).label).toBe(
      "Open · early close",
    );
    expect(sessionFor("NASDAQ", new Date(Date.UTC(2026, 10, 27, 18, 30))).state).toBe(
      "post",
    );
    const times = sessionTimes("NASDAQ", new Date(Date.UTC(2026, 10, 27, 15, 0)));
    expect(times?.close.toISOString()).toBe("2026-11-27T18:00:00.000Z");
  });

  it("closes the UAE exchanges on National Day, by Gulf local date", () => {
    const dec2 = new Date(Date.UTC(2026, 11, 2, 8, 0, 0)); // 12:00 Dubai, Wednesday
    expect(sessionFor("DFM", dec2).label).toBe("Closed · UAE National Day");
    expect(sessionFor("ADX", dec2).state).toBe("closed");
  });

  it("leaves ordinary trading days alone", () => {
    expect(sessionFor("NASDAQ", wed(15)).label).toBe("Open");
  });
});
