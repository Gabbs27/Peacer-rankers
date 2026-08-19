// Consolidates every analysis into a short, prioritised list of things to do in
// the next game. The profile shows a wall of panels; this answers "so what?".

import type { MatchData } from "./types";
import { computeWinFormula, formulaHeadline } from "./win-formula";
import { aggregateLossPattern } from "./loss-diagnosis";
import { analyzeTilt } from "./tilt";
import { matchupRecords, worstMatchup } from "./matchups";
import { isRemake } from "./scoring";

export type ActionKind = "formula" | "losses" | "tilt" | "matchup" | "champion";

export interface PlanAction {
  kind: ActionKind;
  title: string;
  detail: string;
  /** Higher runs first. */
  priority: number;
}

export interface TodayPlan {
  sampleSize: number;
  actions: PlanAction[];
  /** Your best champion by winrate with a usable sample, if any. */
  bestChampion: { championName: string; games: number; winrate: number } | null;
}

export function buildTodayPlan(matches: MatchData[], puuid: string): TodayPlan | null {
  const played = matches.filter((m) => {
    if (isRemake(m.info)) return false;
    return m.info.participants.some((p) => p.puuid === puuid);
  });
  if (played.length < 5) return null;

  const actions: PlanAction[] = [];

  // 1. The metric that most separates wins from losses.
  const formula = computeWinFormula(matches, puuid);
  if (formula?.topWeakness) {
    actions.push({
      kind: "formula",
      title: formula.topWeakness.label,
      detail: formulaHeadline(formula.topWeakness),
      priority: 100,
    });
  }

  // 2. The recurring reason your losses happen.
  const pattern = aggregateLossPattern(
    played
      .map((m) => {
        const player = m.info.participants.find((p) => p.puuid === puuid);
        return player ? { player, info: m.info } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  );
  if (pattern.dominant && pattern.advice && pattern.dominantCount >= 2) {
    actions.push({
      kind: "losses",
      title: `${pattern.dominantCount} de ${pattern.total} derrotas: ${pattern.dominant.label.toLowerCase()}`,
      detail: pattern.advice,
      priority: 90,
    });
  }

  // 3. When to stop playing.
  const tilt = analyzeTilt(matches, puuid);
  if (tilt?.verdict) {
    actions.push({ kind: "tilt", title: "Ritmo de juego", detail: tilt.verdict, priority: 80 });
  }

  // 4. The lane opponent that hurts most.
  const worst = worstMatchup(matchupRecords(matches, puuid));
  if (worst) {
    actions.push({
      kind: "matchup",
      title: `Cuidado con ${worst.opponent}`,
      detail: `${worst.wins}V-${worst.games - worst.wins}D contra ${worst.opponent}, con ${worst.avgGoldDiff} de oro de diferencia. Considera banearlo o cambiar de pick.`,
      priority: 70,
    });
  }

  // 5. What to play, based on your own results.
  const byChampion = new Map<string, { games: number; wins: number }>();
  for (const m of played) {
    const player = m.info.participants.find((p) => p.puuid === puuid);
    if (!player) continue;
    const entry = byChampion.get(player.championName) ?? { games: 0, wins: 0 };
    entry.games++;
    if (player.win) entry.wins++;
    byChampion.set(player.championName, entry);
  }
  const ranked = [...byChampion.entries()]
    .filter(([, v]) => v.games >= 3)
    .map(([championName, v]) => ({
      championName,
      games: v.games,
      winrate: Math.round((v.wins / v.games) * 100),
    }))
    .sort((a, b) => b.winrate - a.winrate || b.games - a.games);

  const bestChampion = ranked[0] ?? null;
  if (bestChampion && ranked.length > 1 && bestChampion.winrate >= 55) {
    actions.push({
      kind: "champion",
      title: `Juega ${bestChampion.championName}`,
      detail: `Es tu mejor resultado: ${bestChampion.winrate}% en ${bestChampion.games} partidas.`,
      priority: 60,
    });
  }

  actions.sort((a, b) => b.priority - a.priority);
  return { sampleSize: played.length, actions: actions.slice(0, 4), bestChampion };
}
