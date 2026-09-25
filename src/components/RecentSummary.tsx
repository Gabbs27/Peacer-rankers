"use client";

import type { MatchData } from "@/lib/types";
import { summarizeRecent } from "@/lib/profile-summary";
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-gray-900/50 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-base font-bold text-gray-100 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 truncate">{sub}</p>}
    </div>
  );
}

/** Record, form, averages and roles over the loaded sample — one compact card. */
export default function RecentSummary({ matches, puuid }: Props) {
  const summary = summarizeRecent(matches, puuid);
  if (!summary) return null;

  const form = recentForm(matches, puuid);
  const roles = roleStats(matches, puuid).slice(0, 3);
  const good = summary.winrate >= 50;

  return (
    <section aria-label="Resumen reciente" className="panel p-4 space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-gray-400">
          Últimas {summary.games} partidas
          {summary.remakes > 0 && (
            <span className="normal-case tracking-normal text-gray-500"> · {summary.remakes} remake</span>
          )}
        </p>
        <div className="flex items-baseline justify-between mt-1">
          <p className="text-sm">
            <span className="text-blue-400 font-semibold">{summary.wins}V</span>{" "}
            <span className="text-red-400 font-semibold">{summary.losses}D</span>
          </p>
          <p className={`font-display text-2xl font-bold ${good ? "text-blue-300" : "text-red-300"}`}>
            {summary.winrate}%
          </p>
        </div>
        <div className="h-1.5 mt-1.5 rounded-full bg-red-500/50 overflow-hidden" aria-hidden>
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${summary.winrate}%` }} />
        </div>
        {summary.streak && (
          <p className={`text-xs mt-1.5 ${summary.streak.result === "W" ? "text-blue-300" : "text-red-300"}`}>
            {summary.streak.count} {summary.streak.result === "W" ? "victorias" : "derrotas"} seguidas
          </p>
        )}
      </div>

      {form.length >= 3 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Forma (más nueva primero)</p>
          <div
            className="flex gap-1"
            role="img"
            aria-label={`Últimas ${form.length}: ${form.map((r) => (r === "W" ? "victoria" : "derrota")).join(", ")}`}
          >
            {form.map((r, i) => (
              <span
                key={i}
                aria-hidden
                className={`h-2 flex-1 rounded-full ${r === "W" ? "bg-blue-400/90" : "bg-red-400/80"}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="KDA"
          value={summary.kda === null ? "Perfecto" : summary.kda.toFixed(2)}
          sub={`${summary.kills.toFixed(1)} / ${summary.deaths.toFixed(1)} / ${summary.assists.toFixed(1)}`}
        />
        <Stat label="CS/min" value={summary.csPerMin.toFixed(1)} />
        <Stat label="Part. kills" value={`${Math.round(summary.killParticipation)}%`} />
        <Stat label="Rendimiento" value={`${summary.avgScore}`} sub="de 100" />
      </div>

      {roles.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Por rol</p>
          <ul className="space-y-1">
            {roles.map((r) => (
              <li key={r.position} className="flex items-center gap-2 text-xs">
                <span className="w-9 font-semibold text-gray-300">{ROLE_LABELS[r.position] ?? r.position}</span>
                <span className="flex-1 h-1 rounded bg-gray-800 overflow-hidden" aria-hidden>
                  <span
                    className={`block h-full rounded ${r.winrate >= 50 ? "bg-blue-400" : "bg-red-400"}`}
                    style={{ width: `${Math.max(r.winrate, 3)}%` }}
                  />
                </span>
                <span className={`w-9 text-right ${r.winrate >= 50 ? "text-blue-300" : "text-red-300"}`}>
                  {r.winrate}%
                </span>
                <span className="w-8 text-right text-gray-500">{r.games}j</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
