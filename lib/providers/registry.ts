import type {
  Candle,
  Capability,
  CompanyProfile,
  MarketDataProvider,
  Quote,
  Range,
  SymbolMatch,
} from "./types";

/**
 * ProviderRegistry (§6): resolves each request to the cheapest capable provider
 * with budget remaining, with ordered failover and a circuit breaker
 * (3 consecutive failures → 5-minute cooldown → half-open retry).
 *
 * A provider returning `null`/`[]` means "I can't answer this" (e.g. a symbol
 * it doesn't cover) — the registry moves on WITHOUT penalising the breaker.
 * A thrown error is a real failure and trips the breaker.
 */

export const FAILURE_THRESHOLD = 3;
export const COOLDOWN_MS = 5 * 60 * 1000;

interface BreakerState {
  consecutiveFailures: number;
  openUntil: number; // epoch ms; 0 = closed
  halfOpen: boolean;
}

export class ProviderRegistry {
  private breakers = new Map<string, BreakerState>();

  constructor(
    private readonly providers: readonly MarketDataProvider[],
    private readonly now: () => number = Date.now,
  ) {}

  private breaker(id: string): BreakerState {
    let b = this.breakers.get(id);
    if (!b) {
      b = { consecutiveFailures: 0, openUntil: 0, halfOpen: false };
      this.breakers.set(id, b);
    }
    return b;
  }

  /** Is this provider allowed to be tried right now? */
  private available(id: string): boolean {
    const b = this.breaker(id);
    if (b.openUntil === 0) return true;
    if (this.now() >= b.openUntil) {
      // Cooldown elapsed → allow a single half-open trial.
      b.halfOpen = true;
      b.openUntil = 0;
      return true;
    }
    return false;
  }

  private recordSuccess(id: string): void {
    const b = this.breaker(id);
    b.consecutiveFailures = 0;
    b.openUntil = 0;
    b.halfOpen = false;
  }

  private recordFailure(id: string): void {
    const b = this.breaker(id);
    b.consecutiveFailures += 1;
    if (b.halfOpen || b.consecutiveFailures >= FAILURE_THRESHOLD) {
      b.openUntil = this.now() + COOLDOWN_MS;
      b.halfOpen = false;
      b.consecutiveFailures = FAILURE_THRESHOLD;
    }
  }

  /** Ordered providers that declare `cap`, are configured, and are not tripped. */
  private candidates(cap: Capability): MarketDataProvider[] {
    return this.providers.filter(
      (p) => p.capabilities.includes(cap) && p.isConfigured() && this.available(p.id),
    );
  }

  private async resolve<T>(
    cap: Capability,
    op: (p: MarketDataProvider) => Promise<T | null>,
    isAnswer: (value: T | null) => boolean,
  ): Promise<T | null> {
    for (const provider of this.candidates(cap)) {
      try {
        const value = await op(provider);
        this.recordSuccess(provider.id);
        if (isAnswer(value)) return value;
        // null/empty: provider can't answer — try the next without penalty.
      } catch {
        this.recordFailure(provider.id);
      }
    }
    return null;
  }

  quote(symbol: string): Promise<Quote | null> {
    return this.resolve<Quote>(
      "quote",
      (p) => p.quote(symbol),
      (v) => v !== null,
    );
  }

  profile(symbol: string): Promise<CompanyProfile | null> {
    return this.resolve<CompanyProfile>(
      "profile",
      (p) => p.profile(symbol),
      (v) => v !== null,
    );
  }

  async candles(symbol: string, range: Range): Promise<Candle[]> {
    const result = await this.resolve<Candle[]>(
      "candles",
      (p) => p.candles(symbol, range),
      (v) => Array.isArray(v) && v.length > 0,
    );
    return result ?? [];
  }

  async search(q: string): Promise<SymbolMatch[]> {
    const seen = new Set<string>();
    const merged: SymbolMatch[] = [];
    for (const provider of this.candidates("search")) {
      try {
        const matches = await provider.search(q);
        this.recordSuccess(provider.id);
        for (const m of matches) {
          if (!seen.has(m.symbol)) {
            seen.add(m.symbol);
            merged.push(m);
          }
        }
      } catch {
        this.recordFailure(provider.id);
      }
    }
    return merged;
  }

  /** Introspection for tests / diagnostics. */
  breakerState(id: string): Readonly<BreakerState> {
    return { ...this.breaker(id) };
  }
}
