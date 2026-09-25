"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchData } from "@/lib/types";
import { formatDuration } from "@/lib/data-dragon";
import { calculatePerformanceScore, isRemake } from "@/lib/scoring";
import ChampionIcon from "./ChampionIcon";

interface Props {
  matches: MatchData[];
  puuid: string;
  profileHref: string;
}

interface GameRow {
  matchId: string;
  win: boolean;
  remake: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  damage: number;
  duration: number;
  score: number | null;
}

interface ChampionRow {
  championName: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  minutes: number;
  damage: number;
  scoreSum: number;
  rows: GameRow[];
}

function aggregate(matches: MatchData[], puuid: string): ChampionRow[] {
  const byChampion = new Map<string, ChampionRow>();
  for (const m of matches) {
    const p = m.info.participants.find((x) => x.puuid === puuid);
    if (!p) continue;
    const remake = isRemake(m.info);
    const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
    const score = remake ? null : calculatePerformanceScore(p, m.info).overall;
    const entry = byChampion.get(p.championName) ?? {
      championName: p.championName,
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      cs: 0,
      minutes: 0,
      damage: 0,
      scoreSum: 0,
      rows: [],
    };
    entry.rows.push({
      matchId: m.metadata.matchId,
      win: p.win,
      remake,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      cs,
      damage: p.totalDamageDealtToChampions,
      duration: m.info.gameDuration,
      score,
    });
    if (!remake) {
      entry.games++;
      if (p.win) entry.wins++;
      entry.kills += p.kills;
      entry.deaths += p.deaths;
      entry.assists += p.assists;
      entry.cs += cs;
      entry.minutes += m.info.gameDuration / 60;
      entry.damage += p.totalDamageDealtToChampions;
      entry.scoreSum += score ?? 0;
    }
    byChampion.set(p.championName, entry);
  }
  return [...byChampion.values()]
    .filter((c) => c.games > 0)
    .sort((a, b) => b.games - a.games || b.wins / b.games - a.wins / a.games);
}

export default function ChampionStatsTable({ matches, puuid, profileHref }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const champions = aggregate(matches, puuid);
  if (champions.length === 0) return null;

  return (
    <section aria-label="Estadísticas por campeón" className="panel p-4 sm:p-5">
      <h3 className="section-title text-base font-bold text-gray-100 mb-3">
        Por campeón
        <span className="text-xs text-gray-500 font-sans font-normal">
          (partidas cargadas, sin remakes)
        </span>
      </h3>

      <div className="hidden sm:flex items-center gap-3 px-3 pb-1 text-[10px] uppercase tracking-wider text-gray-500">
        <span className="flex-1">Campeón</span>
        <span className="w-24">Winrate</span>
        <span className="w-14 text-center">KDA</span>
        <span className="w-14 text-center">CS/min</span>
        <span className="w-14 text-center hidden md:block">Daño</span>
        <span className="w-12 text-center hidden md:block">Rend.</span>
        <span className="w-4" />
      </div>

      <ul className="space-y-1">
        {champions.map((c) => {
          const wr = Math.round((c.wins / c.games) * 100);
          const kda = c.deaths === 0 ? "Perfecto" : ((c.kills + c.assists) / c.deaths).toFixed(2);
          const open = expanded === c.championName;
          return (
            <li key={c.championName}>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : c.championName)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5 transition-colors focus-ring"
              >
                <span className="flex-1 min-w-0 flex items-center gap-3">
                  <ChampionIcon championName={c.championName} size={36} className="border border-gray-600" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-100 truncate">{c.championName}</span>
                    <span className="block text-xs text-gray-500">
                      {c.games} {c.games === 1 ? "partida" : "partidas"}
                    </span>
                  </span>
                </span>
                <span className="w-24">
                  <span className={`text-sm font-bold ${wr >= 50 ? "text-blue-300" : "text-red-300"}`}>{wr}%</span>
                  <span className="text-[11px] text-gray-500"> {c.wins}V {c.games - c.wins}D</span>
                  <span className="block h-1 mt-0.5 rounded bg-red-500/40 overflow-hidden" aria-hidden>
                    <span className="block h-full bg-blue-500" style={{ width: `${wr}%` }} />
                  </span>
                </span>
                <span className="w-14 text-center text-sm text-gray-200 hidden sm:block">{kda}</span>
                <span className="w-14 text-center text-sm text-gray-200 hidden sm:block">
                  {(c.cs / c.minutes).toFixed(1)}
                </span>
                <span className="w-14 text-center text-sm text-gray-200 hidden md:block">
                  {(c.damage / c.games / 1000).toFixed(1)}k
                </span>
                <span className="w-12 text-center text-sm font-semibold text-[#e3c98a] hidden md:block">
                  {Math.round(c.scoreSum / c.games)}
                </span>
                <span className="w-4 text-gray-500 text-xs" aria-hidden>
                  {open ? "▲" : "▼"}
                </span>
              </button>

              {open && (
                <div className="ml-3 sm:ml-14 mt-1 mb-2 space-y-1">
                  <Link
                    href={`${profileHref}/champion/${encodeURIComponent(c.championName)}`}
                    className="inline-block text-xs text-[#e3c98a] hover:text-[#f0e6d2] hover:underline focus-ring rounded mb-1"
                  >
                    Ver todo con {c.championName} →
                  </Link>
                  {c.rows.map((g) => (
                    <div
                      key={g.matchId}
                      className={`grid grid-cols-5 gap-2 text-xs px-3 py-1.5 rounded ${
                        g.remake ? "bg-gray-800/40 text-gray-500 italic" : g.win ? "bg-blue-950/40" : "bg-red-950/30"
                      }`}
                    >
                      <span className={`font-semibold ${g.remake ? "" : g.win ? "text-blue-300" : "text-red-300"}`}>
                        {g.remake ? "Remake" : g.win ? "Victoria" : "Derrota"}
                      </span>
                      <span className="text-gray-200">
                        {g.kills}/{g.deaths}/{g.assists}
                      </span>
                      <span className="text-gray-400">{g.cs} CS</span>
                      <span className="text-gray-400">{formatDuration(g.duration)}</span>
                      <span className="text-right text-[#e3c98a]">{g.score ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
