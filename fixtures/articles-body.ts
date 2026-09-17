/**
 * Article bodies for the fixture wire, keyed by the cluster's primary article id.
 *
 * These are ORIGINAL, AI-written summaries synthesised from each story's facts —
 * never copied from any source (§10 still holds: we don't store third-party
 * article text). In production, scripts/generate-briefs.ts (Groq) writes real
 * bodies for ingested stories into the same shape; this committed set keeps the
 * zero-key demo readable offline. Every body is shown under an AI + not-advice
 * disclaimer and above the linked source list.
 */
export interface ArticleBody {
  md: string;
  model: string;
}

export const ARTICLE_BODIES: Record<number, ArticleBody> = {
  1: {
    model: "editorial-demo",
    md: `The Federal Reserve left its benchmark policy rate unchanged, keeping borrowing costs at their current level while it waits for more evidence that inflation is durably easing. Officials repeated that decisions will stay "data-dependent," signalling patience rather than a pre-set path toward cuts.

The steady stance leaves the door open to easing later in the year if price growth continues to cool, but policymakers were careful not to commit. Rate-sensitive assets — from Treasuries to growth equities — take their cue from exactly this kind of guidance.

**Why it matters:** The pace of future cuts, not this hold, is what will reprice bonds and equities in the months ahead.`,
  },
  5: {
    model: "editorial-demo",
    md: `OPEC+ agreed to keep its production targets unchanged, holding output steady as the group assesses demand into the next quarter. The decision landed as Brent crude extended a multi-session decline, with traders reading the status quo as a signal that producers are comfortable with current price levels.

Unchanged quotas remove a near-term supply catalyst, leaving prices to trade on demand signals and inventories. Energy equities and import-heavy economies both track the outcome closely.

**Why it matters:** With supply pinned, the next leg for oil hinges on demand — and on whether the group's discipline holds.`,
  },
  8: {
    model: "editorial-demo",
    md: `The U.S. Securities and Exchange Commission announced an enforcement action against an investment adviser, citing inadequate risk disclosures to clients. The regulator framed the case as part of its continued focus on transparency and suitability in advisory relationships.

Enforcement actions of this kind rarely move broad indices, but they sharpen compliance expectations across the industry and can weigh on the firms directly named.

**Why it matters:** Disclosure cases set the tone for how aggressively the SEC polices adviser conduct — a standing risk for the sector.`,
  },
  9: {
    model: "editorial-demo",
    md: `Apple detailed a refreshed product line ahead of the holiday quarter, its most important selling season. The company positioned the launch to drive upgrade demand as it heads into the period that typically defines its annual results.

Investors watch launches less for the hardware than for what they imply about pricing, margins and unit demand into year-end. Suppliers across the components chain also trade on the read-through.

**Why it matters:** The holiday quarter disproportionately shapes Apple's year — and the tone of the broader hardware supply chain.`,
  },
  10: {
    model: "editorial-demo",
    md: `Nvidia reported quarterly results above its own guidance, led once again by surging data-center revenue as demand for AI accelerators stayed strong. The beat extends a run in which the company's data-center segment has become the dominant driver of growth.

Because Nvidia sits at the centre of the AI build-out, its results are read as a barometer for capital spending across cloud providers and enterprise customers alike.

**Why it matters:** Nvidia's data-center trajectory is the market's cleanest proxy for whether AI infrastructure spending is still accelerating.`,
  },
  12: {
    model: "editorial-demo",
    md: `Qatar National Bank posted higher quarterly profit, pointing to resilient lending across the Gulf even as global rates stay elevated. The result reinforced a broadly steady picture for the region's largest lenders.

Gulf banks benefit from firm regional activity and government spending tied to diversification programmes. Earnings strength at the largest institutions often signals the health of the wider domestic economy.

**Why it matters:** QNB's results are a bellwether for Qatari and Gulf financial conditions heading into the next reporting cycle.`,
  },
  13: {
    model: "editorial-demo",
    md: `The World Bank raised its global growth forecast, crediting cooling inflation and steadier trade for a slightly brighter outlook than its previous projection. The upgrade suggests the worst of the recent inflation shock may be passing for many economies.

Upward revisions from multilateral institutions shape sentiment on everything from emerging-market debt to commodity demand, even when the changes are incremental.

**Why it matters:** A firmer global growth path eases pressure on risk assets — provided disinflation actually holds.`,
  },
  14: {
    model: "editorial-demo",
    md: `U.S. consumer prices rose less than expected in the latest reading, cooling to their slowest pace in three years and easing cost-of-living pressure. The softer print adds to evidence that the inflation surge of recent years continues to fade.

Cooler inflation strengthens the case for eventual rate relief, though a single report rarely settles the debate on its own. Markets parse each release for confirmation of the trend.

**Why it matters:** Sustained disinflation is the precondition for lower rates — and this print keeps that path alive.`,
  },
  15: {
    model: "editorial-demo",
    md: `Bitcoin climbed to a fresh high, extending a rally that participants attributed to steady institutional inflows. The move continued a stretch of strength for the largest cryptocurrency as demand outpaced available supply.

Crypto remains among the most volatile corners of the market, and rallies driven by inflows can reverse quickly if that demand fades. Mizan reports the move; it does not endorse the asset class.

**Why it matters:** Institutional flows have become the swing factor for Bitcoin — and they can turn as fast as they arrived.`,
  },
  16: {
    model: "editorial-demo",
    md: `Tesla shares fell after the company trimmed its delivery outlook for the year, disappointing investors who had expected firmer guidance. The cut sent the stock lower in late trading as the market recalibrated its growth assumptions.

Delivery guidance is the metric the market watches most closely for Tesla, since it feeds directly into revenue and margin expectations. A reduction resets the bar for coming quarters.

**Why it matters:** Lowered guidance pressures the growth narrative that underpins Tesla's valuation.`,
  },
  17: {
    model: "editorial-demo",
    md: `OpenAI unveiled a new AI model, saying it sharply improves reasoning and reduces errors relative to its predecessors. The company positioned the release as a step forward in reliability for complex, multi-step tasks.

Each frontier release resets expectations across the sector, influencing how enterprises plan deployments and how rivals pace their own roadmaps. Capability gains also feed demand for the compute that trains and serves these models.

**Why it matters:** Better reasoning widens the range of tasks AI can handle — and intensifies both competition and compute demand.`,
  },
  19: {
    model: "editorial-demo",
    md: `Football's governing body, FIFA, confirmed an expanded format for the 2030 World Cup, enlarging the field for the tournament. The change continues a trend toward bigger, more commercially expansive editions of the event.

A larger tournament means more matches, more host venues and a wider commercial footprint, with knock-on effects for broadcasters, sponsors and host economies.

**Why it matters:** Expansion reshapes the economics of the world's most-watched sporting event — and who gets to share in it.`,
  },
  21: {
    model: "editorial-demo",
    md: `The World Health Organization issued new guidance aimed at curbing a rise in dengue outbreaks, urging stronger prevention and response measures as cases climb across several regions. The agency framed the guidance as a response to a worsening seasonal picture.

Public-health guidance of this kind shapes how governments allocate resources and prioritise surveillance, particularly in regions where the disease is spreading fastest.

**Why it matters:** Coordinated guidance can blunt an outbreak's peak — but only if regions act on it early.`,
  },
  23: {
    model: "editorial-demo",
    md: `A science-fiction epic topped the global box office in a record opening weekend, drawing strong ticket sales worldwide. The result underscored continued appetite for large-scale theatrical releases despite the pull of streaming.

Standout openings matter to studios and cinema operators alike, shaping release strategies and the balance between theatrical windows and home viewing.

**Why it matters:** A record opening is a vote of confidence in the theatrical model at a moment when streaming dominates attention.`,
  },
  24: {
    model: "editorial-demo",
    md: `Astronomers said a space telescope captured its sharpest image yet of a distant galaxy, an observation researchers suggested could refine models of how early galaxies formed. The image adds to a growing body of data reshaping the field.

Advances in observation routinely force revisions to long-held theories, and each new dataset gives scientists finer detail to test competing models of the early universe.

**Why it matters:** Sharper observations of the early universe are how cosmology's biggest questions get narrowed down.`,
  },
  25: {
    model: "editorial-demo",
    md: `Researchers reported that a quantum processor crossed a key error-correction threshold, a long-sought benchmark on the road to machines that can run useful calculations reliably. Error correction is the bottleneck that has separated experimental quantum hardware from practical use.

Milestones like this are incremental, not a finished product, but they narrow the gap between laboratory demonstrations and real applications in chemistry, materials and cryptography.

**Why it matters:** Crossing the error-correction threshold is the step the field has been waiting for — practical quantum computing gets closer, if still years out.`,
  },
  26: {
    model: "editorial-demo",
    md: `A new Alzheimer's medicine met its primary goal in a late-stage clinical trial, its developer said, raising hopes that regulators could clear it for early-stage patients. The result adds to a slow but real run of progress against a disease that has frustrated drug developers for decades.

Trial success is not approval, and questions on safety, cost and real-world benefit will follow. But a positive late-stage read-out is the highest bar most treatments must clear.

**Why it matters:** Even incremental progress against Alzheimer's carries enormous human and economic weight given how many families it touches.`,
  },
  27: {
    model: "editorial-demo",
    md: `Gold pushed to a fresh record, extending a run as investors sought havens amid uncertainty over interest rates and geopolitics. The metal tends to gain when real yields soften or when risk appetite fades, and both forces have been in play.

Records draw fresh attention but also raise the question of how much of the move is already priced. Gold pays no yield, so its appeal rises and falls with the alternatives.

**Why it matters:** A record in gold is a barometer of how much caution is running through markets right now.`,
  },
  28: {
    model: "editorial-demo",
    md: `US employers added more jobs than expected while the unemployment rate held steady, pointing to a labour market that has cooled without cracking. The reading complicates the case for rapid rate cuts even as inflation eases.

A resilient jobs market supports consumer spending but keeps upward pressure on wages, one of the stickier components of inflation. Policymakers weigh both sides of that ledger.

**Why it matters:** Jobs and inflation are the two dials the Fed watches — and a firm labour market argues for patience on cuts.`,
  },
};
