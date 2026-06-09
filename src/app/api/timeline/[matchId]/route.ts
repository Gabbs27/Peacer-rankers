import { NextRequest, NextResponse } from "next/server";
import { getMatch, getMatchTimeline } from "@/lib/riot-api";
import { analyzeTimeline } from "@/lib/timeline-insights";
import { isValidRegion } from "@/lib/types";
import { riotErrorResponse } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region");

  if (!matchId || !puuid || !isValidRegion(region)) {
    return NextResponse.json(
      { error: "matchId, puuid y una región válida son requeridos" },
      { status: 400 }
    );
  }

  try {
    const [match, timeline] = await Promise.all([
      getMatch(matchId, region),
      getMatchTimeline(matchId, region),
    ]);

    const insights = analyzeTimeline(timeline, match, puuid);
    if (!insights) {
      return NextResponse.json(
        { error: "El jugador no participó en esta partida" },
        { status: 404 }
      );
    }

    // A finished match's timeline never changes: max-age lets the BROWSER cache
    // (so re-expanding a card doesn't refetch or burn rate-limit tokens) and
    // s-maxage lets the CDN serve repeats across users.
    return NextResponse.json(insights, {
      headers: {
        "Cache-Control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, immutable",
      },
    });
  } catch (error) {
    return riotErrorResponse(error);
  }
}
