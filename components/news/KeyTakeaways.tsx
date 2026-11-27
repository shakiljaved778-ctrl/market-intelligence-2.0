import { keyTakeaways } from "@/lib/news/takeaways";

/**
 * "Key takeaways" box at the top of an AI-written article (owner request,
 * 2026-11-27). The bullets are sentences from the article itself
 * (lib/news/takeaways.ts) — no extra model call — so they carry the same
 * AI-written label as the article. Renders nothing when the article is too
 * thin to summarise.
 */
export function KeyTakeaways({ md }: { md: string }) {
  const items = keyTakeaways(md);
  if (items.length === 0) return null;
  return (
    <aside
      aria-labelledby="key-takeaways-heading"
      className="border-hairline bg-surface mb-5 rounded-[8px] border p-4"
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="key-takeaways-heading" className="text-ink text-[15px] font-bold">
          Key takeaways
        </h2>
        <span className="text-ink-3 text-[11px]">
          From the AI-written article below
        </span>
      </div>
      <ul className="text-ink-2 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </aside>
  );
}
