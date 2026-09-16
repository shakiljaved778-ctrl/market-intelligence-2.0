import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata = { title: "News" };

export default function NewsPage() {
  return (
    <PagePlaceholder title="The wire" phase="Phase 4 · Curation engine">
      Clusters ordered by importance × recency, filterable by topic, region and ticker.
      Every row shows its source count — the number is the ranking, made visible.
    </PagePlaceholder>
  );
}
