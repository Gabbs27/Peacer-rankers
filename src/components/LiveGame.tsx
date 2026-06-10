"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CurrentGameInfo } from "@/lib/types";
import {
  getChampionIconUrl,
  getSummonerSpellIconUrl,
  getQueueName,
  getChampionDataUrl,
} from "@/lib/data-dragon";
import { useDDragonVersion } from "./DDragonProvider";

const POLL_INTERVAL_MS = 60_000;

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

// Map champion ID (number) to champion name (Data Dragon key), cached per version.
const championByIdCache = new Map<string, Record<number, string>>();

async function getChampionById(version: string): Promise<Record<number, string>> {
  const cached = championByIdCache.get(version);
  if (cached) return cached;

  const res = await fetch(getChampionDataUrl(version));
  const data = await res.json();
  const map: Record<number, string> = {};
  for (const champ of Object.values(data.data) as ChampionData[]) {
    map[parseInt(champ.key)] = champ.id;
  }
  championByIdCache.set(version, map);
  return map;
}

function formatGameTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function RankBadge({ rank }: { rank: { tier: string; rank: string; lp: number } | null }) {
  if (!rank) {
    return <span className="text-xs text-gray-500">Sin clasificar</span>;
  }
  const tier = rank.tier.charAt(0) + rank.tier.slice(1).toLowerCase();
  return (
    <span className="text-xs font-medium text-[#e3c98a]">
      {tier} {rank.rank}
    </span>
  );
}

export default function LiveGame({ puuid, region }: LiveGameProps) {
  const ddragonVersion = useDDragonVersion();
  const [data, setData] = useState<LiveGameData | null>(null);
  const [championMap, setChampionMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [is403, setIs403] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Polls every 60s so the banner appears when a game starts, without a manual
  // refresh. Spectator data lags ~2-3 min behind real time by Riot design.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function check() {
      try {
        const [res, champMap] = await Promise.all([
          fetch(`/api/live-game?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}`),
          getChampionById(ddragonVersion),
        ]);
        if (cancelled) return;
        setChampionMap(champMap);

        if (res.status === 403) {
          setIs403(true);
          return; // do not keep polling a key that lacks spectator access
        }

        const json = await res.json();
        if (cancelled) return;
        setData(json);
        setLastChecked(new Date());
        timer = setTimeout(check, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) {
          setData(null);
          timer = setTimeout(check, POLL_INTERVAL_MS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [puuid, region, ddragonVersion]);

  if (loading) {
    return (
      <div className="panel p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-48" />
      </div>
    );
  }

  if (is403) {
    return (
      <p className="text-xs text-gray-500 text-center">
        La API de espectador no está disponible con esta API key
      </p>
    );
  }

  if (!data || !data.inGame || !data.game) {
    return (
      <div className="panel px-4 py-2.5 flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-2">
          <span className="inline-flex rounded-full h-2 w-2 bg-gray-500" aria-hidden />
          No está en partida ahora mismo
        </span>
        <span className="text-gray-500">
          Se comprueba cada minuto
          {lastChecked &&
            ` · última: ${lastChecked.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`}
        </span>
      </div>
    );
  }

  const { game, ranks } = data;
  const blueTeam = game.participants.filter((p) => p.teamId === 100);
  const redTeam = game.participants.filter((p) => p.teamId === 200);
  const gameTime = game.gameLength > 0 ? formatGameTime(game.gameLength) : "Empezando…";
  const queueName = getQueueName(game.gameQueueConfigId);

  return (
    <div className="rounded-xl border border-green-500/40 bg-green-950/20 p-4 space-y-4 shadow-[0_0_28px_-10px_rgba(34,197,94,0.45)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="font-display text-green-400 font-semibold text-sm tracking-wide">
            EN PARTIDA
          </span>
        </div>
        <div className="text-xs text-gray-400">
          {queueName} &middot; {gameTime}
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Equipo Azul", team: blueTeam, color: "text-blue-400", ring: "bg-blue-900/40 ring-1 ring-blue-500/50" },
          { label: "Equipo Rojo", team: redTeam, color: "text-red-400", ring: "bg-red-900/40 ring-1 ring-red-500/50" },
        ].map(({ label, team, color, ring }) => (
          <div key={label}>
            <h4 className={`text-xs font-semibold ${color} mb-2 uppercase tracking-wide`}>
              {label}
            </h4>
            <div className="space-y-1.5">
              {team.map((p) => {
                const champName = championMap[p.championId] || "Desconocido";
                const isCurrentPlayer = p.puuid === puuid;
                return (
                  <div
                    key={p.puuid}
                    className={`flex items-center gap-2 rounded px-2 py-1 ${
                      isCurrentPlayer ? ring : "bg-gray-800/40"
                    }`}
                  >
                    <Image
                      src={getChampionIconUrl(champName, ddragonVersion)}
                      alt={champName}
                      width={28}
                      height={28}
                      className="rounded"
                      unoptimized
                    />
                    <div className="flex items-center gap-1">
                      <Image
                        src={getSummonerSpellIconUrl(p.spell1Id, ddragonVersion)}
                        alt="Hechizo 1"
                        width={14}
                        height={14}
                        className="rounded-sm"
                        unoptimized
                      />
                      <Image
                        src={getSummonerSpellIconUrl(p.spell2Id, ddragonVersion)}
                        alt="Hechizo 2"
                        width={14}
                        height={14}
                        className="rounded-sm"
                        unoptimized
                      />
                    </div>
                    <span className="text-sm text-gray-200 flex-1 truncate">{champName}</span>
                    <RankBadge rank={ranks?.[p.puuid] ?? null} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
