/**
 * KV store abstraction (§4). Two backends:
 *   - In-memory (default / fixture mode) so the app boots with ZERO keys (§2).
 *   - Vercel KV via its Upstash-compatible REST API when KV_REST_API_URL and
 *     KV_REST_API_TOKEN are set.
 *
 * Nothing outside this module knows which backend is live.
 */

export interface KvStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Set only if absent; returns true if the caller acquired the key (stampede lock). */
  setNx(key: string, value: string, ttlSeconds: number): Promise<boolean>;
}

class MemoryStore implements KvStore {
  private map = new Map<string, { value: string; expiresAt: number }>();

  private live(key: string): { value: string; expiresAt: number } | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return null;
    }
    return entry;
  }

  async get(key: string): Promise<string | null> {
    return this.live(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.map.delete(key);
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.live(key)) return false;
    this.map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  }
}

/** Vercel KV / Upstash Redis REST backend. */
class RestStore implements KvStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async command(parts: (string | number)[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parts),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`KV command failed: ${res.status}`);
    }
    const json = (await res.json()) as { result?: unknown };
    return json.result;
  }

  async get(key: string): Promise<string | null> {
    const result = await this.command(["GET", key]);
    return typeof result === "string" ? result : null;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.command(["SET", key, value, "EX", ttlSeconds]);
  }

  async del(key: string): Promise<void> {
    await this.command(["DEL", key]);
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.command(["SET", key, value, "EX", ttlSeconds, "NX"]);
    return result === "OK";
  }
}

let singleton: KvStore | null = null;

export function getKvStore(): KvStore {
  if (singleton) return singleton;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  singleton = url && token ? new RestStore(url, token) : new MemoryStore();
  return singleton;
}

/** Test seam: force a fresh in-memory store. */
export function __resetKvStoreForTests(store?: KvStore): void {
  singleton = store ?? new MemoryStore();
}
