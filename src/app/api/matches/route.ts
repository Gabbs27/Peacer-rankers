import { NextRequest, NextResponse } from "next/server";
import { getMatchIds, getMatches } from "@/lib/riot-api";
import { isValidRegion } from "@/lib/types";
import { riotErrorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region");
  const rawCount = parseInt(searchParams.get("count") || "10");
  const rawStart = parseInt(searchParams.get("start") || "0");
  const count = Number.isFinite(rawCount) ? Math.min(Math.max(rawCount, 1), 20) : 10;
  const start = Number.isFinite(rawStart) ? Math.max(rawStart, 0) : 0;
  const rawQueue = searchParams.get("queue");
  const parsedQueue = rawQueue ? parseInt(rawQueue) : undefined;
  const queue = parsedQueue !== undefined && Number.isFinite(parsedQueue) ? parsedQueue : undefined;

  if (!puuid || !isValidRegion(region)) {
    return NextResponse.json(
      { error: "puuid y una región válida son requeridos" },
      { status: 400 }
    );
  }

  try {
    const matchIds = await getMatchIds(puuid, region, count, start, queue);
    const matches = await getMatches(matchIds, region);
    return NextResponse.json({ matches, hasMore: matchIds.length === count });
  } catch (error) {
    return riotErrorResponse(error);
  }
}
