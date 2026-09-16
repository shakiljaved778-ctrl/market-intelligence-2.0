import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata = { title: "Economy" };

export default function EconomyPage() {
  return (
    <PagePlaceholder title="Economy" phase="Phase 5 · Macro">
      FRED and World Bank macro dashboard, yield curve, and an economic and earnings
      calendar with consensus versus actual.
    </PagePlaceholder>
  );
}
