import { NextRequest, NextResponse } from "next/server";
import { getCurrentGame, getLeagueEntries } from "@/lib/riot-api";
import { Region } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region") as Region;

  if (!puuid || !region) {
    return NextResponse.json({ error: "puuid and region required" }, { status: 400 });
  }

  try {
    const game = await getCurrentGame(puuid, region);
    if (!game) {
      return NextResponse.json({ inGame: false });
    }

    // Fetch ranks for all participants in batches of 5
    const ranks: Record<string, { tier: string; rank: string; lp: number } | null> = {};

    for (let i = 0; i < game.participants.length; i += 5) {
      const batch = game.participants.slice(i, i + 5);
      await Promise.allSettled(
        batch.map(async (p) => {
          try {
            const entries = await getLeagueEntries(p.puuid, region);
            const soloQ = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
            ranks[p.puuid] = soloQ
              ? { tier: soloQ.tier, rank: soloQ.rank, lp: soloQ.leaguePoints }
              : null;
          } catch {
            ranks[p.puuid] = null;
          }
        })
      );
      if (i + 5 < game.participants.length) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    return NextResponse.json({ inGame: true, game, ranks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("403")) {
      return NextResponse.json(
        { error: "Spectator API no disponible con esta API key" },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
