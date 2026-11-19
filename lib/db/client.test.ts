import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DbUnavailableError,
  READ_BREAKER_MS,
  READ_RETRY_TIMEOUT_MS,
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
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the read's value when it answers in time", async () => {
    await expect(dbRead("ok", async () => 42)).resolves.toBe(42);
  });

  it("passes the read's own error through, without a retry or the breaker", async () => {
    const fn = vi.fn(async (): Promise<number> => {
      throw new Error("syntax error");
    });
    await expect(dbRead("boom", fn)).rejects.toThrow("syntax error");
    expect(fn).toHaveBeenCalledOnce();
    await expect(dbRead("next", async () => 1)).resolves.toBe(1);
  });

  it("retries once after a timeout — a cold connection does not empty the page", async () => {
    let calls = 0;
    const fn = vi.fn(() => {
      calls += 1;
      // First attempt stalls (database waking up); the retry answers.
      return calls === 1 ? new Promise<number>(() => {}) : Promise.resolve(7);
    });
    const read = dbRead("cold", fn);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS + 1);
    await expect(read).resolves.toBe(7);
    expect(fn).toHaveBeenCalledTimes(2);
    // The breaker did not open: the next read runs.
    await expect(dbRead("after", async () => 1)).resolves.toBe(1);
  });

  it("retries once after a dropped connection", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls === 1)
        throw Object.assign(new Error("ended"), { code: "CONNECTION_ENDED" });
      return 3;
    });
    await expect(dbRead("dropped", fn)).resolves.toBe(3);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("fails after a stalled retry, then skips reads until the breaker resets", async () => {
    const stalled = dbRead("stalled", () => new Promise<number>(() => {}));
    const assertion = expect(stalled).rejects.toBeInstanceOf(DbUnavailableError);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS + READ_RETRY_TIMEOUT_MS + 1);
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

  it("turns two dropped connections into DbUnavailableError", async () => {
    const fn = vi.fn(async (): Promise<number> => {
      throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
    });
    await expect(dbRead("down", fn)).rejects.toBeInstanceOf(DbUnavailableError);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
