import { NextRequest, NextResponse } from "next/server";
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntries,
} from "@/lib/riot-api";
import { Region } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameName = searchParams.get("gameName");
  const tagLine = searchParams.get("tagLine");
  const region = searchParams.get("region") as Region;

  if (!gameName || !tagLine || !region) {
    return NextResponse.json(
      { error: "gameName, tagLine, and region are required" },
      { status: 400 }
    );
  }

  try {
    const account = await getAccountByRiotId(gameName, tagLine, region);
    const summoner = await getSummonerByPuuid(account.puuid, region);
    const ranked = await getLeagueEntries(summoner.id, region);

    return NextResponse.json({ account, summoner, ranked });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("404") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
