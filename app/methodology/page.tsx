import Link from "next/link";
import { Prose } from "@/components/layout/Prose";
import { QAR_PER_USD, pegReviewedOn } from "@/lib/currency/peg";

export const metadata = {
  title: "Methodology",
  description:
    "How Mizan works: where data comes from, how stories are clustered and ranked, what 'computed' means, and what delays apply.",
};

export default function MethodologyPage() {
  return (
    <Prose eyebrow="how mizan works" title="Methodology" updated="16 September 2026">
      <p>
        Mizan is <strong>algorithmically curated market intelligence</strong>. The
        signal — clustering, ranking, entity extraction and the session recaps — is
        computed <strong>deterministically</strong> from data we hold, with no model in
        the loop. On top of that, each story carries an{" "}
        <strong>AI-written summary</strong>: original prose synthesised from the
        story&rsquo;s facts and its cited sources, clearly labelled and never copied
        from source articles. Rankings are facts about coverage; summaries are AI
        interpretation — we keep the two visibly distinct, and the iris accent marks
        what we computed.
      </p>
      <p>
        AI summaries can be wrong. They are informational only, not investment advice,
        and every one links the underlying sources so you can verify.
      </p>

      <h2>Where the data comes from</h2>
      <p>
        Market prices, company profiles and historical candles come from free-tier
        market data providers, fetched on a schedule and served from cache — a page
        never calls a vendor directly. News is aggregated from official RSS and API
        feeds listed in our source registry, weighted heavily toward regulators, central
        banks, exchanges and statistics authorities. Every source carries an explicit
        licence note, and we store{" "}
        <strong>headlines, short deks (≤ 40 words), timestamps and links only</strong> —
        never the body of a third-party article.
      </p>

      <h2>How clustering works</h2>
      <p>
        Every incoming headline is classified against committed dictionaries (tickers,
        entities, topics) and embedded locally. We then group headlines that describe
        the same event within a rolling 48-hour window, using semantic similarity plus a
        boost when stories share the same tickers or entities. One central-bank decision
        covered by nine outlets becomes <strong>one</strong> cluster, not nine. A
        cluster&rsquo;s title is always the headline of its highest-trust source — we
        never synthesise a title.
      </p>

      <h2>How the importance score is calculated</h2>
      <p>The 0–100 score is a documented, weighted formula:</p>
      <ul>
        <li>
          <strong>Distinct source count</strong> — how many independent outlets cover
          the story. This is the single strongest signal, and we show it on every
          cluster.
        </li>
        <li>
          <strong>Source tier</strong> — regulators, central banks and primary sources
          count for more than secondary outlets.
        </li>
        <li>
          <strong>Market impact</strong> — the size of the move in the instruments the
          story concerns.
        </li>
        <li>
          <strong>Primary-source presence</strong> — a bonus when a regulator or central
          bank is among the sources.
        </li>
      </ul>
      <p>
        The result is multiplied by a recency factor that decays with age but never
        falls to zero, so heavily covered news doesn&rsquo;t vanish the moment it ages.
      </p>

      <h2>What &ldquo;computed&rdquo; means</h2>
      <p>
        Our session recaps and the per-instrument &ldquo;how it moved&rdquo; blocks are
        written by a deterministic template engine from our own numbers — the same
        inputs always produce the same words. The engine chooses its sentence form from
        the shape of the data (a streak, a reversal, a new high or low), never asserts a
        cause the data doesn&rsquo;t support, and says less rather than padding with
        filler. Because each recap is reproducible from its stored inputs, you can
        always trace a sentence back to the figures behind it.
      </p>

      <h2>Delays and currency</h2>
      <p>
        Every price states its delay and source. Global exchanges carry a live layer;
        GCC exchanges (QSE, Tadawul, DFM, ADX) have no reliable free intraday feed and
        are shown as end-of-day, clearly labelled as delayed. All values are stored in
        USD; QAR is a presentation conversion at the official peg of{" "}
        <strong>{QAR_PER_USD} QAR = 1 USD</strong> (reviewed {pegReviewedOn}).
        Percentages, ratios and index levels are currency-neutral and are never
        converted.
      </p>

      <p>
        Questions about a specific number? Most figures link back to their source or
        their instrument. Start from <Link href="/news">the wire</Link> or{" "}
        <Link href="/markets">markets</Link>.
      </p>
    </Prose>
  );
}
