import Link from "next/link";
import { canonical } from "@/lib/seo";
import { Prose } from "@/components/layout/Prose";
import { QAR_PER_USD, pegReviewedOn } from "@/lib/currency/peg";
import { SHARIAH_STANDARD } from "@/content/shariah-standard";

export const metadata = {
  title: "Methodology",
  description:
    "How Mizaan works: where data comes from, how stories are clustered and ranked, what 'computed' means, and what delays apply.",
  alternates: { canonical: canonical("/methodology") },
};

export default function MethodologyPage() {
  return (
    <Prose eyebrow="how mizaan works" title="Methodology" updated="27 November 2026">
      <p>
        Mizaan is <strong>algorithmically curated market intelligence</strong>. The
        signal — clustering, ranking, entity extraction and the session recaps — is
        computed <strong>deterministically</strong> from data we hold. No generative AI
        model is involved: clustering compares headlines with a small text-similarity
        function computed on our own servers (no outside model or service), and ranking
        is the fixed formula below. On top of that, each story carries an{" "}
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
        Market prices, reference rates and economic series come from third-party data
        providers, fetched on a schedule and stored — a page never calls a provider
        directly. Each figure is shown with the provider&rsquo;s name and the time it
        refers to. When we hold no real value for something, the page says so; we do not
        fill the gap with a placeholder or an estimate. News is aggregated from official
        RSS and API feeds listed in our source registry, weighted heavily toward
        regulators, central banks, exchanges and statistics authorities. Every source
        carries an explicit licence note, and we store{" "}
        <strong>headlines, short deks (≤ 40 words), timestamps and links only</strong> —
        never the body of a third-party article.
      </p>

      <h2>How clustering works</h2>
      <p>
        Every incoming headline is classified against committed dictionaries (tickers,
        entities, topics) and embedded locally. We then group headlines that describe
        the same event within a rolling 48-hour window, using semantic similarity plus a
        boost when stories share the same tickers or entities. Two reports merge only
        when they share a ticker or a named entity, or their wording is nearly
        identical. One central-bank decision covered by nine outlets becomes{" "}
        <strong>one</strong> cluster, not nine. A cluster&rsquo;s title is always the
        headline of its highest-trust source — we never synthesise a title.
      </p>

      <h2>How the importance score is calculated</h2>
      <p>The 0–100 score is a fixed, weighted formula. The weights are:</p>
      <ul>
        <li>
          <strong>Distinct source count (40%)</strong> — how many independent outlets
          cover the story, on a log scale. This is the single strongest signal, and we
          show it on every cluster.
        </li>
        <li>
          <strong>Source tier (20%)</strong> — regulators, central banks and primary
          sources count 1.0, news wires 0.7 and other outlets 0.55.
        </li>
        <li>
          <strong>Market impact (25%)</strong> — the largest move among the instruments
          the story concerns, scaled so that a 5% move counts in full.
        </li>
        <li>
          <strong>Primary-source presence (15%)</strong> — a bonus when a regulator or
          central bank is among the sources.
        </li>
      </ul>
      <p>
        The result is multiplied by a recency factor that halves every 18 hours but
        never falls below 18%, so heavily covered news doesn&rsquo;t vanish the moment
        it ages.
      </p>

      <h2>How often it updates</h2>
      <ul>
        <li>
          <strong>News:</strong> every 30 minutes, around the clock — new headlines are
          fetched, clustered and ranked in the same run.
        </li>
        <li>
          <strong>US shares, index funds and crypto:</strong> every 15 minutes during
          the US session (09:25–16:15 New York time), hourly otherwise. Prices are
          delayed or end-of-day, as stated beside each one; they are not real-time.
        </li>
        <li>
          <strong>Currencies:</strong> the European Central Bank&rsquo;s daily reference
          rates, shown with their fixing date.
        </li>
        <li>
          <strong>Economic series and energy prices:</strong> checked every 6 hours;
          each shows the date of its latest official observation.
        </li>
        <li>
          <strong>Official videos:</strong> each channel&rsquo;s newest upload, checked
          every 6 hours.
        </li>
        <li>
          <strong>Qatar Stock Exchange:</strong> prices come from TradingView&rsquo;s
          widget, delayed by at least 15 minutes, and load in your browser.
        </li>
      </ul>

      <h2>What &ldquo;computed&rdquo; means</h2>
      <p>
        Our session recaps and the per-instrument &ldquo;how it moved&rdquo; blocks are
        written by a deterministic template engine from stored closing prices — the same
        inputs always produce the same words. The engine chooses its sentence form from
        the shape of the data (a streak, a reversal, a new high or low), never asserts a
        cause the data doesn&rsquo;t support, and says less rather than padding with
        filler. Because each recap is reproducible from its stored inputs, you can
        always trace a sentence back to the figures behind it. A session recap is
        published only when at least 80% of the US equities we track have a closing
        price for that session; otherwise none is published for that day.
      </p>

      <h2>Shariah screening</h2>
      {SHARIAH_STANDARD.published ? (
        <>
          <p>
            Where a Shariah status is shown, it is the result of a rule-based financial
            screen against <strong>{SHARIAH_STANDARD.name}</strong>. It is not a fatwa
            and not investment advice. A company fails if its core business is{" "}
            {SHARIAH_STANDARD.prohibitedActivities
              .map((a) => a.replace(/_/g, " "))
              .join(", ")}
            , or if any ratio below exceeds its limit. If a figure needed for a ratio
            has not been reported, the status is &ldquo;insufficient data&rdquo; — we
            never estimate a missing figure. Each status shows the date and source of
            the financial statements it is based on.
          </p>
          <ul>
            {SHARIAH_STANDARD.ratios.map((r) => (
              <li key={r.id}>
                {r.label}: at most {Math.round(r.max * 100)}%
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>
          Mizaan does not currently show a Shariah-compliance status for any instrument.
          A screen will be published here — the standard applied, the financial ratios
          and thresholds, and the date of the underlying data — before any status
          appears on the site. It will be a rule-based screen, not a fatwa.
        </p>
      )}

      <h2>Delays and currency</h2>
      <p>
        Every price states its source, the time it refers to and, where the feed is
        delayed or end-of-day, that too. US equity and crypto prices are refreshed
        through the day; a price shown outside trading hours is the last close, and is
        labelled as such. FX figures are the European Central Bank&rsquo;s daily
        reference rates, not live quotes. Energy benchmarks are daily prices published
        by the US Energy Information Administration. We do not yet have a licensed data
        feed for the Gulf exchanges (QSE, Tadawul, ADX, DFM), so we show no prices or
        index levels for them. All values are stored in USD; QAR is a presentation
        conversion at the official peg of <strong>{QAR_PER_USD} QAR = 1 USD</strong>{" "}
        (reviewed {pegReviewedOn}). Percentages, ratios and index levels are
        currency-neutral and are never converted.
      </p>

      <p>
        Questions about a specific number? Most figures link back to their source or
        their instrument. Start from <Link href="/news">the wire</Link> or{" "}
        <Link href="/markets">markets</Link>.
      </p>
    </Prose>
  );
}
