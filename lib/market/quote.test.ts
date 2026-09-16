import { beforeEach, describe, expect, it } from "vitest";
import { __resetKvStoreForTests } from "@/lib/cache/store";
import { ProviderRegistry } from "@/lib/providers/registry";
import { FixtureProvider } from "@/lib/providers/fixture";
import { getQuote } from "./quote";

describe("getQuote service", () => {
  beforeEach(() => __resetKvStoreForTests());

  it("serves AAPL from cache on the second call (§6 gate)", async () => {
    // Wrap the fixture provider so we can count how often the registry is hit.
    const fixture = new FixtureProvider();
    let registryHits = 0;
    const registry = new ProviderRegistry([fixture]);
    const counting = new Proxy(registry, {
      get(target, prop, receiver) {
        if (prop === "quote") {
          return (symbol: string) => {
            registryHits += 1;
            return target.quote(symbol);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    const first = await getQuote("AAPL", counting);
    const second = await getQuote("AAPL", counting);

    expect(first?.symbol).toBe("AAPL");
    expect(second?.symbol).toBe("AAPL");
    expect(registryHits).toBe(1); // second read came from cache
  });

  it("answers from fixtures with zero keys configured (§2)", async () => {
    const registry = new ProviderRegistry([new FixtureProvider()]);
    const quote = await getQuote("MSFT", registry);
    expect(quote?.priceUsd).toBeGreaterThan(0);
    expect(quote?.provider).toBe("fixture");
  });

  it("returns null for an unknown symbol", async () => {
    const registry = new ProviderRegistry([new FixtureProvider()]);
    expect(await getQuote("NOPE", registry)).toBeNull();
  });
});
