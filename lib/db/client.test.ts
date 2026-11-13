import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DbUnavailableError,
  READ_BREAKER_MS,
  READ_TIMEOUT_MS,
  __resetDbReadBreaker,
  dbRead,
} from "./client";

/**
 * A page must never wait on the database indefinitely: a read that stalls is
 * abandoned after READ_TIMEOUT_MS, and the instance then skips reads for a
 * short while instead of making every later read wait out its own timeout.
 */
describe("dbRead (time-limited page reads)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetDbReadBreaker();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the read's value when it answers in time", async () => {
    await expect(dbRead("ok", async () => 42)).resolves.toBe(42);
  });

  it("passes the read's own error through without tripping the breaker", async () => {
    await expect(
      dbRead("boom", async () => {
        throw new Error("syntax error");
      }),
    ).rejects.toThrow("syntax error");
    await expect(dbRead("next", async () => 1)).resolves.toBe(1);
  });

  it("abandons a stalled read, then skips reads until the breaker resets", async () => {
    const stalled = dbRead("stalled", () => new Promise<number>(() => {}));
    const assertion = expect(stalled).rejects.toBeInstanceOf(DbUnavailableError);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS + 1);
    await assertion;

    // While the breaker is open, reads are skipped immediately.
    const fn = vi.fn(async () => 1);
    await expect(dbRead("skipped", fn)).rejects.toBeInstanceOf(DbUnavailableError);
    expect(fn).not.toHaveBeenCalled();

    // After the breaker window, reads are tried again.
    await vi.advanceTimersByTimeAsync(READ_BREAKER_MS + 1);
    await expect(dbRead("retry", fn)).resolves.toBe(1);
    expect(fn).toHaveBeenCalledOnce();
  });
});
