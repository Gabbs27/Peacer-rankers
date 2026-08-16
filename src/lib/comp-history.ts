// How the player has historically fared against a given TYPE of enemy
// composition, and which counter-items they actually bought.
//
// Deliberately avoids per-build winrates: a player has far too few games per
// (champion × comp × item) bucket for a percentage to mean anything. Instead we
// report counts and coverage — facts, not inferences — and always expose the
// sample size so the UI can be honest about it.

import type { MatchData, MatchParticipant } from "./types";
import { isRemake } from "./scoring";
import { analyzeEnemyTeam, type TeamAnalysis } from "./builds";

export type CompKind = "ap" | "ad" | "mixed" | "balanced";

export interface CompRecord {
  kind: CompKind;
  games: number;
  wins: number;
  /** Games where this player was on the same champion (subset of `games`). */
  sameChampionGames: number;
  /** itemId -> games in which the player finished with it. */
  itemCounts: Map<number, number>;
}

export interface CounterItemCoverage {
  itemId: number;
  name: string;
  reason: string;
  /** In how many of the historical games vs this comp kind you built it. */
  built: number;
  outOf: number;
}

export const COMP_LABELS: Record<CompKind, string> = {
  ap: "mayoría AP",
  ad: "mayoría AD",
  mixed: "mixta (AP + AD)",
  balanced: "equilibrada",
};

/** Bucket a composition into one of four broad kinds. */
export function classifyComp(analysis: TeamAnalysis): CompKind {
  // Heavy beats mixed: a 3-AP comp is an AP comp even if it also has 2 AD.
  if (analysis.isApHeavy && !analysis.isAdHeavy) return "ap";
  if (analysis.isAdHeavy && !analysis.isApHeavy) return "ad";
  if (analysis.isMixed) return "mixed";
  return "balanced";
}

/**
 * The player's record against a comp kind across their loaded history.
 * When `championName` is given, `sameChampionGames` counts the subset played
 * on that champion (useful to caveat the sample in the UI).
 */
export function recordVsComp(
  matches: MatchData[],
  puuid: string,
  kind: CompKind,
  championName?: string
): CompRecord {
  const record: CompRecord = {
    kind,
    games: 0,
    wins: 0,
    sameChampionGames: 0,
    itemCounts: new Map(),
  };

  for (const match of matches) {
    if (isRemake(match.info)) continue;
    const player = match.info.participants.find((p) => p.puuid === puuid);
    if (!player) continue;

    const analysis = analyzeEnemyTeam(match.info, player.teamId);
    if (classifyComp(analysis) !== kind) continue;

    record.games++;
    if (player.win) record.wins++;
    if (championName && player.championName === championName) record.sameChampionGames++;

    for (const itemId of finalItems(player)) {
      record.itemCounts.set(itemId, (record.itemCounts.get(itemId) ?? 0) + 1);
    }
  }

  return record;
}

/** The six build slots (trinket excluded), ignoring empty ones. */
export function finalItems(player: MatchParticipant): number[] {
  return [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5].filter(
    (id) => id && id !== 0
  );
}

/**
 * For each recommended counter-item, how often the player actually built it in
 * past games against this comp kind. Low coverage on a strong counter-item is
 * the actionable "blind spot".
 */
export function counterItemCoverage(
  recommended: { itemId: number; name: string; reason: string }[],
  record: CompRecord
): CounterItemCoverage[] {
  return recommended.map((item) => ({
    itemId: item.itemId,
    name: item.name,
    reason: item.reason,
    built: record.itemCounts.get(item.itemId) ?? 0,
    outOf: record.games,
  }));
}
