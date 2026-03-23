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

const tierBgColors: Record<string, string> = {
  IRON: "bg-gray-500/20",
  BRONZE: "bg-amber-700/20",
  SILVER: "bg-gray-400/20",
  GOLD: "bg-yellow-500/20",
  PLATINUM: "bg-teal-500/20",
  EMERALD: "bg-emerald-500/20",
  DIAMOND: "bg-blue-500/20",
  MASTER: "bg-purple-500/20",
  GRANDMASTER: "bg-red-500/20",
  CHALLENGER: "bg-yellow-400/20",
};

function getBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-teal-500";
  if (score >= 40) return "bg-yellow-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-500";
}

export default function PerformanceScore({ score, actualTier, actualRank }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  const tierColor = tierColors[score.rankEquivalent] || "text-white";
  const tierBg = tierBgColors[score.rankEquivalent] || "bg-gray-700/20";
  const rankLabel = getTierLabel(score.rankEquivalent);
  const divisionStr = score.rankDivision ? ` ${score.rankDivision}` : "";

  const actualLabel = actualTier ? getTierLabel(actualTier) : null;
  const actualRankStr = actualTier && actualRank ? `${actualLabel} ${actualRank}` : null;

  return (
    <div className={`rounded-lg border border-gray-600 ${tierBg} p-4`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex-1">
          <p className="text-xs text-gray-300 uppercase tracking-wide mb-1">
            Rendimiento
          </p>
          <p className={`text-2xl font-bold ${tierColor}`}>
            {rankLabel}{divisionStr}
          </p>
          {actualRankStr && (
            <p className="text-sm text-gray-300 mt-1">
              Jugaste a nivel{" "}
              <span className={`font-semibold ${tierColor}`}>
                {rankLabel}{divisionStr}
              </span>
              {" "}en{" "}
              <span className={`font-semibold ${tierColors[actualTier!] || "text-white"}`}>
                {actualRankStr}
              </span>
            </p>
          )}
        </div>
        <div className="text-center px-4 py-2 bg-gray-800/50 rounded-lg">
          <p className="text-3xl font-bold text-white">{score.overall}</p>
          <p className="text-xs text-gray-400">/ 100</p>
        </div>
      </div>

      {/* Micro & Macro bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Micro</span>
            <span className="text-gray-200 font-semibold">{score.micro}</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getBarColor(score.micro)}`}
              style={{ width: `${score.micro}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Mecánicas, daño, CS, kills</p>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Macro</span>
            <span className="text-gray-200 font-semibold">{score.macro}</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getBarColor(score.macro)}`}
              style={{ width: `${score.macro}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Visión, objetivos, oro, muertes</p>
        </div>
      </div>

      {/* Toggle details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        {showDetails ? "Ocultar detalles" : "Ver detalles"}
      </button>

      {/* Detailed breakdown */}
      {showDetails && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h5 className="text-xs font-semibold text-gray-300 uppercase mb-2">
              Micro
            </h5>
            <div className="space-y-2">
              {score.microBreakdown.map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">{b.label}</span>
                    <span className="text-gray-200">
                      {b.score}/{b.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getBarColor(
                        (b.score / b.maxScore) * 100
                      )}`}
                      style={{
                        width: `${(b.score / b.maxScore) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{b.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-gray-300 uppercase mb-2">
              Macro
            </h5>
            <div className="space-y-2">
              {score.macroBreakdown.map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">{b.label}</span>
                    <span className="text-gray-200">
                      {b.score}/{b.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getBarColor(
                        (b.score / b.maxScore) * 100
                      )}`}
                      style={{
                        width: `${(b.score / b.maxScore) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{b.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
