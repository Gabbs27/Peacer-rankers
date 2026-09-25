"use client";

import { BuildRecommendation as BuildRecType, TeamAnalysis } from "@/lib/builds";
import ItemIcon from "./ItemIcon";

interface Props {
  recommendation: BuildRecType;
  analysis: TeamAnalysis;
  buildVerdict: { verdict: string; level: "good" | "ok" | "bad" };
}

const verdictColors = {
  good: "text-green-300 bg-green-900/40 border-green-500/50",
  ok: "text-yellow-300 bg-yellow-900/40 border-yellow-500/50",
  bad: "text-red-300 bg-red-900/40 border-red-500/50",
};

export default function BuildRecommendation({ recommendation, analysis, buildVerdict }: Props) {
  const totalDisplayed = analysis.apCount + analysis.adCount + analysis.tankCount;

  return (
    <div className="rounded-lg bg-gray-900/50 border border-white/5 p-3">
      <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Build vs la comp enemiga</h4>
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
        <span className="px-2 py-1 text-gray-500 text-xs">
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
                className="flex items-center gap-2 bg-gray-950/50 rounded-lg p-2"
              >
                <span className="shrink-0" title={item.name}>
                  <ItemIcon itemId={item.itemId} size={32} />
                </span>
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
