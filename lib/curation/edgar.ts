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
  if (amendment || role !== "Filer" || !form || !company) return null;
  return filingText(form, company);
}

function filingText(
  form: string,
  company: string,
): { headline: string; dek: string } | null {
  if (!FORMS[form]) return null;
  const name = tidyCompanyName(company);
  return {
    headline: `${name} files ${form} registration for a US public offering`,
    dek: `${name} filed a registration statement (${FORMS[form]}) with the U.S. Securities and Exchange Commission. The filing on EDGAR has the offering details.`,
  };
}

/** SEC asks automated tools to identify themselves with a contact (fair-access policy). */
export const EDGAR_USER_AGENT = "MizaanBot (Mizaan Intelligence; editor@mizaan.tech)";

/*
 * The daily form index (2026-11-28). EDGAR's "latest filings" Atom feed lives
 * under /cgi-bin/, which sec.gov's robots.txt disallows (probe, 28 Nov), so it
 * is never fetched. The daily index under /Archives/ is allowed: one plain-text
 * file per business day listing every filing by form type.
 */
export const EDGAR_INDEX_BASE = "https://www.sec.gov/Archives/edgar/daily-index";

/** URL of the daily form index for a UTC calendar day. */
export function dailyIndexUrl(day: Date): string {
  const y = day.getUTCFullYear();
  const m = day.getUTCMonth() + 1;
  const ymd = `${y}${String(m).padStart(2, "0")}${String(day.getUTCDate()).padStart(2, "0")}`;
  return `${EDGAR_INDEX_BASE}/${y}/QTR${Math.ceil(m / 3)}/form.${ymd}.idx`;
}

export interface FilingEntry {
  headline: string;
  dek: string;
  url: string;
  /** Noon New York time on the filing date: the index gives a date, not a time. */
  publishedAt: string;
}

/**
 * PURE: new S-1 and F-1 registrations from one daily form index. Rows are
 * "Form Type  Company Name  CIK  Date Filed  File Name", columns separated by
 * runs of spaces. Amendments (S-1/A) and other forms are skipped.
 */
export function parseDailyIndex(text: string): FilingEntry[] {
  const out: FilingEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m =
      /^(S-1|F-1)\s{2,}(.+?)\s{2,}(\d{1,10})\s{2,}(\d{8})\s{2,}(edgar\/data\/\S+\.txt)\s*$/.exec(
        line,
      );
    if (!m) continue;
    const [, form, company, cik, date, file] = m as unknown as string[];
    const text2 = filingText(form as string, company as string);
    if (!text2) continue;
    const accession = (file as string)
      .split("/")
      .pop()!
      .replace(/\.txt$/, "");
    const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${accession}-index.htm`;
    const d = date as string;
    out.push({
      ...text2,
      url,
      publishedAt: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T17:00:00Z`,
    });
  }
  return out;
}
