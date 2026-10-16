import { NextRequest, NextResponse } from "next/server";
import { getChampionMasteryFor, getLeagueEntries } from "@/lib/riot-api";
import { isValidRegion } from "@/lib/types";
import { parseScoutPlayers, scoutPlayer, type ScoutReport } from "@/lib/scouting";

type ScoutResponseEntry = ScoutReport & { puuid: string; championName: string; unavailable?: true };

/**
 * Loading-screen scouting for up to 10 players:
 * GET /api/scout?region=la1&players=puuid:championId:ChampionName,...
 * Two Riot calls per player (rank + mastery on that champion), both cached.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const region = searchParams.get("region");
  const players = parseScoutPlayers(searchParams.get("players"));

  if (!isValidRegion(region) || !players) {
    return NextResponse.json(
      { error: "Se requiere una región válida y de 1 a 10 jugadores (puuid:championId:Campeón)." },
      { status: 400 }
    );
  }

  const now = Date.now();
  const settled = await Promise.allSettled(
    players.map(async (player): Promise<ScoutResponseEntry> => {
      const [entries, mastery] = await Promise.all([
        getLeagueEntries(player.puuid, region),
        getChampionMasteryFor(player.puuid, region, player.championId),
      ]);
      const soloQueue = entries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
      const report = scoutPlayer({ championName: player.championName, soloQueue, mastery }, now);
      return { puuid: player.puuid, championName: player.championName, ...report };
    })
  );

  // One player failing (rate limit, transient 5xx) must not hide the other nine.
  const reports = settled.map((result, i): ScoutResponseEntry =>
    result.status === "fulfilled"
      ? result.value
      : {
          puuid: players[i].puuid,
          championName: players[i].championName,
          rank: null,
          winrate: null,
          games: 0,
          signals: [],
          unavailable: true,
        }
  );

  return NextResponse.json({ reports }, { headers: { "Cache-Control": "private, max-age=60" } });
}
