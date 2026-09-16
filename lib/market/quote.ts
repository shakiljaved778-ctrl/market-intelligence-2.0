import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { getRegistry, ProviderRegistry } from "@/lib/providers";
import type { Quote } from "@/lib/providers/types";

/**
 * Route-level quote service. Wraps the provider registry in the SWR cache so a
 * page/API request is served from cache and never triggers a vendor call on
 * repeat reads (§6). The registry is injectable for tests.
 */
export async function getQuote(
  symbol: string,
  registry: ProviderRegistry = getRegistry(),
): Promise<Quote | null> {
  const sym = symbol.toUpperCase();
  const { value } = await swr(`market:quote:${sym}`, TTL.quoteLive, () =>
    registry.quote(sym),
  );
  return value;
}
