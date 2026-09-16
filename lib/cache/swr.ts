import { getKvStore } from "./store";

/**
 * Stale-while-revalidate cache (§6): serve stale instantly, refresh in the
 * background, never block a render on a vendor. A stampede lock ensures only
 * one refresh runs for a given key.
 *
 * Cached under a hard TTL well beyond the soft freshness window, so a stale
 * value stays available to serve while a single refresher repopulates it.
 */

interface Envelope<T> {
  /** The cached value. */
  v: T;
  /** Epoch ms until which the value is considered fresh. */
  f: number;
}

const STALE_GRACE_MULTIPLIER = 12;

function lockKey(key: string): string {
  return `swr:lock:${key}`;
}

export interface SwrResult<T> {
  value: T;
  /** How the value was produced — useful in tests and for observability. */
  state: "fresh" | "stale" | "miss";
}

export async function swr<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<SwrResult<T>> {
  const store = getKvStore();
  const raw = await store.get(key);

  if (raw !== null) {
    const env = JSON.parse(raw) as Envelope<T>;
    if (Date.now() < env.f) {
      return { value: env.v, state: "fresh" };
    }
    // Stale: return immediately, refresh in the background under a lock.
    void refreshUnderLock(key, ttlSeconds, fetcher);
    return { value: env.v, state: "stale" };
  }

  // Miss: block on the fetch (first-ever read for this key), then cache.
  const value = await fetcher();
  await write(key, ttlSeconds, value);
  return { value, state: "miss" };
}

async function write<T>(key: string, ttlSeconds: number, value: T): Promise<void> {
  const store = getKvStore();
  const env: Envelope<T> = { v: value, f: Date.now() + ttlSeconds * 1000 };
  await store.set(key, JSON.stringify(env), ttlSeconds * STALE_GRACE_MULTIPLIER);
}

async function refreshUnderLock<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<void> {
  const store = getKvStore();
  const acquired = await store.setNx(lockKey(key), "1", Math.max(ttlSeconds, 10));
  if (!acquired) return; // another worker is already refreshing
  try {
    const value = await fetcher();
    await write(key, ttlSeconds, value);
  } catch {
    // Swallow: the stale value already served; next read retries the refresh.
  } finally {
    await store.del(lockKey(key));
  }
}
