"use client";

import { useEffect, useState } from "react";
import type { ChampionMastery } from "@/lib/types";
import { getChampionDataUrl } from "@/lib/data-dragon";
import { useDDragonVersion } from "./DDragonProvider";
import ChampionIcon from "./ChampionIcon";

interface Props {
  mastery: ChampionMastery[];
}

function formatPoints(points: number): string {
  if (points >= 1000) return `${(points / 1000).toFixed(points >= 10000 ? 0 : 1)}k`;
  return String(points);
}

// Champion mastery returns champion IDs; Data Dragon icons are keyed by champion
// name, so we fetch the champion list once and build an id -> name lookup.
export default function ChampionMasterySection({ mastery }: Props) {
  const version = useDDragonVersion();
  const [idToName, setIdToName] = useState<Record<number, string>>({});

  useEffect(() => {
    if (mastery.length === 0) return;
    let cancelled = false;
    fetch(getChampionDataUrl(version, "es_MX"))
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const map: Record<number, string> = {};
        for (const champ of Object.values(data.data) as { id: string; key: string }[]) {
          map[Number(champ.key)] = champ.id;
        }
        setIdToName(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [version, mastery.length]);

  if (mastery.length === 0) return null;

  return (
    <section aria-label="Maestría de campeones" className="bg-gray-800/50 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-gray-100 mb-3">Maestría de campeones</h2>
      <ul className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {mastery.map((m) => {
          const name = idToName[m.championId];
          return (
            <li key={m.championId} className="flex flex-col items-center gap-1 text-center">
              <div className="relative">
                {name ? (
                  <ChampionIcon championName={name} size={56} className="border-2 border-gray-600" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-700 animate-pulse" aria-hidden />
                )}
                <span
                  className="absolute -bottom-1 -right-1 bg-gray-900 text-yellow-400 text-[11px] font-bold rounded-full w-6 h-6 flex items-center justify-center border border-gray-600"
                  title={`Nivel de maestría ${m.championLevel}`}
                >
                  {m.championLevel}
                </span>
              </div>
              <span className="text-xs text-gray-400 mt-1">{formatPoints(m.championPoints)} pts</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
