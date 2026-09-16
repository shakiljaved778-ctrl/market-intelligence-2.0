/**
 * Embeddings (§9 Stage 3). The clustering algorithm depends only on the
 * `Embedder` interface, so the model is a swappable implementation:
 *
 *  - MiniLmEmbedder: the mandated local `all-MiniLM-L6-v2` (384-dim) via
 *    @xenova/transformers, run in the GitHub Actions runner (no key, no hosted
 *    service). Loaded dynamically so it never enters the Next serving bundle.
 *  - HashEmbedder: a deterministic, offline, dependency-free fallback (also 384
 *    dims) used in tests/CI and whenever the model can't load. It captures token
 *    and character-trigram overlap — enough, with the ticker/entity boost, to
 *    cluster a multi-source event.
 *
 * `getEmbedder()` returns MiniLM when EMBEDDER=minilm (the runner sets this),
 * else the deterministic fallback.
 */
export const EMBED_DIM = 384;

export interface Embedder {
  readonly id: string;
  embed(text: string): Promise<number[]>;
}

function l2normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum) || 1;
  return v.map((x) => x / norm);
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class HashEmbedder implements Embedder {
  readonly id = "hash-384";

  async embed(text: string): Promise<number[]> {
    const vec = new Array<number>(EMBED_DIM).fill(0);
    const clean = text.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
    const tokens = clean.split(/\s+/).filter(Boolean);
    // Word features (weighted) + character trigrams (fuzziness).
    for (const tok of tokens) {
      const idx = hash32(`w:${tok}`) % EMBED_DIM;
      vec[idx] = (vec[idx] ?? 0) + 2;
      for (let i = 0; i < tok.length - 2; i += 1) {
        const g = hash32(`g:${tok.slice(i, i + 3)}`) % EMBED_DIM;
        vec[g] = (vec[g] ?? 0) + 1;
      }
    }
    return l2normalize(vec);
  }
}

type FeatureExtractor = (t: string, o: object) => Promise<{ data: ArrayLike<number> }>;

export class MiniLmEmbedder implements Embedder {
  readonly id = "all-MiniLM-L6-v2";
  private extractor: FeatureExtractor | null = null;

  private async load(): Promise<FeatureExtractor> {
    if (this.extractor) return this.extractor;
    const { pipeline } = (await import("@xenova/transformers")) as unknown as {
      pipeline: (task: string, model: string) => Promise<FeatureExtractor>;
    };
    const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    this.extractor = pipe;
    return pipe;
  }

  async embed(text: string): Promise<number[]> {
    const extractor = await this.load();
    if (!extractor) throw new Error("MiniLM pipeline unavailable");
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }
}

let singleton: Embedder | null = null;

export function getEmbedder(): Embedder {
  if (singleton) return singleton;
  singleton =
    process.env.EMBEDDER === "minilm" ? new MiniLmEmbedder() : new HashEmbedder();
  return singleton;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot; // inputs are L2-normalised
}
