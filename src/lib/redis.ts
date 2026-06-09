import { Redis } from "@upstash/redis";

// Lazily build a single Upstash Redis client from env. Returns null when the
// credentials are absent, so the app degrades gracefully (direct fetch + Next
// Data Cache, no per-IP rate limiting) without any external setup — important
// for local dev and CI.
//
// Supports both Upstash-native and Vercel KV env var names.
let client: Redis | null = null;
let resolved = false;
let warned = false;

export function getRedis(): Redis | null {
  if (resolved) return client;
  resolved = true;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    if (!warned) {
      console.warn(
        "[redis] Upstash/Vercel KV env vars not set — distributed cache and per-IP rate limiting are disabled."
      );
      warned = true;
    }
    client = null;
    return null;
  }

  client = new Redis({ url, token });
  return client;
}
