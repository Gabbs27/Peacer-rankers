"use client";

import type { MatchInfo } from "@/lib/types";

interface Props {
  matchInfo: MatchInfo;
}

interface Row {
  label: string;
  blue: number;
  red: number;
  format: (v: number) => string;
}

/** Compact blue-vs-red comparison of kills, gold and damage. */
export default function TeamTotals({ matchInfo }: Props) {
  const sum = (teamId: number, pick: (p: MatchInfo["participants"][number]) => number) =>
    matchInfo.participants.filter((p) => p.teamId === teamId).reduce((s, p) => s + pick(p), 0);

  const rows: Row[] = [
    { label: "Kills", blue: sum(100, (p) => p.kills), red: sum(200, (p) => p.kills), format: (v) => String(v) },
    { label: "Oro", blue: sum(100, (p) => p.goldEarned), red: sum(200, (p) => p.goldEarned), format: (v) => `${(v / 1000).toFixed(1)}k` },
    { label: "Daño", blue: sum(100, (p) => p.totalDamageDealtToChampions), red: sum(200, (p) => p.totalDamageDealtToChampions), format: (v) => `${(v / 1000).toFixed(1)}k` },
  ];

  return (
    <div className="rounded-lg bg-gray-800/40 p-3 space-y-1.5">
      {rows.map((row) => {
        const total = row.blue + row.red || 1;
        const bluePct = Math.round((row.blue / total) * 100);
        return (
          <div key={row.label} className="flex items-center gap-2 text-xs">
            <span className="w-12 text-right text-blue-400 font-semibold">{row.format(row.blue)}</span>
            <div
              className="flex-1 h-2 rounded-full overflow-hidden flex bg-gray-900"
              role="img"
              aria-label={`${row.label}: equipo azul ${row.format(row.blue)}, equipo rojo ${row.format(row.red)}`}
            >
              <span className="h-full bg-blue-500/80" style={{ width: `${bluePct}%` }} />
              <span className="h-full bg-red-500/80 flex-1" />
            </div>
            <span className="w-12 text-red-400 font-semibold">{row.format(row.red)}</span>
            <span className="w-10 text-gray-500 text-[10px] uppercase">{row.label}</span>
          </div>
        );
      })}
    </div>
  );
}
