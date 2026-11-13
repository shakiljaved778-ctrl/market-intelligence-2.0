import Link from "next/link";
import { SITE } from "@/content/site.config";
import { EDITOR } from "@/lib/author";

/**
 * Who runs the site — read entirely from content/site.config.ts. A field the
 * owner has not supplied is omitted (never a placeholder), so the list simply
 * grows as the config is filled in.
 */
export function OperatorDetails() {
  const rows: { label: string; value: React.ReactNode }[] = [];
  if (SITE.operator.name)
    rows.push({ label: "Operated by", value: SITE.operator.name });
  if (SITE.operator.location) {
    rows.push({ label: "Based in", value: SITE.operator.location });
  }
  if (SITE.operator.registration) {
    rows.push({ label: "Registration", value: SITE.operator.registration });
  }
  rows.push({
    label: "Editor",
    value: (
      <>
        <Link href={`/author/${EDITOR.slug}`}>{EDITOR.name}</Link>, {EDITOR.role}
      </>
    ),
  });
  rows.push({
    label: "Editorial and corrections",
    value: <a href={`mailto:${SITE.contact.editorial}`}>{SITE.contact.editorial}</a>,
  });
  if (SITE.contact.general) {
    rows.push({
      label: "General enquiries",
      value: <a href={`mailto:${SITE.contact.general}`}>{SITE.contact.general}</a>,
    });
  }
  if (SITE.contact.advertising) {
    rows.push({
      label: "Advertising and partnerships",
      value: (
        <a href={`mailto:${SITE.contact.advertising}`}>{SITE.contact.advertising}</a>
      ),
    });
  }
  return (
    <dl>
      {rows.map((r) => (
        <div key={r.label}>
          <dt>
            <strong>{r.label}</strong>
          </dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
