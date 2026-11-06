/**
 * GCC listed-company master list (Phase 5). Reference data only — NO prices here.
 *
 * This is a SEED roster of well-known QSE (Qatar Stock Exchange) constituents with
 * their English name and sector (accurate public reference data). Fields we do not
 * hold are left undefined and marked [CHECK] rather than invented:
 *   - nameAr (Arabic name), isin, website, profile → owner to supply/verify.
 *   - Tadawul / ADX / DFM rosters → add once verified (structure is ready).
 *
 * A company is "enabled" (indexable, priced) only when a real quote exists for it
 * in the cache (see lib/market/gcc.ts). With no GCC data provider configured, the
 * pages render profile-only and noindex — never an invented price.
 */

export type GccExchangeId = "qse" | "tadawul" | "adx" | "dfm";

export interface GccExchange {
  id: GccExchangeId;
  name: string;
  shortName: string;
  country: string;
  currency: string;
}

export const GCC_EXCHANGES: GccExchange[] = [
  {
    id: "qse",
    name: "Qatar Stock Exchange",
    shortName: "QSE",
    country: "Qatar",
    currency: "QAR",
  },
  {
    id: "tadawul",
    name: "Saudi Exchange (Tadawul)",
    shortName: "Tadawul",
    country: "Saudi Arabia",
    currency: "SAR",
  },
  {
    id: "adx",
    name: "Abu Dhabi Securities Exchange",
    shortName: "ADX",
    country: "UAE",
    currency: "AED",
  },
  {
    id: "dfm",
    name: "Dubai Financial Market",
    shortName: "DFM",
    country: "UAE",
    currency: "AED",
  },
];

export interface GccCompany {
  /** Display/provider symbol (QSE ticker code). */
  symbol: string;
  exchange: GccExchangeId;
  nameEn: string;
  /** Arabic name — [CHECK]: owner to supply. */
  nameAr?: string;
  sector: string;
  /** ISIN — [CHECK]: owner to supply. */
  isin?: string;
  website?: string;
  /** One-line factual profile — [CHECK]: owner to supply/verify (no invented facts). */
  profile?: string;
}

/** Seed QSE roster (well-known constituents; name + sector verified public data). */
export const GCC_COMPANIES: GccCompany[] = [
  { symbol: "QNBK", exchange: "qse", nameEn: "Qatar National Bank", sector: "Banks" },
  { symbol: "QIBK", exchange: "qse", nameEn: "Qatar Islamic Bank", sector: "Banks" },
  { symbol: "MARK", exchange: "qse", nameEn: "Masraf Al Rayan", sector: "Banks" },
  {
    symbol: "CBQK",
    exchange: "qse",
    nameEn: "Commercial Bank of Qatar",
    sector: "Banks",
  },
  { symbol: "DHBK", exchange: "qse", nameEn: "Doha Bank", sector: "Banks" },
  {
    symbol: "QIIK",
    exchange: "qse",
    nameEn: "Qatar International Islamic Bank",
    sector: "Banks",
  },
  {
    symbol: "IQCD",
    exchange: "qse",
    nameEn: "Industries Qatar",
    sector: "Industrials",
  },
  {
    symbol: "MPHC",
    exchange: "qse",
    nameEn: "Mesaieed Petrochemical Holding",
    sector: "Materials",
  },
  {
    symbol: "QAMC",
    exchange: "qse",
    nameEn: "Qatar Aluminium Manufacturing",
    sector: "Materials",
  },
  {
    symbol: "IGRD",
    exchange: "qse",
    nameEn: "Estithmar Holding",
    sector: "Industrials",
  },
  {
    symbol: "QEWS",
    exchange: "qse",
    nameEn: "Qatar Electricity & Water",
    sector: "Utilities",
  },
  { symbol: "ORDS", exchange: "qse", nameEn: "Ooredoo", sector: "Telecommunications" },
  {
    symbol: "QGTS",
    exchange: "qse",
    nameEn: "Qatar Gas Transport (Nakilat)",
    sector: "Transportation",
  },
  { symbol: "GWCS", exchange: "qse", nameEn: "Gulf Warehousing", sector: "Logistics" },
  {
    symbol: "QFLS",
    exchange: "qse",
    nameEn: "Qatar Fuel (WOQOD)",
    sector: "Energy Distribution",
  },
  {
    symbol: "MERS",
    exchange: "qse",
    nameEn: "Al Meera Consumer Goods",
    sector: "Consumer Staples",
  },
  { symbol: "QATI", exchange: "qse", nameEn: "Qatar Insurance", sector: "Insurance" },
  {
    symbol: "BRES",
    exchange: "qse",
    nameEn: "Barwa Real Estate",
    sector: "Real Estate",
  },
  {
    symbol: "UDCD",
    exchange: "qse",
    nameEn: "United Development",
    sector: "Real Estate",
  },
  {
    symbol: "QLMI",
    exchange: "qse",
    nameEn: "QLM Life & Medical Insurance",
    sector: "Insurance",
  },
];
