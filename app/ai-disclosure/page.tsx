import Link from "next/link";
import { Prose } from "@/components/layout/Prose";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "/ai-disclosure",
  "AI disclosure",
  "Exactly what AI does and does not do at Mizaan: it writes story summaries from cited sources; it does not rank stories or compute the numbers.",
);

export default function AiDisclosurePage() {
  return (
    <Prose eyebrow="transparency" title="AI disclosure">
      <p>
        We use AI in one specific, labelled way, and we are explicit about its limits.
      </p>

      <h2>What AI does</h2>
      <ul>
        <li>
          Writes the short <strong>summary</strong> on each story — original prose
          synthesised from that story&rsquo;s facts and its cited sources.
        </li>
      </ul>

      <h2>What AI does not do</h2>
      <ul>
        <li>
          It does <strong>not</strong> rank or cluster the news. Rankings and clustering
          are computed deterministically, with no model in the loop.
        </li>
        <li>
          It does <strong>not</strong> compute any market figure. Prices, changes and
          the &ldquo;how it moved&rdquo; recaps are calculated from the underlying data.
        </li>
        <li>
          It does <strong>not</strong> copy source text. Summaries are original; we
          never store or republish third-party article bodies.
        </li>
        <li>
          It does <strong>not</strong> give financial advice.
        </li>
      </ul>

      <h2>Accuracy and verification</h2>
      <p>
        AI-written summaries can contain errors. Each one carries the facts&rsquo; cited
        sources so you can verify it, and we ask that you do. Report anything wrong via{" "}
        <Link href="/corrections">corrections</Link>. For how the rest of the pipeline
        works, see the <Link href="/editorial-policy">editorial policy</Link> and{" "}
        <Link href="/methodology">methodology</Link>.
      </p>
    </Prose>
  );
}
