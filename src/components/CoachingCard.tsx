"use client";

import type { MatchInfo, MatchParticipant } from "@/lib/types";
import { metricsFor, roleOf, type MetricGroup, type Verdict } from "@/lib/coaching-metrics";
import { highlightsFor } from "@/lib/highlights";

interface Props {
  player: MatchParticipant;
  matchInfo: MatchInfo;
}

const GROUP_LABELS: Record<MetricGroup, string> = {
  laning: "Fase de líneas",
  impact: "Impacto",
  mechanics: "Mecánica",
  risk: "Riesgo",
  vision: "Visión",
  objectives: "Objetivos",
};

const VERDICT_STYLES: Record<Verdict, { text: string; dot: string; sr: string }> = {
  good: { text: "text-emerald-300", dot: "bg-emerald-400", sr: "Bien:" },
  ok: { text: "text-gray-200", dot: "bg-gray-500", sr: "Normal:" },
  bad: { text: "text-red-300", dot: "bg-red-400", sr: "A mejorar:" },
};

const HIGHLIGHT_STYLES = {
  legendary: "bg-gradient-to-r from-[#e3c98a] to-[#c8aa6e] text-gray-950",
  great: "bg-purple-500/80 text-white",
  good: "bg-blue-500/70 text-white",
} as const;

export default function CoachingCard({ player, matchInfo }: Props) {
  const metrics = metricsFor(player, matchInfo);
  const highlights = highlightsFor(player);

  // Riot omits `challenges` on older matches — nothing to show then.
  if (metrics.length === 0 && highlights.length === 0) return null;

  const byGroup = new Map<MetricGroup, typeof metrics>();
  for (const m of metrics) {
    const list = byGroup.get(m.def.group) ?? [];
    list.push(m);
    byGroup.set(m.def.group, list);
  }

  const worst = metrics.filter((m) => m.verdict === "bad");
  const best = metrics.filter((m) => m.verdict === "good");

  return (
    <section aria-label="Ficha de coaching" className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-200">
        Ficha de coaching
        <span className="text-xs text-gray-500 font-normal ml-2">
          métricas calculadas por Riot · rol {roleOf(player) || "—"}
        </span>
      </h4>

      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {highlights.slice(0, 5).map((h) => (
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

      {(worst.length > 0 || best.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {best.length > 0 && (
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-3">
              <p className="text-xs uppercase tracking-wider text-emerald-300 mb-1">Lo que hiciste bien</p>
              <p className="text-xs text-gray-300">
                {best.slice(0, 3).map((m) => `${m.def.label} (${m.def.format(m.value)})`).join(" · ")}
              </p>
            </div>
          )}
          {worst.length > 0 && (
            <div className="rounded-lg border border-red-500/25 bg-red-950/20 p-3">
              <p className="text-xs uppercase tracking-wider text-red-300 mb-1">A mejorar</p>
              <p className="text-xs text-gray-300">
                {worst.slice(0, 3).map((m) => `${m.def.label} (${m.def.format(m.value)})`).join(" · ")}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...byGroup.entries()].map(([group, list]) => (
          <div key={group} className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">
              {GROUP_LABELS[group]}
            </p>
            <ul className="space-y-1.5">
              {list.map(({ def, value, verdict }) => {
                const style = VERDICT_STYLES[verdict];
                return (
                  <li key={def.key} className="flex items-center gap-2 text-xs" title={def.hint}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} aria-hidden />
                    <span className="flex-1 text-gray-400 truncate">{def.label}</span>
                    <span className={`font-semibold ${style.text}`}>
                      <span className="sr-only">{style.sr} </span>
                      {def.format(value)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
