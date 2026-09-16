import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata = { title: "Markets" };

export default function MarketsPage() {
  return (
    <PagePlaceholder title="Markets" phase="Phase 3 · Market surfaces">
      Cross-asset overview with sector heatmap and per-exchange session clocks. Global
      exchanges carry the live layer; GCC exchanges appear in a clearly labelled
      end-of-day panel. Screener with a Shariah-compliance filter lands here too.
    </PagePlaceholder>
  );
}
