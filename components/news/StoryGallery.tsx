import Image from "next/image";
import type { GalleryPhoto } from "@/lib/news/read";

/**
 * Extra photos on a story page (owner request, 2026-11-19: more than one image
 * once an article opens). They are ILLUSTRATIVE stock photos (Pexels), picked
 * by the story's section and place — not photos of the event — and are
 * labelled as such, each with its photographer credit. Served straight from
 * the Pexels CDN (hotlinking is permitted), lazy-loaded.
 */
export function StoryGallery({ photos }: { photos: GalleryPhoto[] }) {
  if (photos.length === 0) return null;
  return (
    <section aria-labelledby="story-photos-heading" className="mb-8">
      <h2 id="story-photos-heading" className="t-micro text-ink-3 mb-3">
        Illustrative photos
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {photos.map((p) => (
          <figure key={p.url} className="min-w-0">
            <div className="border-line bg-surface relative aspect-[16/10] w-full overflow-hidden rounded-[8px] border">
              <Image
                src={p.url}
                alt={p.alt}
                fill
                unoptimized
                loading="lazy"
                sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="text-text-low mt-1.5 text-[11px]">
              Photo:{" "}
              <a
                href={p.creditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-mid"
              >
                {p.credit}
              </a>{" "}
              / Pexels · illustrative, not of the event
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
