/**
 * Site configuration — the ONE place business details and brand copy live.
 * Nothing here is a secret (secrets belong in environment variables).
 *
 * Fields set to `null` are NOT YET SUPPLIED by the owner. The site hides a null
 * field rather than printing a placeholder, so filling one in is all it takes
 * to publish it. Do not invent values here.
 */
export interface SiteConfig {
  name: string;
  shortName: string;
  /** Brand positioning — do not change without the owner's sign-off. */
  positioning: string;
  /** <title> for the homepage and the default document title. */
  title: string;
  /** Meta description. Must only claim what the site delivers today. */
  description: string;
  /** Open Graph / social description. */
  socialDescription: string;
  /** One-line description under the footer wordmark. */
  footerBlurb: string;
  operator: {
    /** Legal or trading name of the entity that operates the site. */
    name: string | null;
    /** City and country the operator is based in, e.g. "Doha, Qatar". */
    location: string | null;
    /** Company / commercial registration reference, if any. */
    registration: string | null;
  };
  contact: {
    /** Public editorial and corrections address. */
    editorial: string;
    /** General enquiries, if different. */
    general: string | null;
    /** Advertising and partnerships. */
    advertising: string | null;
  };
  editor: {
    slug: string;
    name: string;
    role: string;
    /** 2–3 line biography. */
    bio: string | null;
    linkedin: string | null;
    /** Headshot path under /public. */
    photo: string | null;
  };
  social: {
    linkedin: string | null;
    x: string | null;
    whatsappChannel: string | null;
  };
}

export const SITE: SiteConfig = {
  name: "Mizaan Intelligence",
  shortName: "Mizaan",
  positioning: "GCC and global market intelligence",
  title: "Mizaan Intelligence — GCC and Global Market Intelligence",
  description:
    "GCC and global market intelligence. News ranked by how widely it is covered and how markets moved, with market data that states its source and time. Story summaries are AI-written from cited sources and link to the original.",
  socialDescription:
    "GCC and global market intelligence. Ranked news from cited sources, and market data that states its source and time.",
  footerBlurb:
    "GCC and global market intelligence. Rankings are computed from coverage and price moves; story summaries are AI-written from cited sources.",
  operator: {
    name: null, // TO BE SUPPLIED: legal or trading name
    location: null, // TO BE SUPPLIED: e.g. "Doha, Qatar"
    registration: null, // TO BE SUPPLIED (optional)
  },
  contact: {
    editorial: "editor@mizaan.tech",
    general: null, // TO BE SUPPLIED (optional)
    advertising: null, // TO BE SUPPLIED (optional)
  },
  editor: {
    slug: "shakil-javed",
    name: "Shakil Javed",
    role: "Founder & Editor",
    bio: null, // TO BE SUPPLIED: 2–3 lines
    linkedin: null, // TO BE SUPPLIED
    photo: null,
  },
  social: {
    linkedin: null,
    x: null,
    whatsappChannel: null,
  },
};
