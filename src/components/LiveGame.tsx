"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CurrentGameInfo } from "@/lib/types";
import {
  getChampionIconUrl,
  getSummonerSpellIconUrl,
  getQueueName,
  DDRAGON_VERSION,
} from "@/lib/data-dragon";

interface ChampionData {
  key: string;
  id: string;
  name: string;
}

interface LiveGameProps {
  puuid: string;
  region: string;
}

interface LiveGameData {
  inGame: boolean;
  game?: CurrentGameInfo;
  ranks?: Record<string, { tier: string; rank: string; lp: number } | null>;
  error?: string;
}

// Map champion ID (number) to champion name (Data Dragon key)
let championByIdCache: Record<number, string> | null = null;

async function getChampionById(): Promise<Record<number, string>> {
  if (championByIdCache) return championByIdCache;

  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US/champion.json`
  );
  const data = await res.json();
  const map: Record<number, string> = {};
  for (const champ of Object.values(data.data) as ChampionData[]) {
    map[parseInt(champ.key)] = champ.id;
  }
  championByIdCache = map;
  return map;
}

function formatGameTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function RankBadge({ rank }: { rank: { tier: string; rank: string; lp: number } | null }) {
  if (!rank) {
    return <span className="text-xs text-gray-500">Unranked</span>;
  }
  const tier = rank.tier.charAt(0) + rank.tier.slice(1).toLowerCase();
  return (
    <span className="text-xs font-medium text-yellow-400">
      {tier} {rank.rank}
    </span>
  );
}

export default function LiveGame({ puuid, region }: LiveGameProps) {
  const [data, setData] = useState<LiveGameData | null>(null);
  const [championMap, setChampionMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [is403, setIs403] = useState(false);

  useEffect(() => {
    async function fetchLiveGame() {
      try {
        const [res, champMap] = await Promise.all([
          fetch(`/api/live-game?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}`),
          getChampionById(),
        ]);
        setChampionMap(champMap);

        if (res.status === 403) {
          setIs403(true);
          setLoading(false);
          return;
        }

        const json = await res.json();
        setData(json);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchLiveGame();
  }, [puuid, region]);

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-48" />
      </div>
    );
  }

  if (is403) {
    return (
      <p className="text-xs text-gray-500 text-center">
        Spectator API no disponible con esta API key
      </p>
    );
  }

  if (!data || !data.inGame || !data.game) {
    return null;
  }

  const { game, ranks } = data;
  const blueTeam = game.participants.filter((p) => p.teamId === 100);
  const redTeam = game.participants.filter((p) => p.teamId === 200);
  const gameTime = game.gameLength > 0 ? formatGameTime(game.gameLength) : "Loading...";
  const queueName = getQueueName(game.gameQueueConfigId);

  return (
    <div className="bg-green-900/30 border border-green-600/40 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-green-400 font-semibold text-sm">EN PARTIDA</span>
        </div>
        <div className="text-xs text-gray-400">
          {queueName} &middot; {gameTime}
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blue Team */}
        <div>
          <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">
            Equipo Azul
          </h4>
          <div className="space-y-1.5">
            {blueTeam.map((p) => {
              const champName = championMap[p.championId] || "Unknown";
              const isCurrentPlayer = p.puuid === puuid;
              return (
                <div
                  key={p.puuid}
                  className={`flex items-center gap-2 rounded px-2 py-1 ${
                    isCurrentPlayer ? "bg-blue-900/40 ring-1 ring-blue-500/50" : "bg-gray-800/40"
                  }`}
                >
                  <Image
                    src={getChampionIconUrl(champName)}
                    alt={champName}
                    width={28}
                    height={28}
                    className="rounded"
                    unoptimized
                  />
                  <div className="flex items-center gap-1">
                    <Image
                      src={getSummonerSpellIconUrl(p.spell1Id)}
                      alt="Spell 1"
                      width={14}
                      height={14}
                      className="rounded-sm"
                      unoptimized
                    />
                    <Image
                      src={getSummonerSpellIconUrl(p.spell2Id)}
                      alt="Spell 2"
                      width={14}
                      height={14}
                      className="rounded-sm"
                      unoptimized
                    />
                  </div>
                  <span className="text-sm text-gray-200 flex-1 truncate">
                    {champName}
                  </span>
                  <RankBadge rank={ranks?.[p.puuid] ?? null} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Red Team */}
        <div>
          <h4 className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
            Equipo Rojo
          </h4>
          <div className="space-y-1.5">
            {redTeam.map((p) => {
              const champName = championMap[p.championId] || "Unknown";
              const isCurrentPlayer = p.puuid === puuid;
              return (
                <div
                  key={p.puuid}
                  className={`flex items-center gap-2 rounded px-2 py-1 ${
                    isCurrentPlayer ? "bg-red-900/40 ring-1 ring-red-500/50" : "bg-gray-800/40"
                  }`}
                >
                  <Image
                    src={getChampionIconUrl(champName)}
                    alt={champName}
                    width={28}
                    height={28}
                    className="rounded"
                    unoptimized
                  />
                  <div className="flex items-center gap-1">
                    <Image
                      src={getSummonerSpellIconUrl(p.spell1Id)}
                      alt="Spell 1"
                      width={14}
                      height={14}
                      className="rounded-sm"
                      unoptimized
                    />
                    <Image
                      src={getSummonerSpellIconUrl(p.spell2Id)}
                      alt="Spell 2"
                      width={14}
                      height={14}
                      className="rounded-sm"
                      unoptimized
                    />
                  </div>
                  <span className="text-sm text-gray-200 flex-1 truncate">
                    {champName}
                  </span>
                  <RankBadge rank={ranks?.[p.puuid] ?? null} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
