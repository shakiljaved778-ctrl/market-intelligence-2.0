# Mizaan house style

The standard for everything Mizaan writes or generates: AI summaries, Mizaan
Originals, recaps, page copy and newsletters. Read with `CLAUDE.md` (the legal
and data rules) and `/editorial-policy` (the public version).

## 1. What we write — and what we never write

- **We write:** AI summaries of clustered stories, Mizaan Originals,
  computed recaps, section and page copy, and the Mizaan Morning newsletter.
- **We never rewrite a source's headline.** A story's title is the headline of
  its highest-trust source, verbatim (only invisible characters and stray spacing
  are cleaned). The rules in §2 apply to headlines **we** write: Originals,
  recaps and newsletter subject lines.
- **We never write:** investment advice; buy, sell or hold language; price
  targets; or predictions presented as fact.

## 2. Headlines (ours)

- Active voice and a concrete verb: "QIIB issues $500m sukuk", not "Sukuk issued
  by QIIB".
- Specific numbers beat adjectives: "Brent rises 1.2% to $91.80", not "Oil
  surges".
- At most 70 characters. No clickbait, no questions, no ALL CAPS, no
  exclamation marks.
- Sentence case. Proper nouns and tickers keep their case.

## 3. Numbers

- **Currency first, then amount:** QAR 3bn, $81.3bn, SAR 450m, €2.1bn. Use "bn"
  and "m"; no space between the amount and the unit.
- **Percentages to one decimal place:** 1.2%, not 1.23% (prices themselves keep
  their native precision).
- **Changes carry a sign and direction glyph** in data (▲ +1.2%). In prose, use
  "rose 1.2%" or "fell 0.8%", never a bare "1.2%".
- **Always state the period and the source:** "in the third quarter, the Planning
  and Statistics Authority said"; "at the close on 27 Nov (Finnhub)".
- **Never convert percentages, ratios or index levels between currencies.** QAR
  figures are presentation only, at the 3.64 peg.
- **A number we do not hold is not written.** No estimates and no "around" a
  figure we invented. Say "the value was not disclosed".

## 4. AI summaries

- Structure, in at most 80 words, in this order:
  - **What happened** (one or two sentences, with the key fact and number);
  - **Why it matters** (one sentence, the market or policy consequence the
    sources state);
  - **What to watch** (one sentence: the next scheduled event or decision the
    sources name).
- **Facts only from the cited sources.** Every number must appear in a source,
  with the same value and unit. If the sources give no reason, the summary gives
  none.
- **No speculation.** No "could", "may signal" or "is expected to" unless a named
  source says so, attributed: "the bank expects…".
- **Low confidence → no summary.** Publish the headline and links only.
- Always labelled **"AI-written · from N cited sources"**, and the story page
  links every source.

## 5. Attribution

- Attribute every claim that is not a published figure: "the central bank
  said", "according to the company's filing".
- Quote at most 25 words from any one article, in quotation marks, attributed
  and linked.
- Primary sources (central banks, regulators, exchanges, statistics agencies) are
  named first and preferred over reports about them.
- Name a wire or outlet as it styles itself: Qatar News Agency (QNA),
  Reuters, The Conversation.

## 6. Corrections and updates

- A factual error is corrected on the page with a visible **"Corrected
  [date]: what changed"** note, and logged on `/corrections`.
- A material new development adds **"Updated [time]"**. Do not silently change a
  published fact.
- Corrections go to `editor@mizaan.tech` (`content/site.config.ts`).

## 7. AI labelling

- Anything a model wrote carries the AI label and the not-advice,
  verify-against-sources line.
- Never imply that rankings, scores or recaps are AI-written: they are
  computed. Say "computed" or "ranked by"; never "our AI picked".

## 8. Editorial exclusions

Mizaan does not publish news about the Qatar Central Bank, or anything about
Qatar politics, government or diplomacy (`content/exclusions.yaml`). This applies
to summaries, Originals, newsletters and page copy alike.

## 9. Original formats (templates)

| Format | Cadence | Source of truth | Status |
| --- | --- | --- | --- |
| Session recap / Gulf Markets Close | Daily after the close | Stored closing prices only; published only with ≥ 80% coverage | US close live; Gulf close once a licensed GCC feed exists |
| The Mizaan Brief | Each trading morning | The top five ranked stories plus stamped market figures | Live as Mizaan Morning |
| Week in Deals | Thursday | The /deals trackers | Once the Deals flag is on |
| Chart of the Day | Daily | One stored series, with its source and date on the chart | Planned |
| Explainers | Evergreen | Human-reviewed before publishing; labelled "Explainer" | Eureka pieces live |
| Event hubs | Per event | The wire filtered to the event | Planned |
