"use client";

import Link from "next/link";
import type { MatchData } from "@/lib/types";
import { frequentTeammates } from "@/lib/social-stats";

interface Props {
  matches: MatchData[];
  puuid: string;
  region: string;
}

export default function TeammatesPanel({ matches, puuid, region }: Props) {
  const teammates = frequentTeammates(matches, puuid).slice(0, 8);
  if (teammates.length === 0) return null;

  return (
    <section aria-label="Compañeros frecuentes" className="panel p-5 rise rise-4">
      <h3 className="section-title text-lg font-bold text-gray-100 mb-3">
        Compañeros frecuentes
        <span className="text-xs text-gray-500 font-sans font-normal">
          (en las partidas cargadas)
        </span>
      </h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {teammates.map((t) => (
          <li key={t.puuid}>
            <Link
              href={`/summoner/${region}/${encodeURIComponent(t.gameName)}-${encodeURIComponent(t.tagLine)}`}
              className="flex items-center gap-3 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 px-3 py-2 transition-colors focus-ring group"
              title={`Ver perfil de ${t.gameName}#${t.tagLine}`}
            >
              <span className="flex-1 min-w-0 truncate text-sm text-gray-100 group-hover:text-[#e3c98a]">
                {t.gameName}
                <span className="text-gray-500 text-xs"> #{t.tagLine}</span>
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {t.games} juntas
              </span>
              <span
                className={`text-sm font-bold shrink-0 w-12 text-right ${
                  t.winrate >= 50 ? "text-blue-400" : "text-red-400"
                }`}
              >
                {t.winrate}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
