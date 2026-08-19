"use client";

import { useState } from "react";
import type { MatchData, Region } from "@/lib/types";
import { REGION_LABELS } from "@/lib/types";
import { analyzeChampionComp, getDefensiveRecommendations } from "@/lib/builds";
import { classifyComp, recordVsComp, counterItemCoverage, COMP_LABELS } from "@/lib/comp-history";

interface Props {
  /** Data Dragon id of the champion the user plans to play. */
  championId: string;
  /** Data Dragon ids of the enemy champions picked in the planner. */
  enemyIds: string[];
  role: string;
}

const HISTORY_SAMPLE = 20;

/**
 * Optional "use my history" block for the planner: the planner itself is
 * anonymous, so the user identifies themselves here and we reuse the same
 * count-based (never fake-winrate) analysis as the live advisor.
 */
export default function PlannerHistory({ championId, enemyIds, role }: Props) {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState<Region>("la1");
  const [matches, setMatches] = useState<MatchData[] | null>(null);
  const [puuid, setPuuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(e: React.FormEvent) {
    e.preventDefault();
    const name = gameName.trim();
    const tag = tagLine.trim();
    if (!name || !tag) return;
    setLoading(true);
    setError(null);
    try {
      const summonerRes = await fetch(
        `/api/summoner?${new URLSearchParams({ gameName: name, tagLine: tag, region })}`
      );
      const summoner = await summonerRes.json();
      if (!summonerRes.ok) throw new Error(summoner?.error ?? "No se pudo cargar el invocador.");

      const matchesRes = await fetch(
        `/api/matches?${new URLSearchParams({
          puuid: summoner.account.puuid,
          region,
          count: String(HISTORY_SAMPLE),
        })}`
      );
      const data = await matchesRes.json();
      if (!matchesRes.ok) throw new Error(data?.error ?? "No se pudo cargar el historial.");

      setPuuid(summoner.account.puuid);
      setMatches(data.matches ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setMatches(null);
    } finally {
      setLoading(false);
    }
  }

  const analysis = enemyIds.length > 0 ? analyzeChampionComp(enemyIds) : null;
  const kind = analysis ? classifyComp(analysis) : null;
  const record = matches && puuid && kind ? recordVsComp(matches, puuid, kind, championId) : null;
  const coverage =
    analysis && record
      ? counterItemCoverage(getDefensiveRecommendations(analysis, role, championId).items, record)
      : [];
  const blindSpots = coverage.filter((c) => c.outOf >= 3 && c.built <= Math.floor(c.outOf * 0.34));

  return (
    <div className="panel p-4 space-y-3">
      <h3 className="section-title text-sm font-semibold text-gray-100">
        Cruzar con tu historial
      </h3>

      <form onSubmit={load} className="flex flex-wrap gap-2 items-center">
        <label htmlFor="planner-region" className="sr-only">Región</label>
        <select
          id="planner-region"
          value={region}
          onChange={(e) => setRegion(e.target.value as Region)}
          className="bg-gray-800/80 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus-ring"
        >
          {(Object.entries(REGION_LABELS) as [Region, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label htmlFor="planner-name" className="sr-only">Nombre</label>
        <input
          id="planner-name"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder="Nombre"
          className="bg-gray-800/80 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus-ring w-40"
        />
        <label htmlFor="planner-tag" className="sr-only">Tag</label>
        <input
          id="planner-tag"
          value={tagLine}
          onChange={(e) => setTagLine(e.target.value)}
          placeholder="Tag"
          className="bg-gray-800/80 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus-ring w-24"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-b from-[#e3c98a] to-[#c8aa6e] hover:from-[#f0e6d2] text-gray-950 font-bold text-sm py-2 px-4 rounded-lg transition-colors focus-ring disabled:opacity-60"
        >
          {loading ? "Cargando…" : "Cargar"}
        </button>
      </form>

      {error && <p className="text-xs text-red-300">{error}</p>}

      {record && kind && (
        <div className="text-xs space-y-2">
          <p className="text-gray-300">
            Contra comps {COMP_LABELS[kind]}:{" "}
            {record.games === 0 ? (
              <span className="text-gray-500">sin partidas en tus últimas {HISTORY_SAMPLE}.</span>
            ) : (
              <>
                <span className="font-semibold text-gray-100">
                  {record.wins}V-{record.games - record.wins}D
                </span>{" "}
                en {record.games} partida{record.games === 1 ? "" : "s"}
                {record.sameChampionGames > 0 && (
                  <span className="text-gray-500"> · {record.sameChampionGames} con {championId}</span>
                )}
                {record.games < 5 && <span className="text-gray-500"> · muestra pequeña</span>}
              </>
            )}
          </p>
          {blindSpots.length > 0 && (
            <p className="text-red-300">
              Punto ciego: casi nunca compras{" "}
              {blindSpots.slice(0, 3).map((b) => `${b.name} (${b.built}/${b.outOf})`).join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
