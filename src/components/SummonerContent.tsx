"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { MatchData, LeagueEntry } from "@/lib/types";
import MatchOverview from "./MatchOverview";
import MatchCard from "./MatchCard";
import TrendsPanel from "./TrendsPanel";
import LossPatternPanel from "./LossPatternPanel";
import FormPanel from "./FormPanel";
import TeammatesPanel from "./TeammatesPanel";
import WinFormulaPanel from "./WinFormulaPanel";

interface Props {
  initialMatches: MatchData[];
  puuid: string;
  region: string;
  riotId: string;
  ranked: LeagueEntry[];
}

// Client-only "today"/"yesterday" keys. Reading the clock during render is
// impure and would make the server and client disagree about the current day,
// so we expose it via useSyncExternalStore: the server snapshot is null (we
// render the absolute date) and the client snapshot is computed once and cached
// so the reference stays stable across renders.
const neverChanges = () => () => {};
let cachedNowKeys: { today: string; yesterday: string } | null = null;

function getNowKeys(): { today: string; yesterday: string } {
  if (!cachedNowKeys) {
    const now = Date.now();
    cachedNowKeys = {
      today: new Date(now).toISOString().slice(0, 10),
      yesterday: new Date(now - 86400000).toISOString().slice(0, 10),
    };
  }
  return cachedNowKeys;
}

const getNowKeysOnServer = () => null;

const QUEUE_OPTIONS = [
  { label: "Todas", value: "" },
  { label: "Ranked Solo/Duo", value: "420" },
  { label: "Ranked Flex", value: "440" },
  { label: "Normal Draft", value: "400" },
  { label: "Normal Blind", value: "430" },
  { label: "ARAM", value: "450" },
];

export default function SummonerContent({ initialMatches, puuid, region, riotId, ranked }: Props) {
  const [matches, setMatches] = useState<MatchData[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialMatches.length === 10);
  const [queueFilter, setQueueFilter] = useState("");
  const [champFilter, setChampFilter] = useState("");
  const [resultFilter, setResultFilter] = useState<"" | "win" | "loss">("");
  const [roleFilter, setRoleFilter] = useState("");
  const nowKeys = useSyncExternalStore(neverChanges, getNowKeys, getNowKeysOnServer);

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
    if (roleFilter && (player.teamPosition || player.individualPosition) !== roleFilter) return false;
    return true;
  });

  // Get unique champions from loaded matches
  const champions = [...new Set(
    matches.map((m) => m.info.participants.find((p) => p.puuid === puuid)?.championName).filter(Boolean)
  )] as string[];

  // Group the (newest-first) list by calendar day, with a per-day W/L summary.
  // Days are keyed in UTC so the grouping itself is deterministic.
  //
  // "Hoy"/"Ayer" depend on the CURRENT time, which is impure and differs between
  // server and client — so we resolve them after mount (see `nowKeys`) and render
  // the absolute date until then. That keeps render pure and hydration stable.
  const dayGroups: { key: string; label: string; wins: number; losses: number; items: MatchData[] }[] = [];
  for (const m of filteredMatches) {
    const date = new Date(m.info.gameCreation);
    const key = date.toISOString().slice(0, 10);
    let group = dayGroups[dayGroups.length - 1];
    if (!group || group.key !== key) {
      const absolute = date.toLocaleDateString("es", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      });
      const label =
        key === nowKeys?.today ? "Hoy" : key === nowKeys?.yesterday ? "Ayer" : absolute;
      group = { key, label, wins: 0, losses: 0, items: [] };
      dayGroups.push(group);
    }
    group.items.push(m);
    const me = m.info.participants.find((p) => p.puuid === puuid);
    if (me && m.info.gameDuration >= 300) {
      if (me.win) group.wins++;
      else group.losses++;
    }
  }

  return (
    <>
      <FormPanel matches={matches} puuid={puuid} />
      <MatchOverview matches={matches} puuid={puuid} profileHref={`/summoner/${region}/${riotId}`} />
      <WinFormulaPanel matches={matches} puuid={puuid} />
      <TrendsPanel matches={matches} puuid={puuid} />
      <LossPatternPanel matches={matches} puuid={puuid} />
      <TeammatesPanel matches={matches} puuid={puuid} region={region} />

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
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filtrar por rol"
            className="bg-gray-700 border border-gray-600 text-sm rounded-lg px-3 py-1.5 text-gray-200 focus-ring"
          >
            <option value="">Todos los roles</option>
            <option value="TOP">Top</option>
            <option value="JUNGLE">Jungla</option>
            <option value="MIDDLE">Mid</option>
            <option value="BOTTOM">ADC</option>
            <option value="UTILITY">Soporte</option>
          </select>

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
          {dayGroups.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="flex items-center gap-3 pt-2">
                <span className="font-display text-sm font-semibold text-[#e3c98a]">
                  {group.label}
                </span>
                <span className="text-xs text-gray-400">
                  {group.wins}V {group.losses}D
                </span>
                <span className="flex-1 h-px bg-gradient-to-r from-[#c8aa6e]/30 to-transparent" aria-hidden />
              </div>
              {group.items.map((match) => (
                <MatchCard
                  key={match.metadata.matchId}
                  match={match}
                  puuid={puuid}
                  region={region}
                  ranked={ranked}
                />
              ))}
            </div>
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
