import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";

// Per-IP rate limit on the API routes so a single client can't drain the shared
// Riot API key (A1). Disabled gracefully when Upstash/KV isn't configured.
//
// Next 16 renamed the `middleware` file convention to `proxy`.
const redis = getRedis();
const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "10 s"),
      prefix: "ratelimit:api",
      analytics: false,
    })
  : null;

export const config = {
  matcher: "/api/:path*",
};

export async function proxy(request: NextRequest) {
  if (!ratelimit) return NextResponse.next();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera unos segundos e intenta de nuevo." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.max(0, Math.ceil((reset - Date.now()) / 1000)).toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
        },
      }
    );
  }

  return NextResponse.next();
}
