import Link from "next/link";
import { Prose } from "@/components/layout/Prose";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/editorial-policy",
  "Editorial policy",
  "How Mizaan selects, ranks, summarises and reviews stories — our source standards, the role of AI, and our independence.",
);

export default function EditorialPolicyPage() {
  return (
    <Prose eyebrow="how we work" title="Editorial policy">
      <p>
        Mizaan Intelligence is an information and advisory service covering global and
        GCC markets. This page explains how stories reach the wire and who is
        responsible for them.
      </p>

      <h2>Selection and ranking</h2>
      <p>
        Stories are grouped and ranked <strong>deterministically</strong>, by a
        model-free engine — not by an AI. We cluster coverage of the same event across
        independent sources, then rank each cluster by how many distinct outlets cover
        it, the standing of those sources, the size of the related market move and how
        recent it is. The source count <em>is</em> the ranking, made visible. See the{" "}
        <Link href="/methodology">methodology</Link> for the exact weights.
      </p>

      <h2>Summaries and the role of AI</h2>
      <p>
        Each story carries a short, original summary written by an AI model from the
        story&rsquo;s own facts and cited sources. We never store or republish
        third-party article text. Rankings are facts about coverage; summaries are
        interpretation — we keep the two visibly distinct and label the AI content. The{" "}
        <Link href="/ai-disclosure">AI disclosure</Link> says exactly what the model
        does and does not do.
      </p>

      <h2>Source standards</h2>
      <p>
        We ingest only from sources on an explicit allow-list, each with a recorded
        licence note, and we honour each publisher&rsquo;s <code>robots.txt</code>{" "}
        inside the fetcher. Primary sources — regulators, central banks, exchanges and
        official statistics — are weighted above wires and outlets.
      </p>

      <h2>Review and accountability</h2>
      <p>
        The wire is overseen by our editor,{" "}
        <Link href="/author/shakil-javed">Shakil Javed</Link>. Every AI output passes
        through automated guardrails before publication, and we correct material errors
        openly — see <Link href="/corrections">corrections</Link>. To flag something,{" "}
        <Link href="/contact">contact us</Link>.
      </p>

      <h2>Independence and scope</h2>
      <p>
        Mizaan is informational only and does not provide investment advice, custody or
        execution. Market data may be delayed; every price states its delay and source.
        No warranty is made as to accuracy or completeness — always verify against the
        original sources.
      </p>
    </Prose>
  );
}
