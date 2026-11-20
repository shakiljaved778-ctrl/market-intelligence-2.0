"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * One official video (owner choice, 2026-11-19). A thumbnail and a play button
 * until the reader presses play — only then is YouTube's player loaded, so the
 * page itself makes no YouTube request. The standard youtube.com player (not
 * youtube-nocookie) is used so a signed-in reader is recognised: the
 * privacy-enhanced player hides that sign-in and YouTube then answers many
 * readers (VPNs especially) with "Sign in to confirm you're not a bot"
 * (owner report, 2026-11-20). "Watch on YouTube" is always offered as the
 * fallback; on a phone it opens the YouTube app.
 */
export function VideoCard({
  videoId,
  title,
  channelName,
  thumbnailUrl,
  publishedLabel,
}: {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  publishedLabel: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="min-w-0">
      <div className="border-line bg-surface relative aspect-video w-full overflow-hidden rounded-[8px] border">
        {playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full"
            aria-label={`Play video: ${title} (${channelName})`}
          >
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              unoptimized
              loading="lazy"
              sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
            />
            <span
              aria-hidden
              className="bg-ink/70 text-surface absolute top-1/2 left-1/2 inline-flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[18px] transition group-hover:scale-110"
            >
              ▶
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-2">
        <span className="text-ink-3 text-[11px]">
          {channelName} · {publishedLabel}
        </span>
        <span className="font-editorial text-ink mt-0.5 line-clamp-2 block text-[15px] leading-snug">
          {title}
        </span>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-3 hover:text-ink mt-1 inline-block text-[11px] underline-offset-2 hover:underline"
        >
          Watch on YouTube ↗
        </a>
      </figcaption>
    </figure>
  );
}
