import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { WireCluster } from "@/lib/news/read";

/**
 * Editor's Pick — promote ONE real story that is already on the wire to the
 * homepage hero, overriding the automatic ranking.
 *
 * Rules:
 *  - A pick names an exact story `slug`. There is no keyword matching: a rule
 *    like "any title containing X" pinned whatever happened to match.
 *  - A pick EXPIRES. It applies only while the story is younger than
 *    `FEATURED_MAX_AGE_HOURS` (72), and never past its optional `until` time.
 *  - If no current pick matches a story on the wire, the hero is simply the
 *    top-ranked story.
 */
const CONTENT_DIR = join(process.cwd(), "content");

export const FEATURED_MAX_AGE_HOURS = 72;

const PickSchema = z.object({
  label: z.string().default("Editor's pick"),
  /** Exact cluster slug of the story to promote. */
  slug: z.string().min(1),
  /** Optional ISO time after which the pick stops applying. */
  until: z.string().optional(),
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

export interface Featured {
  cluster: WireCluster;
  label: string;
}

/** Pure: apply pick rules to the wire at time `now`. */
export function applyPicks(
  picks: { label: string; slug: string; until?: string }[],
  clusters: WireCluster[],
  now: number = Date.now(),
): Featured | null {
  for (const rule of picks) {
    if (rule.until) {
      const until = Date.parse(rule.until);
      if (!Number.isFinite(until) || now >= until) continue;
    }
    const hit = clusters.find((c) => c.slug === rule.slug);
    if (!hit) continue;
    const age = now - Date.parse(hit.eventTime);
    if (!Number.isFinite(age) || age > FEATURED_MAX_AGE_HOURS * 3_600_000) continue;
    return { cluster: hit, label: rule.label };
  }
  return null;
}

/** The editor's pick for the hero, or null when no current pick applies. */
export function pickFeatured(clusters: WireCluster[]): Featured | null {
  return applyPicks(rules(), clusters);
}
