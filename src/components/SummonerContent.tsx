"use client";

import { useState, useCallback } from "react";
import { MatchData, LeagueEntry } from "@/lib/types";
import MatchOverview from "./MatchOverview";
import MatchCard from "./MatchCard";

interface Props {
  initialMatches: MatchData[];
  puuid: string;
  region: string;
  ranked: LeagueEntry[];
}

const QUEUE_OPTIONS = [
  { label: "Todas", value: "" },
  { label: "Ranked Solo/Duo", value: "420" },
  { label: "Ranked Flex", value: "440" },
  { label: "Normal Draft", value: "400" },
  { label: "Normal Blind", value: "430" },
  { label: "ARAM", value: "450" },
];

export default function SummonerContent({ initialMatches, puuid, region, ranked }: Props) {
  const [matches, setMatches] = useState<MatchData[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialMatches.length === 10);
  const [queueFilter, setQueueFilter] = useState("");
  const [champFilter, setChampFilter] = useState("");
  const [resultFilter, setResultFilter] = useState<"" | "win" | "loss">("");

  const fetchMatches = useCallback(async (start: number, queue: string, replace: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ puuid, region, count: "10", start: String(start) });
      if (queue) params.set("queue", queue);
      const res = await fetch(`/api/matches?${params}`);
      const data = await res.json();
      if (data.matches) {
        setMatches((prev) => replace ? data.matches : [...prev, ...data.matches]);
        setHasMore(data.hasMore ?? data.matches.length === 10);
      }
    } catch (e) {
      console.error("Error fetching matches:", e);
    } finally {
      setLoading(false);
    }
  }, [puuid, region]);

  const handleQueueChange = (value: string) => {
    setQueueFilter(value);
    setChampFilter("");
    setResultFilter("");
    fetchMatches(0, value, true);
  };

  const handleLoadMore = () => {
    fetchMatches(matches.length, queueFilter, false);
  };

  // Client-side filters
  const filteredMatches = matches.filter((m) => {
    const player = m.info.participants.find((p) => p.puuid === puuid);
    if (!player) return false;
    if (champFilter && player.championName !== champFilter) return false;
    if (resultFilter === "win" && !player.win) return false;
    if (resultFilter === "loss" && player.win) return false;
    return true;
  });

  // Get unique champions from loaded matches
  const champions = [...new Set(
    matches.map((m) => m.info.participants.find((p) => p.puuid === puuid)?.championName).filter(Boolean)
  )] as string[];

  return (
    <>
      <MatchOverview matches={matches} puuid={puuid} />

      <div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-xl font-bold">Historial de Partidas</h2>

          <select
            value={queueFilter}
            onChange={(e) => handleQueueChange(e.target.value)}
            aria-label="Filtrar por cola"
            className="bg-gray-700 border border-gray-600 text-sm rounded-lg px-3 py-1.5 text-gray-200 focus-ring"
          >
            {QUEUE_OPTIONS.map((q) => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </select>

          {champions.length > 1 && (
            <select
              value={champFilter}
              onChange={(e) => setChampFilter(e.target.value)}
              aria-label="Filtrar por campeón"
              className="bg-gray-700 border border-gray-600 text-sm rounded-lg px-3 py-1.5 text-gray-200 focus-ring"
            >
              <option value="">Todos los campeones</option>
              {champions.sort().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as "" | "win" | "loss")}
            aria-label="Filtrar por resultado"
            className="bg-gray-700 border border-gray-600 text-sm rounded-lg px-3 py-1.5 text-gray-200 focus-ring"
          >
            <option value="">Todas</option>
            <option value="win">Victorias</option>
            <option value="loss">Derrotas</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.metadata.matchId}
              match={match}
              puuid={puuid}
              ranked={ranked}
            />
          ))}
        </div>

        {filteredMatches.length === 0 && (
          <p className="text-gray-400 text-center py-8">
            No se encontraron partidas con estos filtros
          </p>
        )}

        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="w-full mt-4 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-200 text-sm font-medium transition-colors disabled:opacity-50 focus-ring"
          >
            {loading ? "Cargando..." : "Cargar 10 partidas más"}
          </button>
        )}
      </div>
    </>
  );
}
