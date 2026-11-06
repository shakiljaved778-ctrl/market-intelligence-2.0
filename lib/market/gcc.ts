import {
  GCC_COMPANIES,
  GCC_EXCHANGES,
  type GccCompany,
  type GccExchange,
  type GccExchangeId,
} from "@/content/gcc-companies";

/**
 * GCC company helpers (Phase 5). Reference-data lookups only — price data comes
 * from the normal read path (`readQuote`), which returns a real cached/DB quote
 * or null for these symbols (they are not in the fixture universe, so there is no
 * invented fallback). A company is "priced"/indexable only when that quote exists.
 */

const BY_SYMBOL = new Map(GCC_COMPANIES.map((c) => [c.symbol.toUpperCase(), c]));

export function gccCompany(symbol: string): GccCompany | null {
  return BY_SYMBOL.get(symbol.toUpperCase()) ?? null;
}

export function isGccSymbol(symbol: string): boolean {
  return BY_SYMBOL.has(symbol.toUpperCase());
}

export function exchangeMeta(id: string): GccExchange | null {
  return GCC_EXCHANGES.find((e) => e.id === id) ?? null;
}

export function gccByExchange(id: GccExchangeId): GccCompany[] {
  return GCC_COMPANIES.filter((c) => c.exchange === id).sort((a, b) =>
    a.nameEn.localeCompare(b.nameEn),
  );
}

/** Up to `n` sector peers on the same exchange (excluding the company itself). */
export function gccSectorPeers(company: GccCompany, n = 5): GccCompany[] {
  return GCC_COMPANIES.filter(
    (c) =>
      c.symbol !== company.symbol &&
      c.exchange === company.exchange &&
      c.sector === company.sector,
  ).slice(0, n);
}
