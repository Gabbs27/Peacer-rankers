"use client";

import { useState } from "react";
import type { LeagueEntry, MatchInfo, MatchParticipant } from "@/lib/types";
import { calculatePerformanceScore } from "@/lib/scoring";
import { metricsFor } from "@/lib/coaching-metrics";
import { highlightsFor } from "@/lib/highlights";
import { generateTips } from "@/lib/tips";
import type { TimelineState } from "@/lib/use-timeline-insights";
import PerformanceScore from "./PerformanceScore";
import LobbyRankChips from "./LobbyRankChips";
import MetricsGrid from "./MetricsGrid";
import InsightList, { type Insight } from "./InsightList";

interface Props {
  player: MatchParticipant;
  info: MatchInfo;
  ranked?: LeagueEntry[];
  timeline: TimelineState;
}

const HIGHLIGHT_STYLES = {
  legendary: "bg-gradient-to-r from-[#e3c98a] to-[#c8aa6e] text-gray-950",
  great: "bg-purple-500/80 text-white",
  good: "bg-blue-500/70 text-white",
} as const;

const MAX_POINTS = 4;

/**
 * What went well / badly. Riot's own per-game metrics are the richer source;
 * older matches lack them, so fall back to the basic end-of-game tips.
 */
function strengthsAndWeaknesses(player: MatchParticipant, info: MatchInfo): { good: Insight[]; bad: Insight[] } {
  const metrics = metricsFor(player, info);
  const toInsight = (level: "good" | "bad") => (m: (typeof metrics)[number]): Insight => ({
    level,
    text: `${m.def.label}: ${m.def.format(m.value)}`,
    hint: m.def.hint,
  });
  const good = metrics.filter((m) => m.verdict === "good").slice(0, MAX_POINTS).map(toInsight("good"));
  const bad = metrics.filter((m) => m.verdict === "bad").slice(0, MAX_POINTS).map(toInsight("bad"));
  if (good.length > 0 || bad.length > 0) return { good, bad };

  const tips = generateTips(player, info);
  return {
    good: tips.filter((t) => t.level === "good").slice(0, MAX_POINTS).map((t) => ({ level: "good", text: t.message })),
    bad: tips.filter((t) => t.level === "bad").slice(0, MAX_POINTS).map((t) => ({ level: "bad", text: t.message })),
  };
}

function DiffChip({ label, value, signed = true }: { label: string; value: number | null; signed?: boolean }) {
  if (value === null) return null;
  const tone = !signed ? "text-gray-100" : value >= 0 ? "text-emerald-300" : "text-red-300";
  return (
    <span className="rounded bg-gray-900/60 px-2 py-1 text-xs">
      <span className="text-gray-400">{label} </span>
      <span className={`font-semibold ${tone}`}>
        {signed && value >= 0 ? "+" : ""}
        {value}
      </span>
    </span>
  );
}

/** Laning numbers and the key moments detected in the timeline. */
function KeyMoments({ timeline }: { timeline: TimelineState }) {
  if (timeline.status === "disabled") return null;
  if (timeline.status === "loading") {
    return <p className="text-xs text-gray-500 animate-pulse">Analizando la partida minuto a minuto…</p>;
  }
  if (timeline.status === "error") {
    return <p className="text-xs text-gray-500">{timeline.message}</p>;
  }

  const { laning, flags, opponentChampion } = timeline.data;
  if (!laning && flags.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">
        Fase de líneas{opponentChampion ? ` vs ${opponentChampion}` : ""} y momentos clave
      </p>
      {laning && (
        <div className="flex flex-wrap gap-1.5">
          <DiffChip label="CS al 10" value={laning.csAt10} signed={false} />
          <DiffChip label="CS al 14" value={laning.csAt14} signed={false} />
          <DiffChip label="Oro al 10" value={laning.goldDiffAt10} />
          <DiffChip label="Oro al 14" value={laning.goldDiffAt14} />
          <DiffChip label="XP al 10" value={laning.xpDiffAt10} />
        </div>
      )}
      <InsightList items={flags.map((f) => ({ level: f.severity, text: f.message }))} />
    </div>
  );
}

export default function MatchAnalysisTab({ player, info, ranked, timeline }: Props) {
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const score = calculatePerformanceScore(player, info);
  const soloQ =
    ranked?.find((r) => r.queueType === "RANKED_SOLO_5x5") || ranked?.find((r) => r.queueType === "RANKED_FLEX_SR");
  const highlights = highlightsFor(player).slice(0, 5);
  const { good, bad } = strengthsAndWeaknesses(player, info);
  const metrics = metricsFor(player, info);

  return (
    <div className="space-y-4">
      <PerformanceScore score={score} actualTier={soloQ?.tier} actualRank={soloQ?.rank} />

      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {highlights.map((h) => (
            <span
              key={h.key}
              title={h.detail}
              className={`text-[10px] font-black uppercase tracking-wide rounded px-2 py-1 ${HIGHLIGHT_STYLES[h.tone]}`}
            >
              {h.label}
            </span>
          ))}
        </div>
      )}

      {(good.length > 0 || bad.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/15 p-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-300 mb-2">Lo que hiciste bien</p>
            {good.length > 0 ? (
              <InsightList items={good} />
            ) : (
              <p className="text-xs text-gray-500">Nada destacó por encima de lo normal.</p>
            )}
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-950/15 p-3">
            <p className="text-[10px] uppercase tracking-wider text-red-300 mb-2">A mejorar</p>
            {bad.length > 0 ? (
              <InsightList items={bad} />
            ) : (
              <p className="text-xs text-gray-500">Sin puntos flojos claros.</p>
            )}
          </div>
        </div>
      )}

      <KeyMoments timeline={timeline} />

      <LobbyRankChips player={player} matchInfo={info} />

      {metrics.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowAllMetrics(!showAllMetrics)}
            aria-expanded={showAllMetrics}
            className="text-xs text-gray-400 hover:text-[#e3c98a] focus-ring rounded"
          >
            {showAllMetrics ? "Ocultar métricas" : `Ver las ${metrics.length} métricas de Riot →`}
          </button>
          {showAllMetrics && (
            <div className="mt-3">
              <MetricsGrid metrics={metrics} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
