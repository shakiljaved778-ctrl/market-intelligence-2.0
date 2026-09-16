import { describe, expect, it } from "vitest";
import { COOLDOWN_MS, ProviderRegistry } from "./registry";
import type {
  Candle,
  Capability,
  CompanyProfile,
  MarketDataProvider,
  Quote,
  SymbolMatch,
} from "./types";

function makeQuote(symbol: string, provider: string): Quote {
  return {
    symbol,
    priceUsd: 100,
    nativePrice: null,
    nativeCurrency: "USD",
    fxRateUsed: 1,
    change: 0,
    changePct: 0,
    open: null,
    high: null,
    low: null,
    prevClose: null,
    volume: null,
    marketCapUsd: null,
    provider,
    dataDelayMinutes: 0,
    asOf: "2026-09-16T00:00:00.000Z",
  };
}

class FakeProvider implements MarketDataProvider {
  quoteCalls = 0;
  constructor(
    readonly id: string,
    private readonly behaviour: "answer" | "null" | "throw",
    readonly capabilities: readonly Capability[] = ["quote"],
  ) {}
  readonly budget = {};
  isConfigured(): boolean {
    return true;
  }
  async quote(symbol: string): Promise<Quote | null> {
    this.quoteCalls += 1;
    if (this.behaviour === "throw") throw new Error(`${this.id} down`);
    if (this.behaviour === "null") return null;
    return makeQuote(symbol, this.id);
  }
  async candles(): Promise<Candle[]> {
    return [];
  }
  async profile(): Promise<CompanyProfile | null> {
    return null;
  }
  async search(): Promise<SymbolMatch[]> {
    return [];
  }
}

describe("ProviderRegistry", () => {
  it("fails over to the next provider when one throws", async () => {
    const bad = new FakeProvider("bad", "throw");
    const good = new FakeProvider("good", "answer");
    const registry = new ProviderRegistry([bad, good]);

    const quote = await registry.quote("AAPL");
    expect(quote?.provider).toBe("good");
    expect(bad.quoteCalls).toBe(1);
  });

  it("treats null as 'cannot answer' and skips without tripping the breaker", async () => {
    const skip = new FakeProvider("skip", "null");
    const good = new FakeProvider("good", "answer");
    const registry = new ProviderRegistry([skip, good]);

    const quote = await registry.quote("AAPL");
    expect(quote?.provider).toBe("good");
    expect(registry.breakerState("skip").consecutiveFailures).toBe(0);
    expect(registry.breakerState("skip").openUntil).toBe(0);
  });

  it("opens the breaker after 3 consecutive failures, then half-opens after cooldown", async () => {
    let clock = 0;
    const bad = new FakeProvider("bad", "throw");
    const registry = new ProviderRegistry([bad], () => clock);

    // 3 failures trip the breaker.
    for (let i = 0; i < 3; i += 1) await registry.quote("AAPL");
    expect(registry.breakerState("bad").openUntil).toBe(COOLDOWN_MS);
    const callsAfterTrip = bad.quoteCalls;

    // During cooldown the provider is not tried at all.
    clock = COOLDOWN_MS - 1;
    await registry.quote("AAPL");
    expect(bad.quoteCalls).toBe(callsAfterTrip);

    // After cooldown, a single half-open trial is allowed.
    clock = COOLDOWN_MS + 1;
    await registry.quote("AAPL");
    expect(bad.quoteCalls).toBe(callsAfterTrip + 1);
  });

  it("closes the breaker again once a provider recovers", async () => {
    let clock = 0;
    const flaky = new FakeProvider("flaky", "throw");
    const registry = new ProviderRegistry([flaky], () => clock);
    for (let i = 0; i < 3; i += 1) await registry.quote("AAPL");

    // Recover, advance past cooldown, half-open trial succeeds → breaker closes.
    (flaky as unknown as { behaviour: string }).behaviour = "answer";
    clock = COOLDOWN_MS + 1;
    const quote = await registry.quote("AAPL");
    expect(quote?.provider).toBe("flaky");
    expect(registry.breakerState("flaky").openUntil).toBe(0);
    expect(registry.breakerState("flaky").consecutiveFailures).toBe(0);
  });
});
