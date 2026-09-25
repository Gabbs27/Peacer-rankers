"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import type { ChampionMastery, LeagueEntry, MatchData } from "@/lib/types";
import MatchCard from "./MatchCard";
import TabBar, { tabPanelProps } from "./TabBar";
import RecentSummary from "./RecentSummary";
import NextGameCallout from "./NextGameCallout";
import TeammatesPanel from "./TeammatesPanel";
import TodayPlan from "./TodayPlan";
import WinFormulaPanel from "./WinFormulaPanel";
import LossPatternPanel from "./LossPatternPanel";
import TiltPanel from "./TiltPanel";
import TrendsPanel from "./TrendsPanel";
import GoalsPanel from "./GoalsPanel";
import ChampionStatsTable from "./ChampionStatsTable";
import MatchupsPanel from "./MatchupsPanel";
import ChampionMasterySection from "./ChampionMastery";

interface Props {
  initialMatches: MatchData[];
  puuid: string;
  region: string;
  riotId: string;
  ranked: LeagueEntry[];
  mastery: ChampionMastery[];
}

// ---------- Active tab, mirrored in the URL hash (#coaching) ----------
// The hash makes a tab linkable and survives reloads. It is browser-only
// state, so it goes through useSyncExternalStore: the server always renders
// the default tab and the client switches after hydration if needed.
const PROFILE_TABS = ["partidas", "coaching", "campeones"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHashTab(): ProfileTab {
  const hash = window.location.hash.slice(1);
  return (PROFILE_TABS as readonly string[]).includes(hash) ? (hash as ProfileTab) : "partidas";
}

const serverTab = (): ProfileTab => "partidas";

function selectTab(tab: ProfileTab) {
  const { pathname, search } = window.location;
  history.replaceState(history.state, "", tab === "partidas" ? pathname + search : `#${tab}`);
  // replaceState does not fire hashchange; notify the store ourselves.
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

// ---------- "Hoy"/"Ayer" labels ----------
// Reading the clock during render is impure and would make the server and
// client disagree about the current day, so it is also an external store: the
// server snapshot is null (absolute dates) and the client value is cached so
// the reference stays stable across renders.
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
  { label: "Todas las colas", value: "" },
  { label: "Ranked Solo/Duo", value: "420" },
  { label: "Ranked Flex", value: "440" },
  { label: "Normal Draft", value: "400" },
  { label: "Normal Blind", value: "430" },
  { label: "ARAM", value: "450" },
];

const ROLE_OPTIONS = [
  { label: "Todos los roles", value: "" },
  { label: "Top", value: "TOP" },
  { label: "Jungla", value: "JUNGLE" },
  { label: "Mid", value: "MIDDLE" },
  { label: "ADC", value: "BOTTOM" },
  { label: "Soporte", value: "UTILITY" },
];

const RESULT_OPTIONS = [
  { label: "Todas", value: "" },
  { label: "Victorias", value: "win" },
  { label: "Derrotas", value: "loss" },
] as const;

const SELECT_CLASS =
  "bg-gray-900/70 border border-white/10 text-xs rounded-lg px-2.5 py-1.5 text-gray-200 focus-ring hover:border-[#c8aa6e]/40 transition-colors";

export default function SummonerContent({ initialMatches, puuid, region, riotId, ranked, mastery }: Props) {
  const tab = useSyncExternalStore(subscribeHash, readHashTab, serverTab);
  const [matches, setMatches] = useState<MatchData[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  // The profile seeds a larger sample; assume more exist unless it came back empty.
  const [hasMore, setHasMore] = useState(initialMatches.length > 0);
  const [queueFilter, setQueueFilter] = useState("");
  const [champFilter, setChampFilter] = useState("");
  const [resultFilter, setResultFilter] = useState<"" | "win" | "loss">("");
  const [roleFilter, setRoleFilter] = useState("");
  const nowKeys = useSyncExternalStore(neverChanges, getNowKeys, getNowKeysOnServer);
  const profileHref = `/summoner/${region}/${riotId}`;

  const fetchMatches = useCallback(async (start: number, queue: string, replace: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ puuid, region, count: "10", start: String(start) });
      if (queue) params.set("queue", queue);
      const res = await fetch(`/api/matches?${params}`);
      const data = await res.json();
      if (data.matches) {
        setMatches((prev) => (replace ? data.matches : [...prev, ...data.matches]));
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

  const filtersActive = Boolean(champFilter || resultFilter || roleFilter);
  const clearFilters = () => {
    setChampFilter("");
    setResultFilter("");
    setRoleFilter("");
  };

  const filteredMatches = matches.filter((m) => {
    const player = m.info.participants.find((p) => p.puuid === puuid);
    if (!player) return false;
    if (champFilter && player.championName !== champFilter) return false;
    if (resultFilter === "win" && !player.win) return false;
    if (resultFilter === "loss" && player.win) return false;
    if (roleFilter && (player.teamPosition || player.individualPosition) !== roleFilter) return false;
    return true;
  });

  const champions = [
    ...new Set(matches.map((m) => m.info.participants.find((p) => p.puuid === puuid)?.championName).filter(Boolean)),
  ].sort() as string[];

  // Group the (newest-first) list by calendar day, keyed in UTC so the grouping
  // itself is deterministic; "Hoy"/"Ayer" resolve after mount (see nowKeys).
  const dayGroups: { key: string; label: string; wins: number; losses: number; items: MatchData[] }[] = [];
  for (const m of filteredMatches) {
    const date = new Date(m.info.gameCreation);
    const key = date.toISOString().slice(0, 10);
    let group = dayGroups[dayGroups.length - 1];
    if (!group || group.key !== key) {
      const absolute = date.toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" });
      const label = key === nowKeys?.today ? "Hoy" : key === nowKeys?.yesterday ? "Ayer" : absolute;
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
    <div className="space-y-5">
      <TabBar
        label="Secciones del perfil"
        idPrefix="profile"
        value={tab}
        onChange={selectTab}
        tabs={[
          { id: "partidas", label: "Partidas", count: matches.length },
          { id: "coaching", label: "Coaching" },
          { id: "campeones", label: "Campeones" },
        ]}
      />

      <div key={tab} {...tabPanelProps("profile", tab)} className="tab-enter">
        {tab === "partidas" && (
          <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] items-start">
            <div className="space-y-4 lg:col-start-1 lg:row-start-1">
              <RecentSummary matches={matches} puuid={puuid} />
              <NextGameCallout matches={matches} puuid={puuid} onOpenCoaching={() => selectTab("coaching")} />
            </div>

            <section
              aria-label="Historial de partidas"
              className="min-w-0 space-y-3 lg:col-start-2 lg:row-start-1 lg:row-span-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={queueFilter}
                  onChange={(e) => handleQueueChange(e.target.value)}
                  aria-label="Filtrar por cola"
                  className={SELECT_CLASS}
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
                    className={SELECT_CLASS}
                  >
                    <option value="">Todos los campeones</option>
                    {champions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Filtrar por rol"
                  className={SELECT_CLASS}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <div role="group" aria-label="Filtrar por resultado" className="inline-flex rounded-lg bg-gray-900/70 border border-white/10 p-0.5">
                  {RESULT_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      aria-pressed={resultFilter === r.value}
                      onClick={() => setResultFilter(r.value)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-colors focus-ring ${
                        resultFilter === r.value ? "bg-[#c8aa6e]/15 text-[#f0e6d2]" : "text-gray-400 hover:text-gray-100"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-gray-400 hover:text-[#e3c98a] focus-ring rounded px-1"
                  >
                    Limpiar · {filteredMatches.length} de {matches.length}
                  </button>
                )}
              </div>

              {dayGroups.map((group) => (
                <div key={group.key} className="space-y-2">
                  <div className="flex items-center gap-3 pt-2">
                    <span className="font-display text-sm font-semibold text-[#e3c98a]">{group.label}</span>
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

              {filteredMatches.length === 0 && (
                <p className="text-gray-400 text-center py-8">No se encontraron partidas con estos filtros</p>
              )}

              {hasMore && (
                <button
                  type="button"
                  onClick={() => fetchMatches(matches.length, queueFilter, false)}
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-gray-900/60 hover:bg-gray-800 border border-white/10 rounded-lg text-gray-200 text-sm font-medium transition-colors disabled:opacity-50 focus-ring"
                >
                  {loading ? "Cargando..." : "Cargar 10 partidas más"}
                </button>
              )}
            </section>

            <div className="lg:col-start-1 lg:row-start-2">
              <TeammatesPanel matches={matches} puuid={puuid} region={region} />
            </div>
          </div>
        )}

        {tab === "coaching" && (
          <div className="space-y-5">
            <TodayPlan matches={matches} puuid={puuid} />
            <div className="grid gap-5 lg:grid-cols-2 items-start">
              <WinFormulaPanel matches={matches} puuid={puuid} />
              <LossPatternPanel matches={matches} puuid={puuid} />
              <TiltPanel matches={matches} puuid={puuid} />
              <TrendsPanel matches={matches} puuid={puuid} />
            </div>
            <GoalsPanel matches={matches} puuid={puuid} />
          </div>
        )}

        {tab === "campeones" && (
          <div className="space-y-5">
            <ChampionStatsTable matches={matches} puuid={puuid} profileHref={profileHref} />
            <div className="grid gap-5 lg:grid-cols-2 items-start">
              <MatchupsPanel matches={matches} puuid={puuid} />
              <ChampionMasterySection mastery={mastery} profileHref={profileHref} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
