import { describe, expect, it } from "vitest";
import { sessionFor } from "./session";

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

  it("treats GCC exchanges as EOD-only and always delayed (§6)", () => {
    const s = sessionFor("QSE", wed(9));
    expect(s.state).toBe("eod");
    expect(s.delayed).toBe(true);
  });

  it("returns a safe default for an unknown exchange", () => {
    expect(sessionFor(null, wed(15)).state).toBe("closed");
  });
});
