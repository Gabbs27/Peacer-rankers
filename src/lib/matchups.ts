// Head-to-head record against the champions you actually face in your lane.
// Uses end-of-game data only (no timeline fetches), so it can run over the whole
// loaded history for free. Answers "who should I ban / who do I dread?".

import type { MatchData, MatchParticipant } from "./types";
import { isRemake } from "./scoring";

export interface MatchupRecord {
  opponent: string;
  games: number;
  wins: number;
  winrate: number; // 0-100
  /** Average end-of-game gold difference vs that opponent (negative = behind). */
  avgGoldDiff: number;
  /** Average end-of-game CS difference. */
  avgCsDiff: number;
  /** Your champions used in those games, most frequent first. */
  yourChampions: string[];
}

const LANE_POSITIONS = new Set(["TOP", "MIDDLE", "BOTTOM", "JUNGLE", "UTILITY"]);

function laneOf(p: MatchParticipant): string {
  return p.teamPosition || p.individualPosition;
}

function csOf(p: MatchParticipant): number {
  return p.totalMinionsKilled + p.neutralMinionsKilled;
}

/**
 * The direct opponent is the enemy in the SAME position. teamPosition is Riot's
 * constraint-solved field (one per role per team); when it is missing or the
 * match is ambiguous we skip the game rather than guess.
 */
export function findLaneOpponent(
  player: MatchParticipant,
  participants: MatchParticipant[]
): MatchParticipant | null {
  const lane = laneOf(player);
  if (!lane || lane === "Invalid" || !LANE_POSITIONS.has(lane)) return null;
  const candidates = participants.filter((p) => p.teamId !== player.teamId && laneOf(p) === lane);
  return candidates.length === 1 ? candidates[0] : null;
}

export function matchupRecords(
  matches: MatchData[],
  puuid: string,
  minGames: number = 2
): MatchupRecord[] {
  interface Acc {
    games: number;
    wins: number;
    goldDiff: number;
    csDiff: number;
    champs: Map<string, number>;
  }
  const byOpponent = new Map<string, Acc>();

  for (const match of matches) {
    if (isRemake(match.info)) continue;
    const player = match.info.participants.find((p) => p.puuid === puuid);
    if (!player) continue;
    const opponent = findLaneOpponent(player, match.info.participants);
    if (!opponent) continue;

    const acc = byOpponent.get(opponent.championName) ?? {
      games: 0,
      wins: 0,
      goldDiff: 0,
      csDiff: 0,
      champs: new Map<string, number>(),
    };
    acc.games++;
    if (player.win) acc.wins++;
    acc.goldDiff += player.goldEarned - opponent.goldEarned;
    acc.csDiff += csOf(player) - csOf(opponent);
    acc.champs.set(player.championName, (acc.champs.get(player.championName) ?? 0) + 1);
    byOpponent.set(opponent.championName, acc);
  }

  return [...byOpponent.entries()]
    .filter(([, a]) => a.games >= minGames)
    .map(([opponent, a]) => ({
      opponent,
      games: a.games,
      wins: a.wins,
      winrate: Math.round((a.wins / a.games) * 100),
      avgGoldDiff: Math.round(a.goldDiff / a.games),
      avgCsDiff: Math.round(a.csDiff / a.games),
      yourChampions: [...a.champs.entries()].sort((x, y) => y[1] - x[1]).map(([c]) => c),
    }))
    .sort((a, b) => a.winrate - b.winrate || a.avgGoldDiff - b.avgGoldDiff);
}

/** The matchup that hurts most: lowest winrate with a usable sample. */
export function worstMatchup(records: MatchupRecord[]): MatchupRecord | null {
  const usable = records.filter((r) => r.games >= 2 && r.winrate <= 40);
  return usable[0] ?? null;
}
