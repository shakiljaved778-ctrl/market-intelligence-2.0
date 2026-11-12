import Link from "next/link";
import { Prose } from "@/components/layout/Prose";
import { OperatorDetails } from "@/components/layout/OperatorDetails";
import { SITE } from "@/content/site.config";
import { canonical } from "@/lib/seo";

export const metadata = {
  title: "About",
  description: `${SITE.name}: ${SITE.positioning}. Who runs it, what it publishes and how to reach the editor.`,
  alternates: { canonical: canonical("/about") },
};

export default function AboutPage() {
  return (
    <Prose eyebrow={SITE.positioning} title={`About ${SITE.name}`}>
      <p>
        <strong>Mizaan</strong> — Arabic for <em>balance</em>, the scale — publishes{" "}
        {SITE.positioning}. We don&rsquo;t compete with the wires on speed. We compete
        on <strong>signal</strong>: which stories matter, which instruments they
        concern, and how markets responded.
      </p>

      <h2>What we publish</h2>
      <ul>
        <li>
          <strong>Ranked news from cited sources</strong> — every story shows how many
          independent sources cover it and links to each original. That count is the
          main input to the ranking, made visible.
        </li>
        <li>
          <strong>AI-written summaries, labelled</strong> — written from the cited
          sources&rsquo; headlines and descriptions, never copied from an article, and
          always shown with the source name, publication time and a link.
        </li>
        <li>
          <strong>Market data that states its source and time</strong> — every price,
          rate and economic figure names its provider and the time it refers to. Where
          we hold no data, the page says so instead of showing a figure.
        </li>
        <li>
          <strong>Computed recaps</strong> — session recaps written from stored closing
          prices by a deterministic engine, reproducible from their inputs.
        </li>
        <li>
          <strong>Dual currency</strong> — prices viewable in USD or QAR at the official
          peg.
        </li>
      </ul>

      <h2>What we do not do</h2>
      <p>
        Mizaan is informational. It does not give personal investment advice, does not
        execute trades and does not hold client money. Nothing on the site is a
        recommendation to buy, sell or hold any instrument.
      </p>

      <h2>Who runs Mizaan</h2>
      <OperatorDetails />

      <p>
        How ranking, summaries and data handling work is set out on the{" "}
        <Link href="/methodology">methodology</Link> page. See also our{" "}
        <Link href="/editorial-policy">editorial policy</Link>,{" "}
        <Link href="/ai-disclosure">AI disclosure</Link> and{" "}
        <Link href="/corrections">corrections</Link> pages.
      </p>
    </Prose>
  );
}
