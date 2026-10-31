"use client";

import { useState } from "react";

/** Share + copy-link buttons. Uses the Web Share API when available, else copy. */
export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function share() {
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title, url: window.location.href });
      } else {
        await copy();
      }
    } catch {
      /* user cancelled or unsupported */
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={share} className="btn btn-ghost text-[12px]">
        <span aria-hidden>↗</span> Share
      </button>
      <button type="button" onClick={copy} className="btn btn-ghost text-[12px]">
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
