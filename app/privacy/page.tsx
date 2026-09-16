import { Prose } from "@/components/layout/Prose";

export const metadata = {
  title: "Privacy",
  description: "What Mizan stores and why. The site runs without accounts in V1.",
};

export default function PrivacyPage() {
  return (
    <Prose eyebrow="what we keep" title="Privacy" updated="16 September 2026">
      <p>
        Mizan runs <strong>without user accounts</strong> in this version. We
        don&rsquo;t ask for your name, email or payment details, and we don&rsquo;t
        build a profile of you.
      </p>
      <h2>Cookies</h2>
      <p>
        We store two small preference cookies on your device: your display currency (USD
        or QAR) and your theme (dark or light). They exist only so the server can render
        the page the way you left it, they contain no personal data, and they never
        leave your browser except to tell our server which preference to honour.
      </p>
      <h2>What we don&rsquo;t do</h2>
      <ul>
        <li>No advertising trackers or third-party analytics beacons.</li>
        <li>No selling or sharing of personal data — we don&rsquo;t collect it.</li>
        <li>
          No article-body storage; we keep only headlines, deks, timestamps and links.
        </li>
      </ul>
      <h2>Third parties</h2>
      <p>
        Market and macro data is fetched server-side from data providers on our
        schedule, not from your browser, so those providers don&rsquo;t see you.
        Outbound links take you to publishers whose own privacy practices apply once you
        leave Mizan.
      </p>
    </Prose>
  );
}
