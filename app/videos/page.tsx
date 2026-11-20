import { WatchGrid } from "@/components/video/WatchGrid";
import { NoData } from "@/components/market/Provenance";
import { officialPlaylists } from "@/lib/videos/playlists";
import { pageMeta } from "@/lib/seo";
import { readVideos } from "@/lib/videos/read";

export const metadata = pageMeta(
  "/videos",
  "Videos from central banks and institutions",
  "The latest videos from the Federal Reserve, IMF and Bank of England — from their official YouTube channels.",
);

export default async function VideosPage() {
  const videos = await readVideos(24);
  const playlists = officialPlaylists();
  return (
    <div className="py-8">
      <p className="t-micro text-ink-3">Watch</p>
      <h1 className="t-h1 font-editorial text-ink mt-1">
        Videos from central banks and institutions
      </h1>
      <p className="text-ink-2 mt-3 max-w-[68ch] text-[16px]">
        Press conferences, speeches and explainers, newest first, from the official
        channels of the institutions that set policy.
      </p>
      <div className="mt-8">
        {videos.length > 0 || playlists.length > 0 ? (
          <WatchGrid videos={videos} playlists={playlists} />
        ) : (
          <NoData>No official video channels are configured.</NoData>
        )}
      </div>
    </div>
  );
}
