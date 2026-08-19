"use client";

import type { MatchData } from "@/lib/types";
import { analyzeTilt } from "@/lib/tilt";
import { useMounted } from "@/lib/use-mounted";

interface Props {
  matches: MatchData[];
  puuid: string;
}

function WinrateBar({ winrate }: { winrate: number }) {
  const good = winrate >= 50;
  return (
    <div className="h-1.5 rounded bg-gray-800 overflow-hidden" aria-hidden>
      <div
        className={`h-full rounded ${good ? "bg-blue-400" : "bg-red-400"}`}
        style={{ width: `${Math.max(winrate, 3)}%` }}
      />
    </div>
  );
}

export default function TiltPanel({ matches, puuid }: Props) {
  // Hour-of-day buckets depend on the viewer's timezone, so they can only be
  // computed on the client; everything else is timezone-independent.
  const mounted = useMounted();
  const stats = analyzeTilt(matches, puuid);
  if (!stats) return null;

  const bestHour = [...stats.byHour].filter((h) => h.games >= 3).sort((a, b) => b.winrate - a.winrate)[0];
  const worstHour = [...stats.byHour].filter((h) => h.games >= 3).sort((a, b) => a.winrate - b.winrate)[0];

  return (
    <section aria-label="Fatiga y horarios" className="panel p-5 rise rise-3">
      <h3 className="section-title text-lg font-bold text-gray-100 mb-3">
        ¿Cuándo deberías parar?
        <span className="text-xs text-gray-500 font-sans font-normal">
          ({stats.totalGames} partidas en {stats.sessions} sesion{stats.sessions === 1 ? "" : "es"})
        </span>
      </h3>

      {stats.verdict && (
        <div className="rounded-lg border border-[#c8aa6e]/30 bg-[#c8aa6e]/5 p-3 mb-4">
          <p className="text-sm text-gray-100">⏱️ {stats.verdict}</p>
        </div>
      )}

      <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">
        Winrate según cuántas partidas llevas seguidas
      </p>
      <ul className="space-y-2 mb-4">
        {stats.byDepth.map((b) => (
          <li key={b.label} className="flex items-center gap-3 text-xs">
            <span className="w-28 shrink-0 text-gray-300">{b.label}</span>
            <span className="w-14 shrink-0 text-right font-semibold text-gray-100">{b.winrate}%</span>
            <span className="flex-1"><WinrateBar winrate={b.winrate} /></span>
            <span className="w-16 text-right text-gray-500">
              {b.wins}V-{b.games - b.wins}D
            </span>
          </li>
        ))}
      </ul>

      {stats.afterTwoLosses && (
        <p className="text-xs text-gray-300 mb-4">
          Tras 2 derrotas seguidas:{" "}
          <span className={stats.afterTwoLosses.winrate >= 50 ? "text-blue-400 font-semibold" : "text-red-400 font-semibold"}>
            {stats.afterTwoLosses.winrate}%
          </span>{" "}
          <span className="text-gray-500">
            ({stats.afterTwoLosses.wins}V-{stats.afterTwoLosses.games - stats.afterTwoLosses.wins}D)
          </span>
        </p>
      )}

      {mounted && bestHour && worstHour && bestHour.hour !== worstHour.hour && (
        <p className="text-xs text-gray-300 border-t border-gray-700/60 pt-3">
          Tu mejor hora:{" "}
          <span className="text-blue-400 font-semibold">
            {bestHour.hour}:00 ({bestHour.winrate}%)
          </span>{" "}
          · la peor:{" "}
          <span className="text-red-400 font-semibold">
            {worstHour.hour}:00 ({worstHour.winrate}%)
          </span>
          <span className="text-gray-500"> · hora local, mínimo 3 partidas</span>
        </p>
      )}
    </section>
  );
}
