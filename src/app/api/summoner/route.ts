import { NextRequest, NextResponse } from "next/server";
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntries,
} from "@/lib/riot-api";
import { isValidRegion } from "@/lib/types";
import { riotErrorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameName = searchParams.get("gameName");
  const tagLine = searchParams.get("tagLine");
  const region = searchParams.get("region");

  if (!gameName || !tagLine || !isValidRegion(region)) {
    return NextResponse.json(
      { error: "gameName, tagLine y una región válida son requeridos" },
      { status: 400 }
    );
  }

  try {
    const account = await getAccountByRiotId(gameName, tagLine, region);
    const [summoner, ranked] = await Promise.all([
      getSummonerByPuuid(account.puuid, region),
      getLeagueEntries(account.puuid, region),
    ]);

    return NextResponse.json({ account, summoner, ranked });
  } catch (error) {
    return riotErrorResponse(error);
  }
}
