import Link from "next/link";
import { Prose } from "@/components/layout/Prose";

export const metadata = {
  title: "About",
  description:
    "Mizan surfaces which stories matter, which instruments they move, and how markets responded — signal over an undifferentiated firehose.",
};

export default function AboutPage() {
  return (
    <Prose eyebrow="signal over noise" title="About Mizan">
      <p>
        <strong>Mizan</strong> — Arabic for <em>balance</em>, the scale — is a market
        intelligence platform for global and GCC markets. We don&rsquo;t compete with
        the wires on speed or licensed data. We compete on <strong>signal</strong>:
        which stories matter, which instruments they move, and how markets actually
        responded.
      </p>
      <h2>What makes it different</h2>
      <ul>
        <li>
          <strong>Source-count as a first-class signal</strong> — every story shows how
          many independent outlets cover it, and that number is the ranking, made
          visible.
        </li>
        <li>
          <strong>News-to-price adjacency</strong> — every cluster is bound to the
          instruments it concerns, with the live move alongside.
        </li>
        <li>
          <strong>Computed recaps</strong> — session recaps written from our own numbers
          by a deterministic engine, factual and original.
        </li>
        <li>
          <strong>Dual currency</strong> — every figure viewable in USD or QAR,
          everywhere.
        </li>
      </ul>
      <p>
        How it all works is laid out on the <Link href="/methodology">methodology</Link>{" "}
        page.
      </p>
    </Prose>
  );
}
