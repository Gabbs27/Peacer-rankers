"use client";

import { useEffect, useState } from "react";
import { loadChampionIdMap } from "@/lib/champion-client";
import { useDDragonVersion } from "./DDragonProvider";
import ChampionIcon from "./ChampionIcon";

interface Props {
  bans: { championId: number; pickTurn: number }[];
}

/** Banned champions for one team (championId -1 = no ban, skipped). */
export default function BansRow({ bans }: Props) {
  const version = useDDragonVersion();
  const [idMap, setIdMap] = useState<Record<number, string>>({});

  const real = bans.filter((b) => b.championId > 0);

  useEffect(() => {
    if (real.length === 0) return;
    let cancelled = false;
    loadChampionIdMap(version)
      .then((map) => {
        if (!cancelled) setIdMap(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [version, real.length]);

  if (real.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-[10px] uppercase tracking-wider text-gray-500">Baneos</span>
      {real.map((b, i) => {
        const name = idMap[b.championId];
        return name ? (
          <span key={`${b.championId}-${i}`} className="relative inline-flex" title={`Baneado: ${name}`}>
            <ChampionIcon championName={name} size={20} className="grayscale opacity-70" />
            <span className="absolute inset-0 flex items-center justify-center text-red-500 text-xs font-black" aria-hidden>
              ⌀
            </span>
          </span>
        ) : (
          <span key={`${b.championId}-${i}`} className="w-5 h-5 rounded-full bg-gray-800 animate-pulse" aria-hidden />
        );
      })}
    </div>
  );
}
