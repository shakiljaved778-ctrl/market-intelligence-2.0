import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

/**
 * Load the committed, human-editable curation registries (§9, §10). Parsed and
 * Zod-validated at the boundary. These are the reviewable rule files that a
 * deterministic engine beats a model with.
 */
const CONTENT_DIR = join(process.cwd(), "content");

const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  homepage: z.string().optional(),
  feed_url: z.string(),
  kind: z.enum(["rss", "api"]),
  region: z.string().optional(),
  tier: z.enum(["wire", "outlet", "regulator", "primary"]),
  trust_score: z.number(),
  license_note: z.string().min(1), // §10: every source needs an explicit note
  active: z.boolean(),
});
export type SourceConfig = z.infer<typeof SourceSchema>;

const EntitySchema = z.object({
  name: z.string(),
  kind: z.string(),
  aliases: z.array(z.string()).default([]),
});
export type EntityConfig = z.infer<typeof EntitySchema>;

function read(file: string): unknown {
  return parse(readFileSync(join(CONTENT_DIR, file), "utf8"));
}

export function loadSources(): SourceConfig[] {
  const raw = read("sources.yaml") as { sources?: unknown };
  return z.array(SourceSchema).parse(raw.sources ?? []);
}

export function loadEntities(): EntityConfig[] {
  const raw = read("entities.yaml") as { entities?: unknown };
  return z.array(EntitySchema).parse(raw.entities ?? []);
}

export function loadTopics(): Record<string, string[]> {
  const raw = read("topics.yaml") as { topics?: unknown };
  return z.record(z.string(), z.array(z.string())).parse(raw.topics ?? {});
}

export function loadTickers(): Record<string, string[]> {
  const raw = read("tickers.yaml") as { tickers?: unknown };
  return z.record(z.string(), z.array(z.string())).parse(raw.tickers ?? {});
}
