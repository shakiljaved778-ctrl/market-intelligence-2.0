import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { getRegistry, ProviderRegistry } from "@/lib/providers";
import { UNIVERSE } from "@/fixtures/universe";
import type { SymbolMatch } from "@/lib/providers/types";

/**
 * Symbol search (§13). User-triggered and cached 24h. Merges provider results
 * (via the registry) with the fixture universe so search works with zero keys.
 */
export async function searchSymbols(
  q: string,
  registry: ProviderRegistry = getRegistry(),
): Promise<SymbolMatch[]> {
  const query = q.trim();
  if (query.length < 1) return [];

  const { value } = await swr(
    `market:search:${query.toLowerCase()}`,
    TTL.searchSymbol,
    () => registry.search(query),
  );

  const upper = query.toUpperCase();
  const local: SymbolMatch[] = UNIVERSE.filter(
    (r) => r.symbol.includes(upper) || r.name.toUpperCase().includes(upper),
  ).map((r) => ({
    symbol: r.symbol,
    name: r.name,
    exchange: r.exchange,
    assetClass: r.assetClass,
  }));

  const seen = new Set<string>();
  const merged: SymbolMatch[] = [];
  for (const m of [...local, ...value]) {
    if (!seen.has(m.symbol)) {
      seen.add(m.symbol);
      merged.push(m);
    }
  }
  return merged.slice(0, 20);
}
