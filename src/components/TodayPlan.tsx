"use client";

import type { MatchData } from "@/lib/types";
import { buildTodayPlan, type ActionKind } from "@/lib/today-plan";

interface Props {
  matches: MatchData[];
  puuid: string;
}

const ICONS: Record<ActionKind, string> = {
  formula: "🎯",
  losses: "🔁",
  tilt: "⏱️",
  matchup: "⚔️",
  champion: "⭐",
};

export default function TodayPlan({ matches, puuid }: Props) {
  const plan = buildTodayPlan(matches, puuid);
  if (!plan || plan.actions.length === 0) return null;

  return (
    <section
      aria-label="Tu plan para la próxima partida"
      className="panel panel-glow p-5"
    >
      <h2 className="section-title text-lg font-bold text-gray-100 mb-1">
        Tu plan para la próxima partida
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Lo más importante primero, calculado con tus últimas {plan.sampleSize} partidas.
      </p>

      <ol className="space-y-3">
        {plan.actions.map((action, i) => (
          <li key={action.kind} className="flex gap-3">
            <span
              className="shrink-0 w-7 h-7 rounded-full bg-gray-800 border border-[#c8aa6e]/30 flex items-center justify-center text-sm"
              aria-hidden
            >
              {ICONS[action.kind]}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#f0e6d2]">
                <span className="sr-only">Prioridad {i + 1}: </span>
                {action.title}
              </p>
              <p className="text-xs text-gray-300 mt-0.5">{action.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
