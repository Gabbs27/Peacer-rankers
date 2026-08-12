"use client";

import type { MatchData } from "@/lib/types";
import { recentForm, roleStats } from "@/lib/social-stats";

interface Props {
  matches: MatchData[];
  puuid: string;
}

const ROLE_LABELS: Record<string, string> = {
  TOP: "TOP",
  JUNGLE: "JG",
  MIDDLE: "MID",
  BOTTOM: "ADC",
  UTILITY: "SUP",
};

export default function FormPanel({ matches, puuid }: Props) {
  const form = recentForm(matches, puuid);
  const roles = roleStats(matches, puuid);
  if (form.length < 3) return null;

  return (
    <section aria-label="Forma reciente" className="panel p-5 rise rise-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* W/L dots, newest first */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">
            Forma reciente <span className="normal-case">(más nueva primero)</span>
          </p>
          <div className="flex items-center gap-1.5" role="img" aria-label={`Últimas ${form.length} partidas: ${form.map((r) => (r === "W" ? "victoria" : "derrota")).join(", ")}`}>
            {form.map((r, i) => (
              <span
                key={i}
                aria-hidden
                className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                  r === "W" ? "bg-blue-500/90 text-blue-950" : "bg-red-500/80 text-red-950"
                }`}
              >
                {r === "W" ? "V" : "D"}
              </span>
            ))}
          </div>
        </div>

        {/* Per-role winrates */}
        {roles.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">Por rol</p>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <span key={r.position} className="bg-gray-800/60 rounded px-2 py-1 text-xs">
                  <span className="text-gray-300 font-semibold">
                    {ROLE_LABELS[r.position] ?? r.position}
                  </span>{" "}
                  <span className={r.winrate >= 50 ? "text-blue-400" : "text-red-400"}>
                    {r.winrate}%
                  </span>
                  <span className="text-gray-500"> · {r.games}j</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
