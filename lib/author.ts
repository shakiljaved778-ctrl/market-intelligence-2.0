import { SITE_URL } from "./site";

/**
 * Editorial author entity (Phase 4 E-E-A-T). One source of truth for the byline,
 * the /author page and the Person JSON-LD. Fields the owner left blank are marked
 * CHECK so they're easy to find and fill before launch.
 */
export interface Author {
  slug: string;
  name: string;
  role: string;
  /** 2–3 line bio. CHECK: confirm/replace before launch. */
  bio: string;
  /** Public editorial contact. */
  email: string;
  /** LinkedIn profile URL, or null until provided. CHECK. */
  linkedin: string | null;
  /** Optional headshot path under /public, or null. */
  photo: string | null;
}

export const EDITOR: Author = {
  slug: "shakil-javed",
  name: "Shakil Javed",
  role: "Founder & Editor",
  // CHECK: replace with the real 2–3 line bio before launch.
  bio: "Shakil Javed is the founder and editor of Mizaan Intelligence, which brings signal-ranked market news and data to global and GCC investors. [CHECK: add background — e.g. years in GCC banking, qualifications, Doha base.]",
  email: "editor@mizaan.tech",
  linkedin: null, // CHECK: add the LinkedIn profile URL.
  photo: null,
};

export function authorUrl(a: Author = EDITOR): string {
  return `${SITE_URL}/author/${a.slug}`;
}

/** sameAs links for the author Person schema (LinkedIn when present). */
export function authorSameAs(a: Author = EDITOR): string[] {
  return a.linkedin ? [a.linkedin] : [];
}
