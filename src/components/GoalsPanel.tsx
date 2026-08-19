"use client";

import { useSyncExternalStore } from "react";
import type { MatchData } from "@/lib/types";
import {
  GOALS,
  evaluateGoal,
  subscribeGoals,
  getSelectedGoals,
  getSelectedGoalsOnServer,
  toggleGoal,
} from "@/lib/goals";

interface Props {
  matches: MatchData[];
  puuid: string;
}

export default function GoalsPanel({ matches, puuid }: Props) {
  const selected = useSyncExternalStore(
    subscribeGoals,
    getSelectedGoals,
    getSelectedGoalsOnServer
  );

  const active = GOALS.filter((g) => selected.includes(g.id));

  return (
    <section aria-label="Metas personales" className="panel p-5 rise rise-5">
      <h3 className="section-title text-lg font-bold text-gray-100 mb-1">Tus metas</h3>
      <p className="text-xs text-gray-500 mb-4">
        Elige qué quieres mejorar; se evalúa sola en cada partida. Se guarda en este navegador.
      </p>

      {/* Picker */}
      <ul className="flex flex-wrap gap-2 mb-4">
        {GOALS.map((goal) => {
          const on = selected.includes(goal.id);
          return (
            <li key={goal.id}>
              <button
                type="button"
                onClick={() => toggleGoal(goal.id)}
                aria-pressed={on}
                title={goal.hint}
                className={`text-xs rounded-full px-3 py-1.5 border transition-colors focus-ring ${
                  on
                    ? "border-[#c8aa6e] bg-[#c8aa6e]/15 text-[#f0e6d2]"
                    : "border-gray-600 bg-gray-800/60 text-gray-300 hover:border-gray-500"
                }`}
              >
                {on ? "✓ " : "+ "}
                {goal.label}
              </button>
            </li>
          );
        })}
      </ul>

      {active.length === 0 ? (
        <p className="text-xs text-gray-500">
          Selecciona una meta arriba para empezar a seguirla.
        </p>
      ) : (
        <ul className="space-y-3">
          {active.map((goal) => {
            const progress = evaluateGoal(goal, matches, puuid);
            if (progress.evaluated === 0) {
              return (
                <li key={goal.id} className="text-xs text-gray-500">
                  {goal.label}: sin partidas aplicables en tu historial cargado.
                </li>
              );
            }
            return (
              <li key={goal.id} className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <p className="text-sm text-gray-100">{goal.label}</p>
                  <p className="text-sm shrink-0">
                    <span
                      className={
                        progress.rate >= 60
                          ? "text-emerald-300 font-semibold"
                          : progress.rate >= 35
                            ? "text-yellow-300 font-semibold"
                            : "text-red-300 font-semibold"
                      }
                    >
                      {progress.rate}%
                    </span>
                    <span className="text-gray-500 text-xs">
                      {" "}
                      ({progress.met}/{progress.evaluated})
                    </span>
                  </p>
                </div>
                <div
                  className="flex items-center gap-1"
                  role="img"
                  aria-label={`Últimas ${progress.recent.length} partidas aplicables: ${progress.met} cumplidas`}
                >
                  {progress.recent.map((ok, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className={`w-3.5 h-3.5 rounded-sm ${ok ? "bg-emerald-500/80" : "bg-red-500/60"}`}
                    />
                  ))}
                  {progress.streak >= 2 && (
                    <span className="ml-2 text-[11px] text-[#e3c98a]">
                      🔥 {progress.streak} seguidas
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
