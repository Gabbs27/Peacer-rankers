"use client";

import type { MatchData } from "@/lib/types";
import { matchupRecords } from "@/lib/matchups";
import ChampionIcon from "./ChampionIcon";

interface Props {
  matches: MatchData[];
  puuid: string;
}

export default function MatchupsPanel({ matches, puuid }: Props) {
  const records = matchupRecords(matches, puuid);
  if (records.length === 0) return null;

  const worst = records.slice(0, 4);
  const best = [...records].reverse().slice(0, 3).filter((r) => r.winrate >= 60);

  return (
    <section aria-label="Matchups de línea" className="panel p-5">
      <h3 className="section-title text-base font-bold text-gray-100 mb-3">
        Tus matchups
        <span className="text-xs text-gray-500 font-sans font-normal">
          (rival directo de tu línea · mínimo 2 partidas)
        </span>
      </h3>

      <p className="text-[11px] uppercase tracking-wider text-red-300 mb-2">Te cuestan más</p>
      <ul className="space-y-2 mb-4">
        {worst.map((r) => (
          <li key={r.opponent} className="flex items-center gap-3 text-xs">
            <ChampionIcon championName={r.opponent} size={28} />
            <span className="flex-1 min-w-0">
              <span className="block text-gray-100 truncate">{r.opponent}</span>
              <span className="block text-gray-500 truncate">
                con {r.yourChampions.slice(0, 2).join(", ")}
              </span>
            </span>
            <span className="w-16 text-right">
              <span className={`font-semibold ${r.winrate >= 50 ? "text-blue-400" : "text-red-400"}`}>
                {r.winrate}%
              </span>
              <span className="block text-gray-500">
                {r.wins}V-{r.games - r.wins}D
              </span>
            </span>
            <span className="w-20 text-right">
              <span className={r.avgGoldDiff >= 0 ? "text-emerald-300" : "text-red-300"}>
                {r.avgGoldDiff >= 0 ? "+" : ""}
                {r.avgGoldDiff} oro
              </span>
              <span className="block text-gray-500">
                {r.avgCsDiff >= 0 ? "+" : ""}
                {r.avgCsDiff} CS
              </span>
            </span>
          </li>
        ))}
      </ul>

      {best.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-wider text-emerald-300 mb-2">Te van bien</p>
          <ul className="flex flex-wrap gap-2">
            {best.map((r) => (
              <li key={r.opponent} className="flex items-center gap-2 bg-gray-800/60 rounded px-2 py-1 text-xs">
                <ChampionIcon championName={r.opponent} size={20} />
                <span className="text-gray-200">{r.opponent}</span>
                <span className="text-blue-400 font-semibold">{r.winrate}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
