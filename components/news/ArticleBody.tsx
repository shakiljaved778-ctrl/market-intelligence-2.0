/**
 * Renders an original AI-written article body (our content, never source text).
 * The input is simple markdown — paragraphs separated by blank lines, with
 * **bold** spans — so we parse it safely without a markdown dependency or raw
 * HTML injection.
 */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyBase}-${i}`} className="text-text-hi font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyBase}-${i}`}>{part}</span>;
  });
}

export function ArticleBody({ md }: { md: string }) {
  const paragraphs = md
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className="max-w-[68ch]">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="font-editorial text-text-hi mt-4 text-[17px] leading-[1.7] first:mt-0"
        >
          {renderInline(p, String(i))}
        </p>
      ))}
    </div>
  );
}
