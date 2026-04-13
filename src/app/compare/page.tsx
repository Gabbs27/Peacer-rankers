"use client";

import { useState } from "react";
import { Region, REGION_LABELS, MatchData, MatchParticipant, MatchInfo } from "@/lib/types";
import { calculatePerformanceScore } from "@/lib/scoring";
import { getChampionIconUrl } from "@/lib/data-dragon";

const regions = Object.entries(REGION_LABELS) as [Region, string][];

interface SummonerInput {
  gameName: string;
  tagLine: string;
  region: Region;
}

interface PlayerStats {
  gameName: string;
  tagLine: string;
  puuid: string;
  winrate: number;
  avgKDA: number;
  avgCSPerMin: number;
  avgVisionScore: number;
  avgDamage: number;
  avgGold: number;
  avgPerformance: number;
  matches: MatchData[];
}

interface CommonGameRow {
  matchId: string;
  p1: MatchParticipant;
  p2: MatchParticipant;
  info: MatchInfo;
}

function computePlayerStats(
  gameName: string,
  tagLine: string,
  puuid: string,
  matches: MatchData[]
): PlayerStats {
  let wins = 0;
  let totalKDA = 0;
  let totalCSPerMin = 0;
  let totalVision = 0;
  let totalDamage = 0;
  let totalGold = 0;
  let totalPerformance = 0;
  let count = 0;

  for (const match of matches) {
    const player = match.info.participants.find((p) => p.puuid === puuid);
    if (!player) continue;
    count++;

    if (player.win) wins++;

    const deaths = player.deaths || 1;
    totalKDA += (player.kills + player.assists) / deaths;

    const mins = match.info.gameDuration / 60;
    totalCSPerMin += (player.totalMinionsKilled + player.neutralMinionsKilled) / mins;
    totalVision += player.visionScore;
    totalDamage += player.totalDamageDealtToChampions;
    totalGold += player.goldEarned;

    const perf = calculatePerformanceScore(player, match.info);
    totalPerformance += perf.overall;
  }

  const n = count || 1;
  return {
    gameName,
    tagLine,
    puuid,
    winrate: count > 0 ? (wins / count) * 100 : 0,
    avgKDA: totalKDA / n,
    avgCSPerMin: totalCSPerMin / n,
    avgVisionScore: totalVision / n,
    avgDamage: totalDamage / n,
    avgGold: totalGold / n,
    avgPerformance: totalPerformance / n,
    matches,
  };
}

function SummonerInputGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SummonerInput;
  onChange: (v: SummonerInput) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{label}</h3>
      <select
        aria-label={`Region ${label}`}
        value={value.region}
        onChange={(e) => onChange({ ...value, region: e.target.value as Region })}
        className="bg-gray-700 border border-gray-500 rounded-lg px-4 py-3 text-white focus-ring"
      >
        {regions.map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Nombre (ej: xicebriel)"
        aria-label={`Nombre ${label}`}
        value={value.gameName}
        onChange={(e) => onChange({ ...value, gameName: e.target.value })}
        className="bg-gray-700 border border-gray-500 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus-ring"
      />
      <input
        type="text"
        placeholder="Tag (ej: LAN)"
        aria-label={`Tag ${label}`}
        value={value.tagLine}
        onChange={(e) => onChange({ ...value, tagLine: e.target.value })}
        className="bg-gray-700 border border-gray-500 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus-ring"
      />
    </div>
  );
}

function StatRow({
  label,
  v1,
  v2,
  format,
  higherIsBetter = true,
}: {
  label: string;
  v1: number;
  v2: number;
  format: (n: number) => string;
  higherIsBetter?: boolean;
}) {
  const p1Better = higherIsBetter ? v1 > v2 : v1 < v2;
  const p2Better = higherIsBetter ? v2 > v1 : v2 < v1;
  const tie = Math.abs(v1 - v2) < 0.01;

  return (
    <tr className="border-b border-gray-700">
      <td className={`py-3 px-4 text-right font-medium ${!tie && p1Better ? "text-green-400" : "text-gray-200"}`}>
        {format(v1)}
      </td>
      <td className="py-3 px-4 text-center text-gray-400 text-sm">{label}</td>
      <td className={`py-3 px-4 text-left font-medium ${!tie && p2Better ? "text-green-400" : "text-gray-200"}`}>
        {format(v2)}
      </td>
    </tr>
  );
}

