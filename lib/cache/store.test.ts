import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetKvStoreForTests, getKvStore } from "./store";

describe("MemoryStore (fixture-mode KV backend)", () => {
  beforeEach(() => __resetKvStoreForTests());

  it("round-trips a value", async () => {
    const kv = getKvStore();
    await kv.set("k", "v", 60);
    expect(await kv.get("k")).toBe("v");
  });

  it("expires values after the TTL", async () => {
    vi.useFakeTimers();
    try {
      const kv = getKvStore();
      await kv.set("k", "v", 1);
      vi.advanceTimersByTime(2000);
      expect(await kv.get("k")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("setNx is a single-winner lock (stampede protection)", async () => {
    const kv = getKvStore();
    expect(await kv.setNx("lock", "1", 60)).toBe(true);
    expect(await kv.setNx("lock", "1", 60)).toBe(false);
    await kv.del("lock");
    expect(await kv.setNx("lock", "1", 60)).toBe(true);
  });
});
