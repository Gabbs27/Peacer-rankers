import { NextRequest, NextResponse } from "next/server";
import { getChampionMasteryFor, getCurrentGame, getLeagueEntries } from "@/lib/riot-api";
import { getDDragonVersion } from "@/lib/data-dragon";
import { loadChampionList } from "@/lib/champion-client";
import { isValidRegion } from "@/lib/types";
import { riotErrorResponse } from "@/lib/api-helpers";
import { isPuuid, scoutPlayer, type ScoutedPlayer } from "@/lib/scouting";

async function championNames(): Promise<Map<number, string>> {
  try {
    const list = await loadChampionList(await getDDragonVersion());
    return new Map(list.map((c) => [Number(c.key), c.name]));
  } catch {
    return new Map();
  }
}

/**
 * Loading-screen scouting of YOUR current game:
 * GET /api/scout?puuid=<your Riot API PUUID>&region=la1
 *
 * The players come from the spectator API server-side, never from the caller,
 * so a request can only fan out to the players of a real live game (two
 * cached Riot calls each). That keeps the shared Riot key from being drained
 * with made-up ids, and only analyzes players the game already shows you.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region");

  if (!isPuuid(puuid) || !isValidRegion(region)) {
    return NextResponse.json({ error: "puuid y una región válida son requeridos" }, { status: 400 });
  }

  try {
    const game = await getCurrentGame(puuid, region);
    if (!game) return NextResponse.json({ inGame: false });

    const names = await championNames();
    const now = Date.now();
    // Riot's own list, capped at the largest lobby (Arena: 16 players).
    const participants = game.participants.slice(0, 16);

    // One player failing (rate limit, transient 5xx) must not hide the other nine.
    const settled = await Promise.allSettled(
      participants.map(async (p) => {
        if (!isPuuid(p.puuid)) throw new Error("bot or hidden player");
        const [entries, mastery] = await Promise.all([
          getLeagueEntries(p.puuid, region),
          getChampionMasteryFor(p.puuid, region, p.championId),
        ]);
        const soloQueue = entries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
        return scoutPlayer({ championName: names.get(p.championId) ?? "su campeón", soloQueue, mastery }, now);
      })
    );

    const players: ScoutedPlayer[] = participants.map((p, i) => {
      const base = {
        puuid: p.puuid,
        teamId: p.teamId,
        championId: p.championId,
        championName: names.get(p.championId) ?? "",
        riotId: p.riotId ?? null,
      };
      const result = settled[i];
      return result.status === "fulfilled"
        ? { ...base, ...result.value }
        : { ...base, rank: null, winrate: null, games: 0, signals: [], unavailable: true };
    });

    return NextResponse.json({ inGame: true, players }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    return riotErrorResponse(error);
  }
}
