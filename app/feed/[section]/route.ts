import { allSections, readWire } from "@/lib/news/read";
import { sectionMeta } from "@/lib/curation/section";
import { rssResponse, rssXml } from "@/lib/rss";
import { SITE_URL as SITE } from "@/lib/site";

// Per-section RSS (§6): /feed/markets, /feed/eureka, … — the ranked wire for one
// editorial vertical. 404 for an unknown section.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params;
  if (!allSections().some((s) => s.id === section)) {
    return new Response("Not found", { status: 404 });
  }
  const label = sectionMeta(section).label;
  const clusters = (await readWire({ section })).slice(0, 50);
  return rssResponse(
    rssXml({
      title: `Mizaan Intelligence — ${label}`,
      link: `${SITE}/news/section/${section}`,
      description: `${label}: the ranked ${label} wire from Mizaan Intelligence.`,
      clusters,
    }),
  );
}
