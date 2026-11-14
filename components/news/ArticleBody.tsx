/**
 * Renders an original AI-written article body (our content, never source text).
 * The input is simple markdown — paragraphs separated by blank lines, section
 * headings written as "## Heading" lines, and **bold** spans — so we parse it
 * safely without a markdown dependency or raw HTML injection.
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

type Block = { kind: "heading" | "paragraph"; text: string };

/** Split the body into headings and paragraphs. Exported for tests. */
export function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of md.split(/\n\n+/)) {
    const lines = chunk.split("\n");
    let para: string[] = [];
    const flush = () => {
      const text = para.join(" ").trim();
      if (text) blocks.push({ kind: "paragraph", text });
      para = [];
    };
    for (const line of lines) {
      const heading = /^#{1,4}\s+(.+?)\s*#*\s*$/.exec(line.trim());
      if (heading) {
        flush();
        blocks.push({ kind: "heading", text: heading[1]!.replace(/\*\*/g, "") });
      } else {
        para.push(line.trim());
      }
    }
    flush();
  }
  return blocks;
}

export function ArticleBody({ md }: { md: string }) {
  return (
    <div className="max-w-[68ch]">
      {parseBlocks(md).map((b, i) =>
        b.kind === "heading" ? (
          <h2 key={i} className="t-h3 font-editorial text-text-hi mt-8 first:mt-0">
            {b.text}
          </h2>
        ) : (
          <p
            key={i}
            className="font-editorial text-text-hi mt-4 text-[17px] leading-[1.7] first:mt-0"
          >
            {renderInline(b.text, String(i))}
          </p>
        ),
      )}
    </div>
  );
}
