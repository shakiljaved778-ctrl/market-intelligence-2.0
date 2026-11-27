# Mizaan — roadmap after launch (P2 and beyond)

Ranked by impact ÷ effort. Effort: **S** ≤ 2 days, **M** ≤ 2 weeks, **L** > 2
weeks. "Needs" lists what must exist first, including owner decisions and any
paid service (owner approval with the monthly cost stated first, per CLAUDE.md).

| Rank | Item | Value | Effort | Needs | Monetisation |
| --- | --- | --- | --- | --- | --- |
| 1 | **Turn on Deals, then publish a weekly "Week in Deals"** | The trackers are built (flagged). A Thursday roundup from them is the cheapest original format with real Gulf demand. | S | Owner switches on `NEXT_PUBLIC_FLAG_DEALS`; a few days of deal stories | Sponsor slot in the roundup |
| 2 | **Licensed GCC prices (QSE, Tadawul, ADX, DFM)** | The biggest data gap for a Gulf site. Replaces the TradingView widget with stamped, stored prices, index levels and a Gulf Markets Close recap. | M | A paid EOD feed or exchange licence: owner decision with cost (see `docs/GCC-DATA-PROVIDERS.md`) | Core of a Pro tier |
| 3 | **WhatsApp Channel and Telegram auto-posts** of the top five stories | Where Gulf readers already are; large reach at near-zero cost. | S | Owner creates the channels; posting via their official APIs | Audience growth for ads and Pro |
| 4 | **Arabic edition** (RTL, bilingual toggle) | The biggest differentiator in the GCC. Rankings and data carry over; AI summaries can be written in Arabic from the same cited facts. | L | Arabic typeface (open licence), translation QA, an Arabic editor for review | Doubles the addressable audience |
| 5 | **Watchlists and alerts** (email first) for tickers, sections and keywords | Brings readers back daily; uses data already stored. | M | Accounts (passwordless email); Resend already in use | Free tier with limits → Pro |
| 6 | **Mizaan Morning, segmented** (GCC / Global / Deals) | Built on the existing double-opt-in newsletter; more relevant sends lift opens. | S | Subscriber preference field | Sponsor slots per edition |
| 7 | **"Why this story is ranked here"** panel on each story, plus a public corrections log | Turns the ranking method into a visible trust feature; cheap because every input is already computed. | S | — | Trust → retention |
| 8 | **Earnings centre** (calendar, results, "how it moved") | High-intent search traffic; the price history and recap engine already exist. | M | An earnings-calendar source within an existing free tier, or a paid one (owner decision) | Ads on high-intent pages |
| 9 | **GCC economic dashboard** (inflation, PMI, GDP, oil revenue by country) | Official statistics agencies; extends the World Bank tiles already live. | M | Per-country feeds from statistics agencies (probe each) | Data product, B2B |
| 10 | **Shariah screen on /quote pages** (AAOIFI-style ratio screens) | Unique and ownable in the Gulf. The rule engine exists, unpublished (`content/shariah-standard.ts`). | M | A published methodology reviewed by a qualified scholar or board; the owner signs off the standard | Pro feature |
| 11 | **"Ask Mizaan"**: Q&A over Mizaan's own stored headlines and data, always cited, never advice | Differentiated search; strictly grounded in our store. | M | A model decision: CLAUDE.md limits LLM use to Groq summaries, so this needs the owner's approval | Pro feature |
| 12 | **Daily audio brief** (AI voice, labelled) as a podcast feed | Commute listening in the Gulf; generated from the morning brief. | M | A TTS service (likely paid: owner approval with cost); same LLM-scope approval as 11 | Audio sponsorship |
| 13 | **Premium tier (Mizaan Pro)**: alerts, export, deeper data, ad-free, API | Revenue once 2, 5 and 10 exist. | L | Payment gateway (owner approval with cost), licensed data that permits redistribution | Subscription |
| 14 | **B2B data/API and white-label market widgets** for GCC banks and brokers | Highest revenue per customer. | L | Redistribution rights for every data source involved | Licensing |
| 15 | **Sponsorship and native slots** with "Sponsored" labelling and an editorial firewall | Near-term revenue without a paywall. | S | A written sponsorship policy on `/editorial-policy` | Direct |
| 16 | **Events and partnerships** (media partner for Doha conferences, university finance clubs) | Brand and audience in Qatar. | S (ongoing) | Owner time | Partnerships |

## Engineering follow-ups found during the audit

- **Cold-start empty sections:** on a freshly started server instance a section
  front can briefly render with no stories if the first database read is slow
  (seen once by the smoke test on `/news?section=sports`). Fix: a longer first
  read for the wire, or serve the last good wire from KV. Effort S.
- **Error tracking:** add Sentry (free tier) behind `SENTRY_DSN`, off until the
  owner creates an account. Effort S.
- **Health alerts by email:** the pipeline can call the protected `/api/health`
  and email through Resend when it reads "down" twice. An uptime monitor on the
  public endpoint already covers outages. Effort S.
- **Section freshness SLO:** collapse a section with fewer than 6 stories under
  72 h into "More from …", as the brief proposes. Effort S.
- **Homepage weight:** the homepage HTML is about 0.9 MB (the full ranked wire is
  serialised for client components). Trimming that payload is the biggest
  performance lever. Effort M.
