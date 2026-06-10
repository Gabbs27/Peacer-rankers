// Honest, dataset-free percentiles: rank the player's stats against the other
// 9 players in the SAME match. "3.º de 10 en daño" is real and verifiable,
// unlike rank-equivalent guesses that would need population data.

import type { MatchInfo, MatchParticipant } from "./types";

export interface LobbyRank {
  label: string;
  rank: number; // 1 = best in the lobby
  total: number;
  value: string;
}

function rankOf(values: number[], mine: number): number {
  // 1 + number of players strictly better; ties share the better rank.
  return 1 + values.filter((v) => v > mine).length;
}

export function lobbyRanks(player: MatchParticipant, matchInfo: MatchInfo): LobbyRank[] {
  const all = matchInfo.participants;
  const total = all.length;
  const minutes = Math.max(matchInfo.gameDuration / 60, 1);

  const damage = all.map((p) => p.totalDamageDealtToChampions);
  const gold = all.map((p) => p.goldEarned);
  const vision = all.map((p) => p.visionScore);
  const cs = all.map((p) => p.totalMinionsKilled + p.neutralMinionsKilled);

  const myCs = player.totalMinionsKilled + player.neutralMinionsKilled;

  return [
    {
      label: "Daño",
      rank: rankOf(damage, player.totalDamageDealtToChampions),
      total,
      value: `${(player.totalDamageDealtToChampions / 1000).toFixed(1)}k`,
    },
    {
      label: "Oro",
      rank: rankOf(gold, player.goldEarned),
      total,
      value: `${(player.goldEarned / 1000).toFixed(1)}k`,
    },
    {
      label: "Visión",
      rank: rankOf(vision, player.visionScore),
      total,
      value: String(player.visionScore),
    },
    {
      label: "CS/min",
      rank: rankOf(cs, myCs),
      total,
      value: (myCs / minutes).toFixed(1),
    },
  ];
}
