"use client";

import Link from "next/link";
import type { MatchData } from "@/lib/types";
import { analyzeChampionComp, getDefensiveRecommendations } from "@/lib/builds";
import {
  classifyComp,
  recordVsComp,
  counterItemCoverage,
  COMP_LABELS,
} from "@/lib/comp-history";
import ItemIcon from "./ItemIcon";

interface Props {
  myChampion: string;
  /** Enemy champions currently in the live game (Data Dragon names). */
  enemyChampions: string[];
  /** "" when unknown — spectator data has no role, we only infer JUNGLE via Smite. */
  position: string;
  /** The player's loaded match history, for the "vs comps like this" record. */
  matches: MatchData[];
  puuid: string;
}

export default function LiveBuildAdvisor({
  myChampion,
  enemyChampions,
  position,
  matches,
  puuid,
}: Props) {
  if (enemyChampions.length === 0 || !myChampion) return null;

  const analysis = analyzeChampionComp(enemyChampions);
  const kind = classifyComp(analysis);
  const recommendation = getDefensiveRecommendations(analysis, position, myChampion);
  const record = recordVsComp(matches, puuid, kind, myChampion);
  const coverage = counterItemCoverage(recommendation.items, record);

  // A counter-item you almost never buy against this comp kind is the blind spot.
  const blindSpots = coverage.filter((c) => c.outOf >= 3 && c.built <= Math.floor(c.outOf * 0.34));

  const winrate = record.games > 0 ? Math.round((record.wins / record.games) * 100) : null;

  return (
    <div className="rounded-lg border border-[#c8aa6e]/30 bg-gray-950/50 p-4 space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="font-display text-sm font-semibold text-[#e3c98a]">
          Qué construir contra esta comp
        </h4>
        <span className="text-xs text-gray-400">
          Enemigos: {analysis.apCount} AP · {analysis.adCount} AD · {analysis.tankCount} tanque
          {analysis.tankCount === 1 ? "" : "s"} → comp {COMP_LABELS[kind]}
        </span>
      </div>

      {/* Rule-based counter items: sound game logic, needs no sample size */}
      {recommendation.items.length > 0 ? (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">
            Contraítems recomendados
          </p>
          <ul className="flex flex-wrap gap-2">
            {recommendation.items.slice(0, 6).map((item) => (
              <li
                key={item.itemId}
                className="flex items-center gap-2 bg-gray-800/70 rounded px-2 py-1.5"
                title={item.reason}
              >
                <ItemIcon itemId={item.itemId} size={24} />
                <span className="text-xs">
                  <span className="block text-gray-100">{item.name}</span>
                  <span className="block text-gray-500 text-[10px] max-w-[13rem] truncate">
                    {item.reason}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {recommendation.reasoning && (
            <p className="text-[11px] text-gray-400 mt-2">{recommendation.reasoning}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          Comp equilibrada: construye tu build estándar y adapta según quién te esté matando.
        </p>
      )}

      {/* Honest history: counts and sample size, never a fake winrate */}
      <div className="border-t border-gray-700/60 pt-3">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">
          Tu historial contra comps {COMP_LABELS[kind]}
        </p>
        {record.games === 0 ? (
          <p className="text-xs text-gray-500">
            Sin partidas contra este tipo de comp en tu historial cargado.
          </p>
        ) : (
          <p className="text-xs text-gray-300">
            <span className="font-semibold text-gray-100">
              {record.wins}V-{record.games - record.wins}D
            </span>{" "}
            en {record.games} partida{record.games === 1 ? "" : "s"}
            {winrate !== null && record.games >= 5 && (
              <span className={winrate >= 50 ? "text-blue-400" : "text-red-400"}> ({winrate}%)</span>
            )}
            {record.sameChampionGames > 0 && (
              <span className="text-gray-500">
                {" "}
                · {record.sameChampionGames} con {myChampion}
              </span>
            )}
            {record.games < 5 && (
              <span className="text-gray-500"> · muestra pequeña, tómalo como referencia</span>
            )}
          </p>
        )}
      </div>

      {/* The actionable part: counter-items you rarely buy against this comp */}
      {blindSpots.length > 0 && (
        <div className="rounded border border-red-500/25 bg-red-950/20 p-2.5">
          <p className="text-[11px] uppercase tracking-wider text-red-300 mb-1">Tu punto ciego</p>
          <p className="text-xs text-gray-300">
            Contra comps {COMP_LABELS[kind]} casi nunca compras:{" "}
            {blindSpots
              .slice(0, 3)
              .map((b) => `${b.name} (${b.built} de ${b.outOf})`)
              .join(" · ")}
          </p>
        </div>
      )}

      <Link
        href="/planner"
        className="inline-block text-xs text-[#e3c98a] hover:text-[#f0e6d2] hover:underline focus-ring rounded"
      >
        Abrir el planner para simular la build completa →
      </Link>
    </div>
  );
}
