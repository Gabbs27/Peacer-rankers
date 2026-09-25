"use client";

import type { MatchInfo } from "@/lib/types";

interface Props {
  matchInfo: MatchInfo;
  allyTeamId: number;
}

type Participant = MatchInfo["participants"][number];

const k = (v: number) => `${(v / 1000).toFixed(1)}k`;

/** Your team vs the enemy: totals as split bars, objectives as counters. */
export default function TeamTotals({ matchInfo, allyTeamId }: Props) {
  const sum = (teamId: number, pick: (p: Participant) => number) =>
    matchInfo.participants.filter((p) => p.teamId === teamId).reduce((s, p) => s + pick(p), 0);
  const enemyTeamId = matchInfo.participants.find((p) => p.teamId !== allyTeamId)?.teamId ?? (allyTeamId === 100 ? 200 : 100);

  const rows = [
    { label: "Kills", pick: (p: Participant) => p.kills, format: String },
    { label: "Oro", pick: (p: Participant) => p.goldEarned, format: k },
    { label: "Daño", pick: (p: Participant) => p.totalDamageDealtToChampions, format: k },
    { label: "Visión", pick: (p: Participant) => p.visionScore, format: String },
  ].map((r) => ({ ...r, ally: sum(allyTeamId, r.pick), enemy: sum(enemyTeamId, r.pick) }));

  const ally = matchInfo.teams.find((t) => t.teamId === allyTeamId);
  const enemy = matchInfo.teams.find((t) => t.teamId === enemyTeamId);
  const objectives =
    ally && enemy
      ? [
          { label: "Torres", ally: ally.objectives.tower.kills, enemy: enemy.objectives.tower.kills },
          { label: "Dragones", ally: ally.objectives.dragon.kills, enemy: enemy.objectives.dragon.kills },
          { label: "Barones", ally: ally.objectives.baron.kills, enemy: enemy.objectives.baron.kills },
          { label: "Heraldos", ally: ally.objectives.riftHerald.kills, enemy: enemy.objectives.riftHerald.kills },
          { label: "Inhibidores", ally: ally.objectives.inhibitor.kills, enemy: enemy.objectives.inhibitor.kills },
        ].filter((o) => o.ally > 0 || o.enemy > 0)
      : [];

  return (
    <div className="rounded-lg bg-gray-900/50 border border-white/5 p-3 space-y-3">
      <div className="flex justify-between text-[10px] uppercase tracking-wider">
        <span className="text-blue-300">Tu equipo</span>
        <span className="text-red-300">Rival</span>
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => {
          // 0 vs 0 stays an empty (neutral) track rather than an all-red bar.
          const total = row.ally + row.enemy || 1;
          const allyPct = Math.round((row.ally / total) * 100);
          return (
            <div key={row.label} className="flex items-center gap-2 text-xs">
              <span className="w-12 text-blue-300 font-semibold">{row.format(row.ally)}</span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden flex bg-gray-950"
                role="img"
                aria-label={`${row.label}: tu equipo ${row.format(row.ally)}, rival ${row.format(row.enemy)}`}
              >
                {row.ally + row.enemy > 0 && (
                  <>
                    <span className="h-full bg-blue-500/80" style={{ width: `${allyPct}%` }} />
                    <span className="h-full bg-red-500/70 flex-1" />
                  </>
                )}
              </div>
              <span className="w-12 text-right text-red-300 font-semibold">{row.format(row.enemy)}</span>
              <span className="w-12 text-gray-500 text-[10px] uppercase">{row.label}</span>
            </div>
          );
        })}
      </div>

      {objectives.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {objectives.map((o) => (
            <li key={o.label} className="rounded bg-gray-950/60 px-2 py-1 text-xs">
              <span className="text-gray-400">{o.label} </span>
              <span className={o.ally > o.enemy ? "text-blue-300 font-semibold" : "text-gray-200"}>{o.ally}</span>
              <span className="text-gray-600"> – </span>
              <span className={o.enemy > o.ally ? "text-red-300 font-semibold" : "text-gray-200"}>{o.enemy}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
