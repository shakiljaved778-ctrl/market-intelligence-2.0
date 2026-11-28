import { describe, expect, it } from "vitest";
import { decideAlert, REALERT_AFTER_MS } from "./health-alert";

const t0 = Date.parse("2026-11-28T08:00:00Z");

describe("stale-data alert decisions", () => {
  it("does not email on a single down reading", () => {
    expect(decideAlert(null, "down", t0).send).toBeNull();
    expect(
      decideAlert({ lastStatus: "ok", alertedAt: null }, "down", t0).send,
    ).toBeNull();
  });

  it("emails on the second down reading in a row, once", () => {
    const first = decideAlert({ lastStatus: "down", alertedAt: null }, "down", t0);
    expect(first.send).toBe("down");
    const again = decideAlert(first.next, "down", t0 + 30 * 60_000);
    expect(again.send).toBeNull();
  });

  it("re-alerts after six hours if still down", () => {
    const state = { lastStatus: "down" as const, alertedAt: t0 };
    expect(decideAlert(state, "down", t0 + REALERT_AFTER_MS).send).toBe("down");
  });

  it("sends one recovery email when ok again, and nothing when never alerted", () => {
    const rec = decideAlert({ lastStatus: "down", alertedAt: t0 }, "ok", t0 + 60_000);
    expect(rec.send).toBe("recovered");
    expect(rec.next.alertedAt).toBeNull();
    expect(decideAlert(rec.next, "ok", t0 + 120_000).send).toBeNull();
  });

  it("keeps an open alert through a degraded reading", () => {
    const d = decideAlert(
      { lastStatus: "down", alertedAt: t0 },
      "degraded",
      t0 + 60_000,
    );
    expect(d.send).toBeNull();
    expect(d.next.alertedAt).toBe(t0);
  });
});
