import { readWire } from "@/lib/news/read";
import { rssResponse, rssXml } from "@/lib/rss";
import { SITE_URL as SITE } from "@/lib/site";

// Outbound RSS (§6) — our own ranked wire of computed clusters, latest 50.
export const dynamic = "force-dynamic";

export async function GET() {
  const clusters = (await readWire()).slice(0, 50);
  return rssResponse(
    rssXml({
      title: "Mizaan Intelligence — the wire",
      link: `${SITE}/news`,
      description: "Signal-ranked market and world intelligence. Rankings computed.",
      clusters,
    }),
  );
}
