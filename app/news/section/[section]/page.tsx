import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NewsPage from "@/app/news/page";
import { allSections } from "@/lib/news/read";
import { canonical } from "@/lib/seo";

/**
 * Clean, indexable section route (Phase 3 §2): /news/section/markets renders the
 * same wire as /news?section=markets (which canonicalises here). Reuses the News
 * page exactly, so there is no duplicated UI and the design is identical.
 */
interface Params {
  params: Promise<{ section: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section } = await params;
  const s = allSections().find((x) => x.id === section);
  if (!s) return {};
  return {
    title: `${s.label} news`,
    description: `${s.blurb} Ranking computed from coverage; summaries AI-written from cited sources.`,
    alternates: {
      canonical: canonical(`/news/section/${s.id}`),
      types: { "application/rss+xml": canonical(`/feed/${s.id}`) },
    },
  };
}

export default async function SectionWirePage({ params }: Params) {
  const { section } = await params;
  if (!allSections().some((s) => s.id === section)) notFound();
  return NewsPage({ searchParams: Promise.resolve({ section }) });
}
