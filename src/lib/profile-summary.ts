// Headline numbers for the profile sidebar: record, averages and current
// streak over the loaded sample. Remakes are counted separately and excluded
// from every average — a 3-minute game says nothing about how you play.

import type { MatchData } from "./types";
import { calculatePerformanceScore, isRemake } from "./scoring";

export interface RecentSummary {
  games: number;
  wins: number;
  losses: number;
  /** 0-100, rounded. */
  winrate: number;
  remakes: number;
  /** Per-game averages. */
  kills: number;
  deaths: number;
  assists: number;
  /** (K+A)/D over the whole sample; null when you never died. */
  kda: number | null;
  csPerMin: number;
  /** Average kill participation, 0-100. */
  killParticipation: number;
  /** Average performance score, 0-100. */
  avgScore: number;
  /** Consecutive identical results from the newest game; null below 2. */
  streak: { result: "W" | "L"; count: number } | null;
}

export function summarizeRecent(matches: MatchData[], puuid: string): RecentSummary | null {
  let remakes = 0;
  let wins = 0;
  let kills = 0;
  let deaths = 0;
  let assists = 0;
  let cs = 0;
  let minutes = 0;
  let kpSum = 0;
  let scoreSum = 0;
  const results: ("W" | "L")[] = [];

  for (const match of matches) {
    const me = match.info.participants.find((p) => p.puuid === puuid);
    if (!me) continue;
    if (isRemake(match.info)) {
      remakes++;
      continue;
    }

    results.push(me.win ? "W" : "L");
    if (me.win) wins++;
    kills += me.kills;
    deaths += me.deaths;
    assists += me.assists;
    cs += me.totalMinionsKilled + me.neutralMinionsKilled;
    minutes += match.info.gameDuration / 60;

    const teamKills = match.info.participants
      .filter((p) => p.teamId === me.teamId)
      .reduce((sum, p) => sum + p.kills, 0);
    kpSum += teamKills > 0 ? ((me.kills + me.assists) / teamKills) * 100 : 0;
    scoreSum += calculatePerformanceScore(me, match.info).overall;
  }

  const games = results.length;
  if (games === 0) return null;

  // `matches` is newest-first, so the streak runs from the front.
  let count = 0;
  while (count < results.length && results[count] === results[0]) count++;

  return {
    games,
    wins,
    losses: games - wins,
    winrate: Math.round((wins / games) * 100),
    remakes,
    kills: kills / games,
    deaths: deaths / games,
    assists: assists / games,
    kda: deaths === 0 ? null : (kills + assists) / deaths,
    csPerMin: minutes > 0 ? cs / minutes : 0,
    killParticipation: kpSum / games,
    avgScore: Math.round(scoreSum / games),
    streak: count >= 2 ? { result: results[0], count } : null,
  };
}
