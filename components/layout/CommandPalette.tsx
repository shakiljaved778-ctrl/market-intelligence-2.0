"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SymbolMatch } from "@/lib/providers/types";

type Result = {
  group: "Instruments" | "Stories" | "Sections" | "Pages";
  label: string;
  sub?: string;
  href: string;
};

const PAGES: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Markets", href: "/markets" },
  { label: "Screener", href: "/markets/screener" },
  { label: "The wire", href: "/news" },
  { label: "Sections", href: "/sections" },
  { label: "Economy", href: "/economy" },
  { label: "Economic calendar", href: "/economy/calendar" },
  { label: "Methodology", href: "/methodology" },
  { label: "About", href: "/about" },
];

const SECTIONS: { label: string; id: string }[] = [
  { label: "Markets", id: "markets" },
  { label: "Economy", id: "economy" },
  { label: "Crypto", id: "crypto" },
  { label: "Real Estate", id: "realestate" },
  { label: "World", id: "world" },
  { label: "Tech & AI", id: "technology" },
  { label: "Health", id: "health" },
  { label: "Sports", id: "sports" },
  { label: "Culture", id: "entertainment" },
  { label: "Science", id: "science" },
  { label: "Eureka", id: "eureka" },
];

const RECENTS_KEY = "mi_cmd_recents";

function loadRecents(): Result[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as Result[]).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [instruments, setInstruments] = useState<SymbolMatch[]>([]);
  const [stories, setStories] = useState<
    { title: string; slug: string; section: string }[]
  >([]);
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<Result[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open on ⌘K / Ctrl+K, or "/" when not typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      const typing =
        document.activeElement instanceof HTMLElement &&
        ["input", "textarea", "select"].includes(
          document.activeElement.tagName.toLowerCase(),
        );
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (k === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      } else if (k === "escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
      setActive(0);
      queueMicrotask(() => inputRef.current?.focus());
    } else {
      setQ("");
      setInstruments([]);
      setStories([]);
    }
  }, [open]);

  // Debounced fetch of instruments + stories.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) {
      setInstruments([]);
      setStories([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const [sRes, wRes] = await Promise.all([
          fetch(`/api/market/search?q=${encodeURIComponent(term)}`),
          fetch(`/api/wire/search?q=${encodeURIComponent(term)}`),
        ]);
        const s = (await sRes.json()) as { matches: SymbolMatch[] };
        const w = (await wRes.json()) as {
          matches: { title: string; slug: string; section: string }[];
        };
        setInstruments(s.matches.slice(0, 6));
        setStories(w.matches.slice(0, 6));
        setActive(0);
      } catch {
        setInstruments([]);
        setStories([]);
      }
    }, 150);
    return () => clearTimeout(id);
  }, [q]);

  const results: Result[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return recents;
    const out: Result[] = [];
    for (const m of instruments)
      out.push({
        group: "Instruments",
        label: m.symbol,
        sub: m.name,
        href: `/quote/${m.symbol}`,
      });
    for (const s of stories)
      out.push({
        group: "Stories",
        label: s.title,
        sub: s.section,
        href: `/news/${s.slug}`,
      });
    for (const s of SECTIONS)
      if (s.label.toLowerCase().includes(term))
        out.push({ group: "Sections", label: s.label, href: `/news?section=${s.id}` });
    for (const p of PAGES)
      if (p.label.toLowerCase().includes(term))
        out.push({ group: "Pages", label: p.label, href: p.href });
    return out;
  }, [q, instruments, stories, recents]);

  const go = useCallback(
    (r: Result) => {
      try {
        const next = [r, ...loadRecents().filter((x) => x.href !== r.href)].slice(0, 5);
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setOpen(false);
      router.push(r.href);
    },
    [router],
  );

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]!);
    }
  }

  // Group the flat list for rendering while keeping a global index for nav.
  let idx = -1;
  const groups: Record<string, { r: Result; i: number }[]> = {};
  for (const r of results) {
    idx++;
    (groups[r.group] ??= []).push({ r, i: idx });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search (Command or Control + K)"
        className="border-hairline bg-surface text-ink-3 hover:text-ink hidden h-9 items-center gap-2 rounded-[6px] border px-2.5 text-[13px] transition-colors sm:flex"
      >
        <span aria-hidden>⌕</span>
        <span className="hidden md:inline">Search…</span>
        <kbd className="border-hairline text-ink-3 ml-1 hidden rounded-[3px] border px-1 font-mono text-[10px] md:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <button
            type="button"
            aria-label="Close search"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div
            className="border-hairline bg-surface relative w-full max-w-[560px] overflow-hidden rounded-[10px] border shadow-lg"
            onKeyDown={onListKey}
          >
            <div className="border-hairline flex items-center gap-2 border-b px-3">
              <span aria-hidden className="text-ink-3">
                ⌕
              </span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search instruments, stories, sections…"
                className="text-ink placeholder:text-ink-3 h-11 w-full bg-transparent text-[15px] outline-none"
                role="combobox"
                aria-expanded="true"
                aria-controls="cmd-list"
              />
              <kbd className="border-hairline text-ink-3 rounded-[3px] border px-1 font-mono text-[10px]">
                esc
              </kbd>
            </div>
            <ul
              id="cmd-list"
              role="listbox"
              className="max-h-[52vh] overflow-y-auto py-2"
            >
              {results.length === 0 ? (
                <li className="text-ink-3 px-4 py-6 text-center text-[13px]">
                  {q.trim() ? "No matches." : "Type to search, or pick a recent."}
                </li>
              ) : (
                Object.entries(groups).map(([group, items]) => (
                  <li key={group}>
                    <p className="t-micro text-ink-3 px-3 pt-2 pb-1">
                      {q.trim() ? group : "Recent"}
                    </p>
                    <ul>
                      {items.map(({ r, i }) => (
                        <li key={r.href + i}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active === i}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => go(r)}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] ${
                              active === i ? "bg-brand-soft text-ink" : "text-ink-2"
                            }`}
                          >
                            <span className="tnum shrink-0 font-medium">
                              {r.group === "Instruments" ? r.label : null}
                            </span>
                            <span className="truncate">
                              {r.group === "Instruments" ? r.sub : r.label}
                            </span>
                            {r.group !== "Instruments" && r.sub ? (
                              <span className="text-ink-3 ml-auto shrink-0 text-[12px] capitalize">
                                {r.sub}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
