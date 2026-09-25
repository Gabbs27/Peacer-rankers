"use client";

import type { MetricDef, MetricGroup, Verdict } from "@/lib/coaching-metrics";

interface Props {
  metrics: { def: MetricDef; value: number; verdict: Verdict }[];
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

/** Every Riot-computed metric for one game, grouped by area. */
export default function MetricsGrid({ metrics }: Props) {
  const byGroup = new Map<MetricGroup, Props["metrics"]>();
  for (const m of metrics) {
    const list = byGroup.get(m.def.group) ?? [];
    list.push(m);
    byGroup.set(m.def.group, list);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[...byGroup.entries()].map(([group, list]) => (
        <div key={group} className="bg-gray-900/50 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">{GROUP_LABELS[group]}</p>
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
  );
}
