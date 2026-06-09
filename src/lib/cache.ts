import { unstable_cache } from "next/cache";
import { getRedis } from "./redis";

/**
 * Read-through cache for expensive (Riot API) calls.
 *
 * - With Upstash/Vercel KV configured: a shared, cross-instance Redis cache.
 * - Without it: Next's Data Cache via unstable_cache (already shared & persistent
 *   on Vercel), so behavior degrades gracefully with zero setup.
 *
 * The fetcher only runs on a miss, and a throw is NEVER cached (so a 404/429/5xx
 * is not persisted). Redis hiccups fall back to a direct fetch.
 */
export async function cached<T>(
  keyParts: string[],
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const redis = getRedis();

  if (redis) {
    const key = `riot:${keyParts.join(":")}`;
    try {
      const hit = await redis.get<T>(key);
      if (hit !== null && hit !== undefined) return hit;
    } catch (error) {
      console.error("[cache] redis get failed, fetching directly:", error);
      return fetcher();
    }

    const fresh = await fetcher(); // a throw here propagates and is never cached
    try {
      await redis.set(key, fresh, { ex: ttlSeconds });
    } catch (error) {
      console.error("[cache] redis set failed (non-fatal):", error);
    }
    return fresh;
  }

  return unstable_cache(fetcher, keyParts, { revalidate: ttlSeconds })();
}
