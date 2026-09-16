import { Prose } from "@/components/layout/Prose";

export const metadata = {
  title: "Terms",
  description: "Terms of use for Mizan — informational only, not investment advice.",
};

export default function TermsPage() {
  return (
    <Prose eyebrow="the fine print" title="Terms of use" updated="16 September 2026">
      <p>
        Mizan provides market information and computed intelligence for{" "}
        <strong>informational purposes only</strong>. Nothing on this site is
        investment, legal, tax or financial advice, a recommendation, or an offer or
        solicitation to buy or sell any instrument. You are solely responsible for your
        own decisions.
      </p>
      <h2>No warranty</h2>
      <p>
        Data may be delayed, incomplete or inaccurate. Market data is provided by third
        parties on their terms; our computed content is generated from that data and
        inherits its limitations. The service is provided &ldquo;as is&rdquo; without
        warranty of any kind, and we are not liable for any loss arising from its use.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Don&rsquo;t scrape, overload or attempt to disrupt the service, and don&rsquo;t
        misrepresent our computed content as licensed or official data. Outbound links
        point to third-party sites we don&rsquo;t control and aren&rsquo;t responsible
        for.
      </p>
      <h2>Attribution</h2>
      <p>
        Aggregated headlines and deks remain the property of their publishers and are
        shown under fair-use aggregation with attribution and a link to the source. Our
        own computed figures and prose are ours.
      </p>
    </Prose>
  );
}
