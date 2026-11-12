import { SITE } from "@/content/site.config";
import { SITE_URL } from "./site";

/**
 * Editorial author entity (Phase 4 E-E-A-T). The byline, the /author page and
 * the Person JSON-LD all read this; the values come from content/site.config.ts.
 */
export interface Author {
  slug: string;
  name: string;
  role: string;
  /** 2–3 line bio. */
  bio: string;
  /** Public editorial contact. */
  email: string;
  /** LinkedIn profile URL, or null until provided. */
  linkedin: string | null;
  /** Optional headshot path under /public, or null. */
  photo: string | null;
}

export const EDITOR: Author = {
  slug: SITE.editor.slug,
  name: SITE.editor.name,
  role: SITE.editor.role,
  // The biography comes from content/site.config.ts. Until the owner supplies
  // one, a single factual sentence stands in — never a placeholder.
  bio:
    SITE.editor.bio ?? `${SITE.editor.name} is the founder and editor of ${SITE.name}.`,
  email: SITE.contact.editorial,
  linkedin: SITE.editor.linkedin,
  photo: SITE.editor.photo,
};

export function authorUrl(a: Author = EDITOR): string {
  return `${SITE_URL}/author/${a.slug}`;
}

/** sameAs links for the author Person schema (LinkedIn when present). */
export function authorSameAs(a: Author = EDITOR): string[] {
  return a.linkedin ? [a.linkedin] : [];
}
