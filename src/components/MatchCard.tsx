"use client";

import { useState } from "react";
import { MatchData, LeagueEntry } from "@/lib/types";
import {
  formatDuration,
  getKDA,
  getQueueName,
  getMapName,
  getSummonerSpellIconUrl,
  getMobafireSearchUrl,
} from "@/lib/data-dragon";
import { generateTips, generateTeamAnalysis } from "@/lib/tips";
import { calculatePerformanceScore } from "@/lib/scoring";
import { analyzeEnemyTeam, getDefensiveRecommendations, analyzeBuildEfficiency } from "@/lib/builds";
import ChampionIcon from "./ChampionIcon";
import ItemIcon from "./ItemIcon";
import TipsBadge from "./TipsBadge";
import PerformanceScoreComponent from "./PerformanceScore";
import BuildRecommendationComponent from "./BuildRecommendation";

interface Props {
  match: MatchData;
  puuid: string;
  ranked?: LeagueEntry[];
}

export default function MatchCard({ match, puuid, ranked }: Props) {
  const [expanded, setExpanded] = useState(false);
  const player = match.info.participants.find((p) => p.puuid === puuid);

  if (!player) return null;

  const tips = generateTips(player, match.info);
  const teamTips = generateTeamAnalysis(player.teamId, match.info);
  const perfScore = calculatePerformanceScore(player, match.info);
  const soloQ = ranked?.find((r) => r.queueType === "RANKED_SOLO_5x5");
  const enemyAnalysis = analyzeEnemyTeam(match.info, player.teamId);
  const buildRec = getDefensiveRecommendations(enemyAnalysis, player.individualPosition, player.championName);
  const buildVerdict = analyzeBuildEfficiency(player, enemyAnalysis);
  const timeSince = getTimeSince(match.info.gameCreation);
  const items = [
    player.item0,
    player.item1,
    player.item2,
    player.item3,
    player.item4,
    player.item5,
  ];

  const playerTeam = match.info.teams.find((t) => t.teamId === player.teamId);
  const enemyTeam = match.info.teams.find((t) => t.teamId !== player.teamId);

  // Find highest damage dealer per team for highlighting
  const highestDmg = Math.max(
    ...match.info.participants.map((p) => p.totalDamageDealtToChampions)
  );

  return (
    <div
      className={`rounded-lg border ${
        player.win
          ? "bg-blue-900/30 border-blue-700/50"
          : "bg-red-900/30 border-red-700/50"
      }`}
    >
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 text-left hover:bg-white/5 transition-colors overflow-hidden"
      >
        {/* Win/Loss indicator */}
        <div
          className={`w-1 h-12 sm:h-16 rounded-full shrink-0 ${
            player.win ? "bg-blue-500" : "bg-red-500"
          }`}
        />

        {/* Champion + Summoner Spells */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex flex-col items-center">
            <ChampionIcon championName={player.championName} size={40} className="sm:w-12 sm:h-12" />
            <span className="text-[10px] text-gray-300">
              Lv{player.champLevel}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 hidden sm:flex">
            <img
              src={getSummonerSpellIconUrl(player.summoner1Id)}
              alt="Spell 1"
              width={18}
              height={18}
              className="rounded"
            />
            <img
              src={getSummonerSpellIconUrl(player.summoner2Id)}
              alt="Spell 2"
              width={18}
              height={18}
              className="rounded"
            />
          </div>
        </div>

        {/* KDA + CS on mobile */}
        <div className="min-w-0 shrink">
          <p className="font-bold text-sm sm:text-base">
            {player.kills}/{player.deaths}/{player.assists}
          </p>
          <p className="text-xs text-gray-300">
            {getKDA(player.kills, player.deaths, player.assists)} KDA
          </p>
          <p className="text-[10px] text-gray-400 sm:hidden">
            {player.totalMinionsKilled + player.neutralMinionsKilled} CS · {formatDuration(match.info.gameDuration)}
          </p>
        </div>

        {/* CS - hidden on mobile */}
        <div className="min-w-[70px] hidden sm:block">
          <p className="text-sm">
            {player.totalMinionsKilled + player.neutralMinionsKilled} CS
          </p>
          <p className="text-xs text-gray-300">
            {(
              (player.totalMinionsKilled + player.neutralMinionsKilled) /
              (match.info.gameDuration / 60)
            ).toFixed(1)}{" "}
            /min
          </p>
        </div>

        {/* Items + Trinket - hidden on mobile */}
        <div className="hidden md:flex items-center gap-1">
          {items.map((item, i) => (
            <ItemIcon key={i} itemId={item} size={26} />
          ))}
          <div className="ml-1">
            <ItemIcon itemId={player.item6} size={26} />
          </div>
        </div>

        {/* Duration - hidden on mobile/tablet */}
        <div className="hidden lg:block text-center min-w-[60px]">
          <p className="text-lg font-mono font-semibold text-gray-200">
            {formatDuration(match.info.gameDuration)}
          </p>
        </div>

        {/* Game info */}
        <div className="ml-auto text-right shrink-0">
          <p
            className={`text-xs sm:text-sm font-semibold ${
              player.win ? "text-blue-400" : "text-red-400"
            }`}
          >
            {player.win ? "Victoria" : "Derrota"}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-300 hidden sm:block">
            {getQueueName(match.info.queueId)}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 sm:hidden">
            {timeSince}
          </p>
          <p className="text-xs text-gray-400 hidden sm:block lg:hidden">
            {formatDuration(match.info.gameDuration)} · {timeSince}
          </p>
          <p className="text-xs text-gray-400 hidden lg:block">
            {timeSince}
          </p>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-600 p-4 space-y-4">
          {/* Performance Score */}
          <PerformanceScoreComponent
            score={perfScore}
            actualTier={soloQ?.tier}
            actualRank={soloQ?.rank}
          />

          {/* Personal Tips */}
          {tips.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-2">
                Tu Rendimiento
              </h4>
              <div className="flex flex-wrap gap-2">
                {tips.map((tip, i) => (
                  <TipsBadge key={i} tip={tip} />
                ))}
              </div>
            </div>
          )}

          {/* Guide link */}
          <div>
            <a
              href={getMobafireSearchUrl(player.championName)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600/80 hover:bg-orange-500/80 text-white text-sm font-semibold rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Ver Guías de {player.championName} en Mobafire
            </a>
          </div>

          {/* Build Recommendation */}
          <BuildRecommendationComponent
            recommendation={buildRec}
            analysis={enemyAnalysis}
            buildVerdict={buildVerdict}
          />

          {/* Objectives comparison */}
          {playerTeam && enemyTeam && (
            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-2">
                Objetivos
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                <ObjectiveStat
                  label="Dragones"
                  ally={playerTeam.objectives.dragon.kills}
                  enemy={enemyTeam.objectives.dragon.kills}
                />
                <ObjectiveStat
                  label="Barones"
                  ally={playerTeam.objectives.baron.kills}
                  enemy={enemyTeam.objectives.baron.kills}
                />
                <ObjectiveStat
                  label="Torres"
                  ally={playerTeam.objectives.tower.kills}
                  enemy={enemyTeam.objectives.tower.kills}
                />
                <ObjectiveStat
                  label="Heraldos"
                  ally={playerTeam.objectives.riftHerald.kills}
                  enemy={enemyTeam.objectives.riftHerald.kills}
                />
                <ObjectiveStat
                  label="Inhibidores"
                  ally={playerTeam.objectives.inhibitor.kills}
                  enemy={enemyTeam.objectives.inhibitor.kills}
                />
                <ObjectiveStat
                  label="Kills"
                  ally={playerTeam.objectives.champion.kills}
                  enemy={enemyTeam.objectives.champion.kills}
                />
              </div>
            </div>
          )}

          {/* Team Analysis */}
          {teamTips.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-2">
                Análisis de Equipos
              </h4>
              <div className="flex flex-wrap gap-2">
                {teamTips.map((tip, i) => (
                  <TipsBadge key={i} tip={tip} />
                ))}
              </div>
            </div>
          )}

          {/* All players */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[100, 200].map((teamId) => {
              const team = match.info.teams.find((t) => t.teamId === teamId);
              const isPlayerTeam = teamId === player.teamId;
              return (
                <div key={teamId}>
                  <h4
                    className={`text-sm font-semibold mb-2 ${
                      teamId === 100 ? "text-blue-400" : "text-red-400"
                    }`}
                  >
                    {teamId === 100 ? "Equipo Azul" : "Equipo Rojo"}
                    {isPlayerTeam && (
                      <span className="text-gray-400 font-normal ml-1">
                        (tu equipo)
                      </span>
                    )}
                    {team && (
                      <span className="text-gray-400 font-normal ml-2">
                        {team.win ? "Victoria" : "Derrota"}
                      </span>
                    )}
                  </h4>
                  <div className="space-y-1">
                    {match.info.participants
                      .filter((p) => p.teamId === teamId)
                      .map((p) => (
                        <div
                          key={p.puuid}
                          className={`flex items-center gap-2 p-2 rounded text-sm ${
                            p.puuid === puuid ? "bg-white/10" : ""
                          }`}
                        >
                          <ChampionIcon
                            championName={p.championName}
                            size={28}
                          />
                          <span className="text-xs text-gray-400 w-8 shrink-0 text-center" title={p.individualPosition}>
                            {getRoleLabel(p.individualPosition)}
                          </span>
                          <span className="flex-1 truncate min-w-0">
                            {p.riotIdGameName || p.summonerName}
                          </span>
                          <span className="text-gray-300 shrink-0">
                            {p.kills}/{p.deaths}/{p.assists}
                          </span>
                          <span
                            className={`text-xs w-14 text-right shrink-0 ${
                              p.totalDamageDealtToChampions === highestDmg
                                ? "text-yellow-300 font-bold"
                                : "text-gray-400"
                            }`}
                          >
                            {(
                              p.totalDamageDealtToChampions / 1000
                            ).toFixed(1)}
                            k
                          </span>
                          <span className="text-gray-400 text-xs w-10 text-right shrink-0 hidden sm:inline">
                            {(p.goldEarned / 1000).toFixed(1)}k g
                          </span>
                          <span className="text-gray-400 text-xs w-8 text-right shrink-0 hidden sm:inline">
                            {p.visionScore}v
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ObjectiveStat({
  label,
  ally,
  enemy,
}: {
  label: string;
  ally: number;
  enemy: number;
}) {
  const isAhead = ally > enemy;
  const isBehind = ally < enemy;
  return (
    <div className="bg-gray-700/30 rounded-lg p-2 text-center">
      <p className="text-xs text-gray-300 mb-1">{label}</p>
      <p className="text-sm font-bold">
        <span
          className={
            isAhead
              ? "text-green-300"
              : isBehind
              ? "text-red-300"
              : "text-gray-200"
          }
        >
          {ally}
        </span>
        <span className="text-gray-400 mx-1">vs</span>
        <span
          className={
            isBehind
              ? "text-green-300"
              : isAhead
              ? "text-red-300"
              : "text-gray-200"
          }
        >
          {enemy}
        </span>
      </p>
    </div>
  );
}

function getRoleLabel(position: string): string {
  const roles: Record<string, string> = {
    TOP: "TOP",
    JUNGLE: "JG",
    MIDDLE: "MID",
    BOTTOM: "ADC",
    UTILITY: "SUP",
  };
  return roles[position] || "?";
}

function getTimeSince(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `hace ${days}d`;
  if (hours > 0) return `hace ${hours}h`;
  return `hace ${minutes}m`;
}
