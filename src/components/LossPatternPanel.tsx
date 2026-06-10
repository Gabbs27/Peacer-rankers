"use client";

import type { MatchData } from "@/lib/types";
import { aggregateLossPattern, type LossReasonKey } from "@/lib/loss-diagnosis";

interface Props {
  matches: MatchData[];
  puuid: string;
}

const BAR_LABELS: Record<LossReasonKey, string> = {
  too_many_deaths: "Muertes",
  lost_lane: "Línea",
  low_vision: "Visión",
  low_damage: "Daño",
  low_objectives: "Objetivos",
  close_game: "Parejas",
};

export default function LossPatternPanel({ matches, puuid }: Props) {
  const pairs = matches
    .map((m) => {
      const player = m.info.participants.find((p) => p.puuid === puuid);
      return player ? { player, info: m.info } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const pattern = aggregateLossPattern(pairs);

  // Needs a meaningful sample to name a habit.
  if (pattern.total < 2 || !pattern.dominant) return null;

  const entries = (Object.entries(pattern.counts) as [LossReasonKey, number][])
    .sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] ?? 1;

  return (
    <section aria-label="Patrón de derrotas" className="panel p-5 rise rise-3">
      <h3 className="section-title text-lg font-bold text-gray-100 mb-3">
        ¿Por qué pierdes?
        <span className="text-xs text-gray-500 font-sans font-normal">
          ({pattern.total} derrota{pattern.total > 1 ? "s" : ""} analizadas)
        </span>
      </h3>

      <div className="rounded-lg border border-red-500/25 bg-red-950/20 p-4 mb-4">
        <p className="text-sm text-red-300 font-semibold">
          {pattern.dominantCount} de {pattern.total} derrotas: {pattern.dominant.label.toLowerCase()}
        </p>
        <p className="text-xs text-gray-300 mt-1">{pattern.dominant.detail}</p>
        {pattern.advice && (
          <p className="text-xs text-[#e3c98a] mt-2 border-t border-red-500/20 pt-2">
            💡 {pattern.advice}
          </p>
        )}
      </div>

      <ul className="space-y-1.5">
        {entries.map(([key, count]) => (
          <li key={key} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-gray-400">{BAR_LABELS[key]}</span>
            <div className="flex-1 h-2 rounded bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded ${key === pattern.dominant?.key ? "bg-red-400" : "bg-gray-600"}`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-5 text-right text-gray-300">{count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
