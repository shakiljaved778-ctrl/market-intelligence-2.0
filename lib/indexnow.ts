import { SITE_URL } from "./site";

/**
 * IndexNow (§6 SEO step 10). Notifies Bing/Yandex the moment a story is
 * published or substantially updated. Env-gated: a no-op without INDEXNOW_KEY,
 * so it never fails a build or a job that lacks the key.
 *
 * To activate: set INDEXNOW_KEY and host the key verification file at
 * https://www.mizaan.tech/<INDEXNOW_KEY>.txt (containing the key). Call
 * pingIndexNow([...urls]) from the ingest/cluster job after persisting.
 */
const ENDPOINT = "https://api.indexnow.org/indexnow";

export function isIndexNowConfigured(): boolean {
  return Boolean(process.env.INDEXNOW_KEY);
}

export async function pingIndexNow(urls: string[]): Promise<boolean> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) return false;
  const host = new URL(SITE_URL).host;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE_URL}/${key}.txt`,
        urlList: urls.slice(0, 10000),
      }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
