import { swr } from "@/lib/cache/swr";

/**
 * robots.txt honoured INSIDE the fetcher (§10) — not around it. Every ingest
 * fetch first checks that our user-agent is allowed the path. Fail-closed on a
 * disallow; fail-open only when robots.txt is absent/unreachable (the internet
 * convention), which we cache to avoid hammering the host.
 */
const UA = "MizanBot";

interface RobotsRules {
  disallow: string[];
}

async function fetchRobots(origin: string): Promise<RobotsRules> {
  const { value } = await swr(`robots:${origin}`, 24 * 60 * 60, async () => {
    try {
      const res = await fetch(`${origin}/robots.txt`, { cache: "no-store" });
      if (!res.ok) return { disallow: [] };
      return parseRobots(await res.text());
    } catch {
      return { disallow: [] };
    }
  });
  return value;
}

/** Minimal parser: rules under `User-agent: *` or our UA. */
export function parseRobots(text: string): RobotsRules {
  const lines = text.split(/\r?\n/);
  const disallow: string[] = [];
  let applies = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [field, ...rest] = line.split(":");
    const key = (field ?? "").trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      applies = val === "*" || val.toLowerCase() === UA.toLowerCase();
    } else if (key === "disallow" && applies && val) {
      disallow.push(val);
    }
  }
  return { disallow };
}

export function pathAllowed(rules: RobotsRules, pathname: string): boolean {
  return !rules.disallow.some((rule) => rule !== "" && pathname.startsWith(rule));
}

/** Is this URL allowed to be fetched under robots.txt? */
export async function isAllowed(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const rules = await fetchRobots(u.origin);
    return pathAllowed(rules, u.pathname);
  } catch {
    return false; // malformed URL → do not fetch
  }
}
