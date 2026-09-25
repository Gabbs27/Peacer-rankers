"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchData } from "@/lib/types";
import { frequentTeammates } from "@/lib/social-stats";

interface Props {
  matches: MatchData[];
  puuid: string;
  region: string;
}

const COLLAPSED = 5;

export default function TeammatesPanel({ matches, puuid, region }: Props) {
  const [showAll, setShowAll] = useState(false);
  const teammates = frequentTeammates(matches, puuid);
  if (teammates.length === 0) return null;

  const shown = showAll ? teammates : teammates.slice(0, COLLAPSED);

  return (
    <section aria-label="Compañeros frecuentes" className="panel p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Juegas seguido con</p>
      <ul className="space-y-0.5">
        {shown.map((t) => (
          <li key={t.puuid}>
            <Link
              href={`/summoner/${region}/${encodeURIComponent(t.gameName)}-${encodeURIComponent(t.tagLine)}`}
              className="flex items-center gap-2 rounded px-2 py-1.5 -mx-2 hover:bg-white/5 transition-colors focus-ring group"
              title={`Ver perfil de ${t.gameName}#${t.tagLine}`}
            >
              <span className="flex-1 min-w-0 truncate text-sm text-gray-200 group-hover:text-[#e3c98a]">
                {t.gameName}
                <span className="text-gray-500 text-xs"> #{t.tagLine}</span>
              </span>
              <span className="text-[11px] text-gray-500 shrink-0">{t.games}j</span>
              <span
                className={`text-xs font-semibold shrink-0 w-9 text-right ${
                  t.winrate >= 50 ? "text-blue-300" : "text-red-300"
                }`}
              >
                {t.winrate}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {teammates.length > COLLAPSED && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
          className="mt-2 text-xs text-gray-400 hover:text-[#e3c98a] focus-ring rounded"
        >
          {showAll ? "Ver menos" : `Ver todos (${teammates.length})`}
        </button>
      )}
    </section>
  );
}
