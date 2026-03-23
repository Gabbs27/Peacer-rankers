"use client";

import { BuildRecommendation as BuildRecType, TeamAnalysis } from "@/lib/builds";
import { getItemIconUrl, getUGGChampionUrl } from "@/lib/data-dragon";

interface Props {
  recommendation: BuildRecType;
  analysis: TeamAnalysis;
  buildVerdict: { verdict: string; level: "good" | "ok" | "bad" };
  championName: string;
}

const verdictColors = {
  good: "text-green-300 bg-green-900/40 border-green-500/50",
  ok: "text-yellow-300 bg-yellow-900/40 border-yellow-500/50",
  bad: "text-red-300 bg-red-900/40 border-red-500/50",
};

export default function BuildRecommendation({ recommendation, analysis, buildVerdict, championName }: Props) {
  const totalDisplayed = analysis.apCount + analysis.adCount + analysis.tankCount;

  return (
    <div className="rounded-lg border border-gray-600 bg-gray-700/20 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-100">
          Build vs Comp Enemiga
        </h4>
        <a
          href={getUGGChampionUrl(championName)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-500/80 text-white text-xs font-semibold rounded-lg transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Ver en u.gg
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
      <p className="text-sm text-orange-300 font-medium mb-2">
        {recommendation.title}
      </p>

      {/* Team composition breakdown */}
      <div className="flex gap-3 mb-3 text-xs">
        {analysis.apCount > 0 && (
          <span className="px-2.5 py-1 rounded-md bg-purple-900/50 text-purple-300 border border-purple-500/40 font-medium">
            {analysis.apCount} AP
          </span>
        )}
        {analysis.adCount > 0 && (
          <span className="px-2.5 py-1 rounded-md bg-red-900/50 text-red-300 border border-red-500/40 font-medium">
            {analysis.adCount} AD
          </span>
        )}
        {analysis.tankCount > 0 && (
          <span className="px-2.5 py-1 rounded-md bg-blue-900/50 text-blue-300 border border-blue-500/40 font-medium">
            {analysis.tankCount} Tank
          </span>
        )}
        <span className="px-2 py-1 text-gray-500 text-[10px]">
          = {totalDisplayed} enemigos
        </span>
      </div>

      {/* Build verdict */}
      <div className={`text-xs px-3 py-2 rounded-md border mb-3 ${verdictColors[buildVerdict.level]}`}>
        {buildVerdict.level === "good" ? "✓" : buildVerdict.level === "bad" ? "✗" : "~"}{" "}
        {buildVerdict.verdict}
      </div>

      {/* Recommended items */}
      {recommendation.items.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs text-gray-400 uppercase font-medium">Items recomendados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recommendation.items.map((item) => (
              <div
                key={item.itemId}
                className="flex items-center gap-2 bg-gray-800/60 rounded-lg p-2.5"
              >
                <img
                  src={getItemIconUrl(item.itemId)}
                  alt={item.name}
                  width={32}
                  height={32}
                  className="rounded border border-gray-600"
                />
                <div className="min-w-0">
                  <p className="text-sm text-gray-100 font-medium truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {item.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 italic">
        {recommendation.reasoning}
      </p>
    </div>
  );
}
