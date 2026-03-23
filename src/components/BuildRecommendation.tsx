"use client";

import { BuildRecommendation as BuildRecType, TeamAnalysis } from "@/lib/builds";
import { getItemIconUrl } from "@/lib/data-dragon";

interface Props {
  recommendation: BuildRecType;
  analysis: TeamAnalysis;
  buildVerdict: { verdict: string; level: "good" | "ok" | "bad" };
}

const verdictColors = {
  good: "text-green-300 bg-green-800/30 border-green-600",
  ok: "text-yellow-300 bg-yellow-800/30 border-yellow-600",
  bad: "text-red-300 bg-red-800/30 border-red-600",
};

export default function BuildRecommendation({ recommendation, analysis, buildVerdict }: Props) {
  return (
    <div className="rounded-lg border border-gray-600 bg-gray-700/20 p-4">
      <h4 className="text-sm font-semibold text-gray-200 mb-1">
        Build vs Comp Enemiga
      </h4>
      <p className="text-sm text-orange-300 font-medium mb-2">
        {recommendation.title}
      </p>

      {/* Team composition breakdown */}
      <div className="flex gap-4 mb-3 text-xs">
        {analysis.apCount > 0 && (
          <span className="px-2 py-1 rounded bg-purple-800/30 text-purple-300 border border-purple-600">
            {analysis.apCount} AP
          </span>
        )}
        {analysis.adCount > 0 && (
          <span className="px-2 py-1 rounded bg-red-800/30 text-red-300 border border-red-600">
            {analysis.adCount} AD
          </span>
        )}
        {analysis.tankCount > 0 && (
          <span className="px-2 py-1 rounded bg-gray-600/50 text-gray-300 border border-gray-500">
            {analysis.tankCount} Tank
          </span>
        )}
      </div>

      {/* Build verdict */}
      <div className={`text-xs px-3 py-2 rounded border mb-3 ${verdictColors[buildVerdict.level]}`}>
        {buildVerdict.level === "good" ? "✓" : buildVerdict.level === "bad" ? "!" : "~"}{" "}
        {buildVerdict.verdict}
      </div>

      {/* Recommended items */}
      {recommendation.items.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs text-gray-400 uppercase">Items recomendados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recommendation.items.map((item) => (
              <div
                key={item.itemId}
                className="flex items-center gap-2 bg-gray-800/50 rounded p-2"
              >
                <img
                  src={getItemIconUrl(item.itemId)}
                  alt={item.name}
                  width={28}
                  height={28}
                  className="rounded"
                />
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 font-medium truncate">
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
