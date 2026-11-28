/**
 * SEC EDGAR filing feeds (owner request, 2026-11-28: "add SEC EDGAR as a deal
 * source"). EDGAR's "latest filings" Atom feed titles each entry with the form
 * and filer, e.g. "S-1 - ACME HOLDINGS INC (0001234567) (Filer)". That is an
 * index line, not a headline, so this turns it into a plain factual one from the
 * same facts — the form, the company — and never adds anything the filing
 * index does not state. U.S. government data, public domain.
 */
export const EDGAR_SOURCE_PREFIX = "sec-edgar-";

/** True for a feed of individual filings (each entry a different company). */
export function isFilingFeed(sourceId: string): boolean {
  return sourceId.startsWith(EDGAR_SOURCE_PREFIX);
}

const SUFFIXES: Record<string, string> = {
  INC: "Inc.",
  "INC.": "Inc.",
  CORP: "Corp.",
  "CORP.": "Corp.",
  CO: "Co.",
  LTD: "Ltd.",
  "LTD.": "Ltd.",
  LLC: "LLC",
  LP: "LP",
  PLC: "plc",
  NV: "N.V.",
  SA: "S.A.",
  AG: "AG",
  SE: "SE",
  III: "III",
  II: "II",
  IV: "IV",
};

/** "ACME HOLDINGS INC" → "Acme Holdings Inc."; mixed-case names are kept. */
export function tidyCompanyName(raw: string): string {
  const name = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*\/[A-Z]{2}\/?$/, "");
  if (name !== name.toUpperCase()) return name;
  return name
    .split(" ")
    .map(
      (w) =>
        SUFFIXES[w] ??
        (w.length <= 3 && /^[A-Z&]+$/.test(w) && !/[AEIOU]/.test(w)
          ? w
          : w.charAt(0) + w.slice(1).toLowerCase()),
    )
    .join(" ");
}

const FORMS: Record<string, string> = {
  "S-1": "Form S-1",
  "F-1": "Form F-1",
};

/**
 * PURE: the headline and dek for one EDGAR index entry, or null to skip it
 * (amendments, other forms, or a title that does not parse).
 */
export function edgarFilingItem(
  title: string,
): { headline: string; dek: string } | null {
  const m =
    /^([A-Z0-9-]+)(\/A)?\s+-\s+(.+?)\s+\((\d{6,10})\)\s+\((Filer|Subject)\)\s*$/.exec(
      title.trim(),
    );
  if (!m) return null;
  const [, form, amendment, company, , role] = m;
  if (amendment || role !== "Filer" || !form || !FORMS[form] || !company) return null;
  const name = tidyCompanyName(company);
  return {
    headline: `${name} files ${form} registration for a US public offering`,
    dek: `${name} filed a registration statement (${FORMS[form]}) with the U.S. Securities and Exchange Commission. The filing on EDGAR has the offering details.`,
  };
}

/** SEC asks automated tools to identify themselves with a contact (fair-access policy). */
export const EDGAR_USER_AGENT = "MizaanBot (Mizaan Intelligence; editor@mizaan.tech)";
