// Pure aggregations over the loaded match history: frequent premades, per-role
// winrates, and recent form. Zero extra fetches — everything derives from the
// matches already in memory.

import type { MatchData, MatchParticipant } from "./types";
import { isRemake } from "./scoring";

export interface TeammateStats {
  puuid: string;
  gameName: string;
  tagLine: string;
  games: number;
  wins: number;
  winrate: number; // 0-100, rounded
}

export interface RoleStats {
  position: string; // TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY
  games: number;
  wins: number;
  winrate: number; // 0-100, rounded
}

export type FormResult = "W" | "L";

function lanePositionOf(p: MatchParticipant): string {
  return p.teamPosition || p.individualPosition;
}

/**
 * Players who appear on YOUR team in 2+ of the loaded matches (likely premades),
 * with your shared winrate. Sorted by games together, then winrate.
 */
export function frequentTeammates(
  matches: MatchData[],
  myPuuid: string,
  minGames: number = 2
): TeammateStats[] {
  const byPuuid = new Map<string, TeammateStats>();

  for (const match of matches) {
    if (isRemake(match.info)) continue;
    const me = match.info.participants.find((p) => p.puuid === myPuuid);
    if (!me) continue;

    for (const ally of match.info.participants) {
      if (ally.teamId !== me.teamId || ally.puuid === myPuuid) continue;
      // A profile link needs a Riot ID; skip allies without one (old matches).
      if (!ally.riotIdGameName || !ally.riotIdTagline) continue;

      const entry = byPuuid.get(ally.puuid) ?? {
        puuid: ally.puuid,
        gameName: ally.riotIdGameName,
        tagLine: ally.riotIdTagline,
        games: 0,
        wins: 0,
        winrate: 0,
      };
      entry.games++;
      if (me.win) entry.wins++;
      byPuuid.set(ally.puuid, entry);
    }
  }

  return [...byPuuid.values()]
    .filter((t) => t.games >= minGames)
    .map((t) => ({ ...t, winrate: Math.round((t.wins / t.games) * 100) }))
    .sort((a, b) => b.games - a.games || b.winrate - a.winrate);
}

/** Games and winrate per position, most-played first. */
export function roleStats(matches: MatchData[], myPuuid: string): RoleStats[] {
  const byRole = new Map<string, { games: number; wins: number }>();

  for (const match of matches) {
    if (isRemake(match.info)) continue;
    const me = match.info.participants.find((p) => p.puuid === myPuuid);
    if (!me) continue;
    const pos = lanePositionOf(me);
    if (!pos || pos === "Invalid") continue;

    const entry = byRole.get(pos) ?? { games: 0, wins: 0 };
    entry.games++;
    if (me.win) entry.wins++;
    byRole.set(pos, entry);
  }

  return [...byRole.entries()]
    .map(([position, { games, wins }]) => ({
      position,
      games,
      wins,
      winrate: Math.round((wins / games) * 100),
    }))
    .sort((a, b) => b.games - a.games);
}

/**
 * W/L results of the most recent non-remake games, newest first,
 * capped at `limit` (for the form-dots row).
 */
export function recentForm(
  matches: MatchData[],
  myPuuid: string,
  limit: number = 10
): FormResult[] {
  const results: FormResult[] = [];
  for (const match of matches) {
    if (results.length >= limit) break;
    if (isRemake(match.info)) continue;
    const me = match.info.participants.find((p) => p.puuid === myPuuid);
    if (!me) continue;
    results.push(me.win ? "W" : "L");
  }
  return results;
}
