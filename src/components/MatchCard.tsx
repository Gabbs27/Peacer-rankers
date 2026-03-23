"use client";

import { useState } from "react";
import { MatchData, MatchParticipant } from "@/lib/types";
import { formatDuration, getKDA, getQueueName } from "@/lib/data-dragon";
import { generateTips } from "@/lib/tips";
import ChampionIcon from "./ChampionIcon";
import ItemIcon from "./ItemIcon";
import TipsBadge from "./TipsBadge";

interface Props {
  match: MatchData;
  puuid: string;
}

export default function MatchCard({ match, puuid }: Props) {
  const [expanded, setExpanded] = useState(false);
  const player = match.info.participants.find((p) => p.puuid === puuid);

  if (!player) return null;

  const tips = generateTips(player, match.info);
  const timeSince = getTimeSince(match.info.gameCreation);
  const items = [
    player.item0,
    player.item1,
    player.item2,
    player.item3,
    player.item4,
    player.item5,
  ];

  return (
    <div
      className={`rounded-lg border ${
        player.win
          ? "bg-blue-950/30 border-blue-800/50"
          : "bg-red-950/30 border-red-800/50"
      }`}
    >
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
      >
        {/* Win/Loss indicator */}
        <div
          className={`w-1 h-16 rounded-full ${
            player.win ? "bg-blue-500" : "bg-red-500"
          }`}
        />

        {/* Champion */}
        <div className="flex flex-col items-center gap-1">
          <ChampionIcon championName={player.championName} size={48} />
          <span className="text-xs text-gray-400">
            Lv{player.champLevel}
          </span>
        </div>

        {/* KDA */}
        <div className="min-w-[100px]">
          <p className="font-bold">
            {player.kills}/{player.deaths}/{player.assists}
          </p>
          <p className="text-sm text-gray-400">
            {getKDA(player.kills, player.deaths, player.assists)} KDA
          </p>
        </div>

        {/* CS */}
        <div className="min-w-[80px] hidden sm:block">
          <p className="text-sm">
            {player.totalMinionsKilled + player.neutralMinionsKilled} CS
          </p>
          <p className="text-xs text-gray-400">
            {(
              (player.totalMinionsKilled + player.neutralMinionsKilled) /
              (match.info.gameDuration / 60)
            ).toFixed(1)}{" "}
            /min
          </p>
        </div>

        {/* Items */}
        <div className="flex gap-1 hidden md:flex">
          {items.map((item, i) => (
            <ItemIcon key={i} itemId={item} size={28} />
          ))}
        </div>

        {/* Game info */}
        <div className="ml-auto text-right">
          <p
            className={`text-sm font-semibold ${
              player.win ? "text-blue-400" : "text-red-400"
            }`}
          >
            {player.win ? "Victoria" : "Derrota"}
          </p>
          <p className="text-xs text-gray-400">
            {getQueueName(match.info.queueId)}
          </p>
          <p className="text-xs text-gray-500">
            {formatDuration(match.info.gameDuration)} - {timeSince}
          </p>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-700 p-4">
          {/* Tips */}
          {tips.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">
                Feedback
              </h4>
              <div className="flex flex-wrap gap-2">
                {tips.map((tip, i) => (
                  <TipsBadge key={i} tip={tip} />
                ))}
              </div>
            </div>
          )}

          {/* All players */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[100, 200].map((teamId) => (
              <div key={teamId}>
                <h4
                  className={`text-sm font-semibold mb-2 ${
                    teamId === 100 ? "text-blue-400" : "text-red-400"
                  }`}
                >
                  {teamId === 100 ? "Equipo Azul" : "Equipo Rojo"}
                </h4>
                <div className="space-y-1">
                  {match.info.participants
                    .filter((p) => p.teamId === teamId)
                    .map((p) => (
                      <div
                        key={p.puuid}
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          p.puuid === puuid ? "bg-white/10" : ""
                        }`}
                      >
                        <ChampionIcon
                          championName={p.championName}
                          size={28}
                        />
                        <span className="flex-1 truncate">
                          {p.riotIdGameName || p.summonerName}
                        </span>
                        <span className="text-gray-400">
                          {p.kills}/{p.deaths}/{p.assists}
                        </span>
                        <span className="text-gray-500 text-xs w-16 text-right">
                          {p.totalDamageDealtToChampions.toLocaleString()} dmg
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeSince(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `hace ${days}d`;
  if (hours > 0) return `hace ${hours}h`;
  return `hace ${minutes}m`;
}
