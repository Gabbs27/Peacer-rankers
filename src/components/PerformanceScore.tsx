"use client";

import { useState } from "react";
import { PerformanceScore as PerformanceScoreType } from "@/lib/types";
import { getTierLabel } from "@/lib/scoring";

interface Props {
  score: PerformanceScoreType;
  actualTier?: string;
  actualRank?: string;
}

const tierColors: Record<string, string> = {
  IRON: "text-gray-300",
  BRONZE: "text-amber-600",
  SILVER: "text-gray-200",
  GOLD: "text-yellow-400",
  PLATINUM: "text-teal-400",
  EMERALD: "text-emerald-400",
  DIAMOND: "text-blue-400",
  MASTER: "text-purple-400",
  GRANDMASTER: "text-red-400",
  CHALLENGER: "text-yellow-300",
};

function getBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-teal-500";
  if (score >= 40) return "bg-yellow-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function Bar({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div title={hint}>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-100 font-semibold">{value}</span>
      </div>
      <div
        className="h-1.5 bg-gray-800 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Puntuación ${label.toLowerCase()}`}
      >
        <div className={`h-full rounded-full ${getBarColor(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: PerformanceScoreType["microBreakdown"] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <ul className="space-y-2">
        {items.map((b) => (
          <li key={b.label}>
            <div className="flex justify-between text-xs">
              <span className="text-gray-300">{b.label}</span>
              <span className="text-gray-200">
                {b.score}/{b.maxScore}
              </span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full ${getBarColor((b.score / b.maxScore) * 100)}`}
                style={{ width: `${(b.score / b.maxScore) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">{b.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Score card: overall, the tier it maps to, micro/macro bars and an optional breakdown. */
export default function PerformanceScore({ score, actualTier, actualRank }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  const tierColor = tierColors[score.rankEquivalent] || "text-white";
  const playedAs = `${getTierLabel(score.rankEquivalent)}${score.rankDivision ? ` ${score.rankDivision}` : ""}`;
  const actual = actualTier ? `${getTierLabel(actualTier)}${actualRank ? ` ${actualRank}` : ""}` : null;

  return (
    <div className="rounded-lg bg-gray-900/50 border border-white/5 p-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0 rounded-lg bg-gray-950/70 border border-[#c8aa6e]/25 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-50 leading-none">{score.overall}</span>
            <span className="text-[9px] text-gray-500 mt-0.5">/ 100</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Jugaste a nivel</p>
            <p className={`font-display text-lg font-bold leading-tight ${tierColor}`}>{playedAs}</p>
            {actual && <p className="text-[11px] text-gray-500">tu rango: {actual}</p>}
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4">
          <Bar label="Micro" value={score.micro} hint="Mecánicas, daño, CS, kills" />
          <Bar label="Macro" value={score.macro} hint="Visión, objetivos, oro, muertes" />
        </div>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          aria-expanded={showDetails}
          className="self-start sm:self-center text-[11px] text-gray-400 hover:text-[#e3c98a] focus-ring rounded shrink-0"
        >
          {showDetails ? "Ocultar desglose" : "Desglose"}
        </button>
      </div>

      {showDetails && (
        <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Breakdown title="Micro" items={score.microBreakdown} />
          <Breakdown title="Macro" items={score.macroBreakdown} />
        </div>
      )}
    </div>
  );
}
