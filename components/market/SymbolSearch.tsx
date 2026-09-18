"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SymbolMatch } from "@/lib/providers/types";

/**
 * Symbol search (§13). Debounced, keyboard-operable, hits the cached search
 * API. Enter navigates to the top match's quote page.
 */
export function SymbolSearch({ className }: { className?: string } = {}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<SymbolMatch[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 1) {
      setMatches([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { matches: SymbolMatch[] };
        setMatches(data.matches);
        setOpen(true);
      } catch {
        setMatches([]);
      }
    }, 180);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(symbol: string) {
    setOpen(false);
    setQ("");
    router.push(`/quote/${symbol}`);
  }

  return (
    <div ref={boxRef} className={className ?? "relative hidden w-52 sm:block"}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => matches.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) go(matches[0].symbol);
        }}
        placeholder="Search symbol…"
        aria-label="Search symbol"
        className="border-line bg-surface text-text-hi placeholder:text-text-low w-full rounded-[6px] border px-3 py-1.5 text-[13px]"
      />
      {open && matches.length > 0 ? (
        <ul className="border-line bg-raised absolute z-50 mt-1 max-h-72 w-72 overflow-auto border shadow-lg">
          {matches.map((m) => (
            <li key={m.symbol}>
              <button
                type="button"
                onClick={() => go(m.symbol)}
                className="hover:bg-surface flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
              >
                <span className="tnum text-text-hi text-[13px]">{m.symbol}</span>
                <span className="text-text-low truncate text-[12px]">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
