"use client";

import Image from "next/image";
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
  latest = null,
}: {
  name: string;
  /** YouTube playlist id — a channel's uploads playlist is "UU" + its id. */
  listId: string;
  /** Muted accent for the drawn card (section-tint discipline, §12). */
  hue: string;
  /**
   * The channel's newest upload, when known (stored by the macro job via
   * oEmbed): the card then shows that video's picture and title, and play
   * starts from it (owner request, 2026-11-20: no blank cards).
   */
  latest?: { videoId: string; title: string; thumbnailUrl: string } | null;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="min-w-0">
      <div className="border-line bg-surface relative aspect-video w-full overflow-hidden rounded-[8px] border">
        {playing ? (
          <iframe
            src={
              latest
                ? `https://www.youtube-nocookie.com/embed/${latest.videoId}?list=${listId}&autoplay=1&rel=0`
                : `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&autoplay=1&rel=0`
            }
            title={`${name} — latest videos`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        ) : latest ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full text-left"
            aria-label={`Play ${latest.title} — latest from ${name}`}
          >
            <Image
              src={latest.thumbnailUrl}
              alt=""
              fill
              unoptimized
              loading="lazy"
              sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
            />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/2"
              style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}
            />
            <span className="absolute bottom-[7%] left-[6%] inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[11px] text-white/90 backdrop-blur-sm">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: hue }}
              />
              {name}
            </span>
            <span
              aria-hidden
              className="bg-ink/75 text-surface absolute top-1/2 left-1/2 inline-flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[18px] transition group-hover:scale-110"
            >
              ▶
            </span>
          </button>
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
        <span className="text-ink-3 text-[11px]">
          {latest ? `Latest · ${name} · YouTube` : `YouTube · ${name}`}
        </span>
        <span className="font-editorial text-ink mt-0.5 line-clamp-2 block text-[15px] leading-snug">
          {latest ? latest.title : `Latest videos · ${name}`}
        </span>
      </figcaption>
    </figure>
  );
}
