import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata = { title: "Methodology" };

export default function MethodologyPage() {
  return (
    <PagePlaceholder title="Methodology" phase="Phase 6 · Written in full">
      Where the data comes from, how clustering works, how the importance score is
      calculated, what &ldquo;computed&rdquo; means, and what delays apply. V1 content
      is computed deterministically from market data — it is not AI-written analysis.
    </PagePlaceholder>
  );
}
