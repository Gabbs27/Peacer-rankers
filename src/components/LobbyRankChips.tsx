"use client";

import type { MatchInfo, MatchParticipant } from "@/lib/types";
import { lobbyRanks } from "@/lib/lobby-rank";

interface Props {
  player: MatchParticipant;
  matchInfo: MatchInfo;
}

function rankColor(rank: number, total: number): string {
  if (rank <= Math.ceil(total * 0.3)) return "text-[#e3c98a]"; // top ~30% — gold
  if (rank > Math.ceil(total * 0.7)) return "text-red-300"; // bottom ~30%
  return "text-gray-200";
}

function ordinal(rank: number): string {
  return `${rank}.º`;
}

export default function LobbyRankChips({ player, matchInfo }: Props) {
  const ranks = lobbyRanks(player, matchInfo);
  return (
    <div>
      <p className="text-xs text-gray-300 uppercase mb-1.5">Vs los 10 de la partida</p>
      <div className="flex flex-wrap gap-2">
        {ranks.map((r) => (
          <div key={r.label} className="bg-gray-800/60 rounded px-2.5 py-1.5 text-xs">
            <span className="text-gray-400">{r.label}: </span>
            <span className={`font-semibold ${rankColor(r.rank, r.total)}`}>
              {ordinal(r.rank)} de {r.total}
            </span>
            <span className="text-gray-500 ml-1">({r.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
