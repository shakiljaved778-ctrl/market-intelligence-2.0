/**
 * Editorial prose wrapper for the written pages (methodology, terms, privacy,
 * about). Reading column capped at 68ch, Newsreader body at 1.6 line-height (§12).
 */
export function Prose({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-10">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-editorial text-text-hi mt-2 text-[34px] leading-tight">
        {title}
      </h1>
      {updated ? (
        <p className="text-text-low mt-1 text-[12px]">Last updated {updated}</p>
      ) : null}
      <div className="prose-body mt-6 max-w-[68ch]">{children}</div>
    </div>
  );
}
