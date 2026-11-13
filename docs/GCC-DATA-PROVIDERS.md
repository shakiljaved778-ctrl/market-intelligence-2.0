# GCC market data: provider comparison

Status: **desk research only, 12 Nov 2026.** Nothing here has been tested with a live
key, and no price was confirmed on a provider's own pricing page: this build
environment could not reach the providers' sites, so the findings below come from
search results and each needs checking before any money is spent. Items marked
"confirmed" were stated on the provider's own pages as returned by search; items
marked "unverified" were not.

## What Mizaan needs

| Need | Detail |
| --- | --- |
| Venues | QSE (Qatar), Saudi Exchange (Tadawul), ADX (Abu Dhabi), DFM (Dubai). |
| Instruments | The main index of each venue and its main constituents (roughly 30 to 60 names each). |
| Freshness | End-of-day is enough to start. 15-minute delayed is a later upgrade. |
| Fields | Close, previous close, change, volume; ideally market cap. |
| Fundamentals | Total debt, cash and interest-bearing securities, total assets, market cap, revenue by segment — needed for the Shariah screen. |
| Licence | The right to **display** prices on a public, commercial website, and later inside a paid tier and an email newsletter. An API subscription alone does not always grant this. |

## Candidates

| Provider | Tadawul | QSE | ADX | DFM | Delivery | Display licence | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Twelve Data** | Listed (confirmed) | Listed (confirmed) | Not found (unverified) | Not found (unverified) | REST API; EOD and delayed | Plans are sold for personal and for business use; public display needs a business plan (unverified) | Not confirmed. Business and enterprise tiers are quoted on request. |
| **EODHD** | An older forum reply says Saudi data was not offered (unverified, undated) | Unknown | Unknown | Unknown | REST API; EOD | Commercial display is a separate licence (unverified) | Not confirmed. |
| **FMP** (already a provider here) | Unknown | Unknown | Unknown | Unknown | REST API | Commercial display needs a specific plan (unverified) | Not confirmed. Its `available-exchanges` endpoint lists coverage and delay per venue. |
| **Finnhub** (already a provider here) | Not on the free plan | Not on the free plan | Not on the free plan | Not on the free plan | REST API | Paid international plans exist (unverified) | Not confirmed. |
| **Direct from each exchange** | Saudi Exchange licenses redistribution under its Tadawul Information License Agreement; its group data arm is Wamid (confirmed) | QSE sells real-time and snapshot data products and publishes a data licensing agreement (confirmed) | Fee schedule not found | Fee schedule not found | Feeds or files; more integration work | Yes — this is the licence itself | Per-exchange fees; not found. |
| **Enterprise aggregators** (ICE, Exegy, LSEG) | Yes | Yes | Yes (Exegy, ICE) | Yes (Exegy, ICE) | Enterprise feeds | Yes, with exchange fees passed through | Enterprise pricing; likely far above the other options. |

## Reading of the evidence

1. **No candidate is confirmed to cover all four venues at an API price.** Twelve Data
   is the only API vendor for which coverage of two venues (Tadawul and QSE) was
   confirmed. UAE coverage was not found for it.
2. **The licence matters as much as the feed.** Gulf exchanges license redistribution
   and website display themselves. A reseller's API key does not necessarily carry
   that right, and the reseller's terms have to say so in writing.
3. **Qatar may be the cheapest place to start properly.** QSE publishes its data
   products and licensing agreement and states that media companies may access its
   data for market commentary. For a Doha-based publisher, asking QSE directly about
   an end-of-day or delayed display licence is a reasonable first call.
4. **The Shariah screen needs fundamentals, which is a separate question** from
   prices. Coverage of balance-sheet data for Gulf companies varies by vendor and was
   not established here.

## Recommended next steps

1. **Ask three vendors one written question each** (Twelve Data, EODHD, FMP): "Which
   of QSE, Tadawul, ADX and DFM do you cover for end-of-day prices and for
   fundamentals, on which plan, and does that plan permit display on a public
   commercial website and in an email newsletter?" The written answers are the
   comparison.
2. **Ask QSE's market data team** for the cost and terms of an end-of-day or
   15-minute-delayed website display licence.
3. **Get trial keys** for whichever vendors answer yes, and have the coverage tested
   with real calls (each vendor has an endpoint that lists exchanges; test five
   constituents per venue and the main index).
4. **Decide with numbers**: monthly cost, venues covered, licence in writing.

Until a feed is chosen, the site shows no Gulf prices or index levels, and says so.

## What a build session needs to run the coverage test

The provider hosts must be on the session's network allow-list (for example
`api.twelvedata.com`, `eodhd.com`, `financialmodelingprep.com`), and the trial keys
must be supplied as secrets — never pasted into chat or committed.

## Sources

- Twelve Data exchange directory and EOD pricing article:
  https://support.twelvedata.com/en/collections/2787973-exchanges ,
  https://support.twelvedata.com/en/articles/12682324-end-of-day-eod-pricing-market-data ,
  https://twelvedata.com/pricing-business
- EODHD supported exchanges and forum reply on Saudi coverage:
  https://eodhd.com/financial-apis/list-supported-exchanges ,
  https://forum.eodhd.com/t/do-you-support-the-saudi-stock-exchange/539
- FMP available exchanges:
  https://site.financialmodelingprep.com/developer/docs/stable/available-exchanges
- Saudi Exchange, becoming an information provider:
  https://www.saudiexchange.sa/wps/portal/saudiexchange/trading/participants-directory/become-an-information-provider
- QSE data products and licensing agreement:
  https://www.qe.com.qa/data-products , https://qe.com.qa/other-data-products
- ICE catalogue entries for Tadawul and QSE:
  https://developer.ice.com/fixed-income-data-services/catalog/saudi-stock-exchange-tadawul ,
  https://developer.ice.com/fixed-income-data-services/catalog/qatar-stock-exchange-qse
- Exegy Middle East coverage announcement:
  https://mondovisione.com/media-and-resources/news/exegy-expands-market-data-coverage-offering-with-new-middle-east-markets-202663/
