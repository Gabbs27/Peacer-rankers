"use client";

import type { MatchData } from "@/lib/types";
import { buildTodayPlan } from "@/lib/today-plan";

interface Props {
  matches: MatchData[];
  puuid: string;
  onOpenCoaching: () => void;
}

/** The single most important item of the plan, with a way into the full view. */
export default function NextGameCallout({ matches, puuid, onOpenCoaching }: Props) {
  const plan = buildTodayPlan(matches, puuid);
  const top = plan?.actions[0];
  if (!plan || !top) return null;

  const more = plan.actions.length - 1;

  return (
    <section aria-label="Prioridad para la próxima partida" className="panel panel-glow p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#0ac8b9]">Para tu próxima partida</p>
      <p className="text-sm font-semibold text-[#f0e6d2] mt-1">{top.title}</p>
      <p className="text-xs text-gray-300 mt-1">{top.detail}</p>
      <button
        type="button"
        onClick={onOpenCoaching}
        className="mt-3 text-xs font-semibold text-[#e3c98a] hover:text-[#f0e6d2] focus-ring rounded"
      >
        {more > 0 ? `Ver el plan completo (+${more}) →` : "Ver coaching →"}
      </button>
    </section>
  );
}