export default function ComparePage() {
  const [player1, setPlayer1] = useState<SummonerInput>({ gameName: "", tagLine: "", region: "la1" });
  const [player2, setPlayer2] = useState<SummonerInput>({ gameName: "", tagLine: "", region: "la1" });
  const [stats1, setStats1] = useState<PlayerStats | null>(null);
  const [stats2, setStats2] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPlayer(input: SummonerInput): Promise<PlayerStats> {
    const summonerRes = await fetch(
      `/api/summoner?gameName=${encodeURIComponent(input.gameName)}&tagLine=${encodeURIComponent(input.tagLine)}&region=${input.region}`
    );
    if (!summonerRes.ok) {
      throw new Error(`No se encontro a ${input.gameName}#${input.tagLine}`);
    }
    const summoner = await summonerRes.json();

    const matchesRes = await fetch(
      `/api/matches?puuid=${summoner.account.puuid}&region=${input.region}&count=10`
    );
    if (!matchesRes.ok) {
      throw new Error(`Error al cargar partidas de ${input.gameName}`);
    }
    const matchesData = await matchesRes.json();
    const matches: MatchData[] = matchesData.matches || [];

    return computePlayerStats(
      input.gameName,
      input.tagLine,
      summoner.account.puuid,
      matches
    );
  }

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();

    if (!player1.gameName.trim() || !player1.tagLine.trim() || !player2.gameName.trim() || !player2.tagLine.trim()) {
      setError("Completa todos los campos de ambos jugadores.");
      return;
    }

    setLoading(true);
    setError(null);
    setStats1(null);
    setStats2(null);

    try {
      const [s1, s2] = await Promise.all([fetchPlayer(player1), fetchPlayer(player2)]);
      setStats1(s1);
      setStats2(s2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  // Find common games
  const commonGames: CommonGameRow[] = [];
  if (stats1 && stats2) {
    const matchMap2 = new Map<string, MatchData>();
    for (const m of stats2.matches) {
      matchMap2.set(m.metadata.matchId, m);
    }
    for (const m1 of stats1.matches) {
      const m2 = matchMap2.get(m1.metadata.matchId);
      if (m2) {
        const p1 = m1.info.participants.find((p) => p.puuid === stats1.puuid);
        const p2 = m2.info.participants.find((p) => p.puuid === stats2.puuid);
        if (p1 && p2) {
          commonGames.push({ matchId: m1.metadata.matchId, p1, p2, info: m1.info });
        }
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Comparar Jugadores</h1>

      <form onSubmit={handleCompare} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SummonerInputGroup label="Jugador 1" value={player1} onChange={setPlayer1} />
          <SummonerInputGroup label="Jugador 2" value={player2} onChange={setPlayer2} />
        </div>
        <div className="flex justify-center mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors focus-ring"
          >
            {loading ? "Cargando..." : "Comparar"}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6 text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-400 py-12">Cargando...</div>
      )}

      {stats1 && stats2 && (
        <div className="space-y-8">
          {/* Header */}
          <div className="grid grid-cols-3 text-center">
            <div className="text-lg font-bold text-blue-400">
              {stats1.gameName}
              <span className="text-gray-500 text-sm">#{stats1.tagLine}</span>
            </div>
            <div className="text-gray-500 text-sm self-center">VS</div>
            <div className="text-lg font-bold text-blue-400">
              {stats2.gameName}
              <span className="text-gray-500 text-sm">#{stats2.tagLine}</span>
            </div>
          </div>

          {/* Stats table */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="py-3 px-4 text-right text-sm text-gray-400 w-1/3">Jugador 1</th>
                  <th className="py-3 px-4 text-center text-sm text-gray-400">Estadistica</th>
                  <th className="py-3 px-4 text-left text-sm text-gray-400 w-1/3">Jugador 2</th>
                </tr>
              </thead>
              <tbody>
                <StatRow label="Winrate" v1={stats1.winrate} v2={stats2.winrate} format={(n) => `${n.toFixed(0)}%`} />
                <StatRow label="KDA Promedio" v1={stats1.avgKDA} v2={stats2.avgKDA} format={(n) => n.toFixed(2)} />
                <StatRow label="CS/min" v1={stats1.avgCSPerMin} v2={stats2.avgCSPerMin} format={(n) => n.toFixed(1)} />
                <StatRow label="Vision Score" v1={stats1.avgVisionScore} v2={stats2.avgVisionScore} format={(n) => n.toFixed(0)} />
                <StatRow label="Dano a Campeones" v1={stats1.avgDamage} v2={stats2.avgDamage} format={(n) => Math.round(n).toLocaleString()} />
                <StatRow label="Oro" v1={stats1.avgGold} v2={stats2.avgGold} format={(n) => Math.round(n).toLocaleString()} />
                <StatRow label="Performance Score" v1={stats1.avgPerformance} v2={stats2.avgPerformance} format={(n) => n.toFixed(0)} />
              </tbody>
            </table>
          </div>

          {/* Head-to-head */}
          <div>
            <h2 className="text-xl font-bold mb-4">Head-to-Head</h2>
            {commonGames.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-400">
                No han jugado juntos recientemente
              </div>
            ) : (
              <div className="space-y-4">
                {commonGames.map((game) => {
                  const mins = game.info.gameDuration / 60;
                  const cs1 = (game.p1.totalMinionsKilled + game.p1.neutralMinionsKilled) / mins;
                  const cs2 = (game.p2.totalMinionsKilled + game.p2.neutralMinionsKilled) / mins;
                  return (
                    <div key={game.matchId} className="bg-gray-800 rounded-xl p-4">
                      <div className="grid grid-cols-3 gap-4 items-center">
                        {/* Player 1 */}
                        <div className="text-right space-y-1">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-sm font-medium ${game.p1.win ? "text-green-400" : "text-red-400"}`}>
                              {game.p1.win ? "Victoria" : "Derrota"}
                            </span>
                            <img
                              src={getChampionIconUrl(game.p1.championName)}
                              alt={game.p1.championName}
                              className="w-8 h-8 rounded"
                            />
                          </div>
                          <div className="text-sm text-gray-300">
                            {game.p1.kills}/{game.p1.deaths}/{game.p1.assists}
                          </div>
                          <div className="text-xs text-gray-500">
                            {cs1.toFixed(1)} CS/min | {game.p1.visionScore} vis
                          </div>
                        </div>

                        {/* Center */}
                        <div className="text-center text-xs text-gray-500">
                          {Math.floor(mins)}:{Math.floor((mins % 1) * 60).toString().padStart(2, "0")}
                        </div>

                        {/* Player 2 */}
                        <div className="text-left space-y-1">
                          <div className="flex items-center gap-2">
                            <img
                              src={getChampionIconUrl(game.p2.championName)}
                              alt={game.p2.championName}
                              className="w-8 h-8 rounded"
                            />
                            <span className={`text-sm font-medium ${game.p2.win ? "text-green-400" : "text-red-400"}`}>
                              {game.p2.win ? "Victoria" : "Derrota"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-300">
                            {game.p2.kills}/{game.p2.deaths}/{game.p2.assists}
                          </div>
                          <div className="text-xs text-gray-500">
                            {cs2.toFixed(1)} CS/min | {game.p2.visionScore} vis
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
