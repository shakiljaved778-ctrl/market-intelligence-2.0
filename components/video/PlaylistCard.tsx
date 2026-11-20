"use client";

import { useState } from "react";

/**
 * An institution's latest videos (owner request, 2026-11-20: no YouTube key).
 * The card is drawn by us — no request to YouTube, no thumbnail fetch — until
 * the reader presses play; then YouTube's own player loads the channel's
 * uploads playlist from youtube-nocookie.com, newest first. YouTube keeps the
 * playlist current, so this needs no key, no job and no stored data.
 */
export function PlaylistCard({
  name,
  listId,
  hue,
}: {
  name: string;
  /** YouTube playlist id — a channel's uploads playlist is "UU" + its id. */
  listId: string;
  /** Muted accent for the drawn card (section-tint discipline, §12). */
  hue: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="min-w-0">
      <div className="border-line bg-surface relative aspect-video w-full overflow-hidden rounded-[8px] border">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&autoplay=1&rel=0`}
            title={`${name} — latest videos`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex h-full w-full flex-col justify-between p-[7%] text-left"
            aria-label={`Play the latest videos from ${name}`}
            style={{
              background: `radial-gradient(120% 90% at 85% 10%, color-mix(in srgb, ${hue} 26%, transparent), transparent 60%), linear-gradient(135deg, var(--raised-2), var(--surface))`,
            }}
          >
            <span className="text-ink-3 text-[10px] font-medium tracking-[0.2em] uppercase">
              Official channel · latest
            </span>
            <span>
              <span
                aria-hidden
                className="mb-2 block h-[3px] w-10 rounded-full"
                style={{ background: hue }}
              />
              <span className="display text-ink block text-[clamp(1.5rem,3.2vw,2.1rem)] leading-none">
                {name}
              </span>
            </span>
            <span
              aria-hidden
              className="bg-ink/75 text-surface absolute right-[7%] bottom-[9%] inline-flex h-11 w-11 items-center justify-center rounded-full text-[16px] transition group-hover:scale-110"
            >
              ▶
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-2">
        <span className="text-ink-3 text-[11px]">YouTube · {name}</span>
        <span className="font-editorial text-ink mt-0.5 block text-[15px] leading-snug">
          Latest videos from the {name}
        </span>
      </figcaption>
    </figure>
  );
}
