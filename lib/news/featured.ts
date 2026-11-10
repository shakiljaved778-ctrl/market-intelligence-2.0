import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { WireCluster } from "@/lib/news/read";

/**
 * Editor's Pick (§13) — promote a REAL, already-ingested story to the homepage
 * hero, overriding the automatic signal ranking. Rules live in
 * content/featured.yaml and are tried in order; the first that matches a story
 * currently in the wire wins. If none match, the hero falls back to the
 * top-ranked story. We never pin a fabricated story: a rule only promotes a
 * story the pipeline already ingested from a cited source, so the hero leads
 * with this topic the moment such a story is on the wire.
 */
const CONTENT_DIR = join(process.cwd(), "content");

const PickSchema = z.object({
  label: z.string().default("Editor's pick"),
  match: z
    .object({
      /** Promote a story whose title contains ANY of these (case-insensitive). */
      title: z.array(z.string()).optional(),
      /** Restrict to a section id. */
      section: z.string().optional(),
      /** Pin one exact cluster slug. */
      slug: z.string().optional(),
    })
    .default({}),
});
type PickRule = z.infer<typeof PickSchema>;

let cache: PickRule[] | null = null;

function rules(): PickRule[] {
  if (cache) return cache;
  try {
    const raw = parse(readFileSync(join(CONTENT_DIR, "featured.yaml"), "utf8")) as {
      picks?: unknown;
    };
    cache = z.array(PickSchema).parse(raw.picks ?? []);
  } catch {
    cache = [];
  }
  return cache;
}

function hasCriteria(m: PickRule["match"]): boolean {
  return Boolean(m.slug || m.section || (m.title && m.title.length));
}

function matches(c: WireCluster, m: PickRule["match"]): boolean {
  if (!hasCriteria(m)) return false; // an empty rule never pins everything
  if (m.slug && c.slug !== m.slug) return false;
  if (m.section && c.section !== m.section) return false;
  if (m.title && m.title.length) {
    const t = c.title.toLowerCase();
    if (!m.title.some((k) => t.includes(k.toLowerCase()))) return false;
  }
  return true;
}

export interface Featured {
  cluster: WireCluster;
  label: string;
}

/** The editor's pick for the hero, or null when no rule matches the wire. */
export function pickFeatured(clusters: WireCluster[]): Featured | null {
  for (const rule of rules()) {
    const hit = clusters.find((c) => matches(c, rule.match));
    if (hit) return { cluster: hit, label: rule.label };
  }
  return null;
}
