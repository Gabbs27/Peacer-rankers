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
  getUGGChampionUrl,
} from "@/lib/data-dragon";
import { generateTips, generateTeamAnalysis } from "@/lib/tips";
import { calculatePerformanceScore } from "@/lib/scoring";
import { analyzeEnemyTeam, getDefensiveRecommendations, analyzeBuildEfficiency } from "@/lib/builds";
import ChampionIcon from "./ChampionIcon";
import ItemIcon from "./ItemIcon";
import TipsBadge from "./TipsBadge";
import PerformanceScoreComponent from "./PerformanceScore";
import BuildRecommendationComponent from "./BuildRecommendation";
import { getBriarMatchup, getBriarBuildForComp, BRIAR_TIPS } from "@/lib/briar-guide";
import { getItemIconUrl } from "@/lib/data-dragon";

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
  const soloQ = ranked?.find((r) => r.queueType === "RANKED_SOLO_5x5")
    || ranked?.find((r) => r.queueType === "RANKED_FLEX_SR");
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

  // Find worst teammate (exclude self) — only for non-remakes
  const isRemake = match.info.gameDuration < 300;
  const allies = match.info.participants.filter(
    (p) => p.teamId === player.teamId && p.puuid !== puuid
  );
  const worstAlly = !isRemake && allies.length > 0 ? findWorstTeammate(allies, match.info.gameDuration) : null;

  return (
    <article
      className={`rounded-lg border ${
        player.win
          ? "bg-blue-900/30 border-blue-700/50"
          : "bg-red-900/30 border-red-700/50"
      }`}
    >
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${player.championName}, ${player.win ? "Victoria" : "Derrota"}, ${player.kills}/${player.deaths}/${player.assists}`}
        className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 text-left hover:bg-white/5 transition-colors overflow-hidden"
      >
        {/* Win/Loss indicator */}
        <div
          className={`w-1 h-12 sm:h-16 rounded-full shrink-0 ${
            player.win ? "bg-blue-500" : "bg-red-500"
          }`}
        />
        <span className="sr-only">{player.win ? "Victoria" : "Derrota"}</span>

        {/* Champion + Summoner Spells */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex flex-col items-center">
            <ChampionIcon championName={player.championName} size={40} className="sm:w-12 sm:h-12" />
            <span className="text-xs text-gray-300">
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
          <p className="text-xs text-gray-400 sm:hidden">
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
          <p className="text-xs sm:text-xs text-gray-300 hidden sm:block">
            {getQueueName(match.info.queueId)}
          </p>
          <p className="text-xs sm:text-xs text-gray-400 sm:hidden">
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
        <section aria-label="Detalles de la partida" className="border-t border-gray-600 p-4 space-y-4">
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

          {/* Match info bar */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 bg-gray-800/40 rounded-lg px-4 py-2">
            <span className="font-medium text-gray-100">
              {formatDuration(match.info.gameDuration)}
            </span>
            <span className="text-gray-500">·</span>
            <span>{getMapName(match.info.mapId)}</span>
            <span className="text-gray-500">·</span>
            <span>{getQueueName(match.info.queueId)}</span>
          </div>

          {/* Guide links */}
          <div className="flex flex-wrap gap-2">
            <a
              href={getMobafireSearchUrl(player.championName)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600/80 hover:bg-orange-500/80 text-white text-sm font-semibold rounded-lg transition-colors"
              aria-label="Guías en Mobafire (abre en nueva pestaña)"
              onClick={(e) => e.stopPropagation()}
            >
              Guías en Mobafire
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href={getUGGChampionUrl(player.championName)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-500/80 text-white text-sm font-semibold rounded-lg transition-colors"
              aria-label="Build en u.gg (abre en nueva pestaña)"
              onClick={(e) => e.stopPropagation()}
            >
              Build en u.gg
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Build Recommendation */}
          <BuildRecommendationComponent
            recommendation={buildRec}
            analysis={enemyAnalysis}
            buildVerdict={buildVerdict}
            championName={player.championName}
          />

          {/* Briar Guide - only for Briar players */}
          {player.championName === "Briar" && (
            <BriarGuideSection
              enemies={match.info.participants.filter((p) => p.teamId !== player.teamId)}
            />
          )}

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
                      .map((p) => {
                        const isWorst = isPlayerTeam && worstAlly && p.puuid === worstAlly.player.puuid;
                        return (
                          <div key={p.puuid}>
                            <div
                              className={`flex items-center gap-2 p-2 rounded text-sm ${
                                p.puuid === puuid
                                  ? "bg-white/10"
                                  : isWorst
                                  ? "bg-red-900/30 border border-red-600/40"
                                  : ""
                              }`}
                            >
                              <ChampionIcon
                                championName={p.championName}
                                size={28}
                              />
                              <span className="text-xs text-gray-400 w-8 shrink-0 text-center" title={p.individualPosition}>
                                {getRoleLabel(p.individualPosition)}
                              </span>
                              <span className={`flex-1 truncate min-w-0 ${isWorst ? "text-red-300" : ""}`}>
                                {p.riotIdGameName || p.summonerName}
                                {isWorst && (
                                  <span className="text-red-400 text-xs ml-1 font-medium">
                                    ← peor rendimiento
                                  </span>
                                )}
                              </span>
                              <span className="text-gray-200 shrink-0 font-medium">
                                {p.kills}/{p.deaths}/{p.assists}
                              </span>
                              <span
                                className={`text-xs w-14 text-right shrink-0 ${
                                  p.totalDamageDealtToChampions === highestDmg
                                    ? "text-yellow-300 font-bold"
                                    : "text-gray-300"
                                }`}
                              >
                                {(
                                  p.totalDamageDealtToChampions / 1000
                                ).toFixed(1)}
                                k
                              </span>
                              <span className="text-yellow-400/70 text-xs w-10 text-right shrink-0 hidden sm:inline">
                                {(p.goldEarned / 1000).toFixed(1)}k
                              </span>
                              <span className="text-blue-400/70 text-xs w-8 text-right shrink-0 hidden sm:inline">
                                {p.visionScore}v
                              </span>
                            </div>
                            {isWorst && (
                              <div className="ml-10 mt-0.5 mb-1 px-2 py-1 bg-red-900/20 rounded text-xs text-red-300 border-l-2 border-red-500/50">
                                {worstAlly.reason}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </article>
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

function BriarGuideSection({ enemies }: { enemies: { championName: string }[] }) {
  const [showGuide, setShowGuide] = useState(false);
  const enemyNames = enemies.map((e) => e.championName);
  const recBuild = getBriarBuildForComp(enemyNames);
  const matchups = enemies
    .map((e) => ({ ...e, matchup: getBriarMatchup(e.championName) }))
    .filter((e) => e.matchup !== null);

  return (
    <div className="rounded-lg border border-purple-700/50 bg-purple-900/20 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-purple-300">
          Guía de Briar - Rank 1
        </h4>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs text-purple-400 hover:text-purple-300"
        >
          {showGuide ? "Ocultar" : "Ver guía completa"}
        </button>
      </div>

      {/* Recommended build for this comp */}
      <div className="mb-3">
        <p className="text-xs text-gray-300 mb-1">
          Build recomendada: <span className="text-purple-300 font-semibold">{recBuild.name}</span>
          <span className="text-gray-400 ml-1">({recBuild.tag})</span>
        </p>
        <div className="flex gap-1 flex-wrap">
          {recBuild.items.map((item) => (
            <img
              key={item.itemId}
              src={getItemIconUrl(item.itemId)}
              alt={item.name}
              width={28}
              height={28}
              className="rounded"
              title={item.name}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Runas: {recBuild.runes.keystone} ({recBuild.runes.primaryTree}) · {recBuild.summonerSpells}
        </p>
      </div>

      {/* Matchup tips for enemies in this game */}
      {matchups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-300 uppercase">Matchups en esta partida</p>
          {matchups.map((e) => (
            <div
              key={e.championName}
              className={`text-xs p-2 rounded border ${
                e.matchup!.threat === "extreme"
                  ? "bg-red-900/30 border-red-700/50 text-red-200"
                  : e.matchup!.threat === "major"
                  ? "bg-orange-900/30 border-orange-700/50 text-orange-200"
                  : "bg-green-900/30 border-green-700/50 text-green-200"
              }`}
            >
              <span className="font-semibold">{e.championName}</span>
              <span className="text-gray-400 ml-1">
                ({e.matchup!.threat === "extreme" ? "Amenaza extrema" : e.matchup!.threat === "major" ? "Amenaza mayor" : "Amenaza menor"})
              </span>
              <p className="mt-1 text-gray-300">{e.matchup!.tips}</p>
            </div>
          ))}
        </div>
      )}

      {/* Full guide expanded */}
      {showGuide && (
        <div className="mt-3 space-y-3 border-t border-purple-700/30 pt-3">
          <div>
            <p className="text-xs text-gray-300 uppercase mb-1">Tips generales</p>
            <ul className="text-xs text-gray-300 space-y-1">
              {BRIAR_TIPS.general.map((tip, i) => (
                <li key={i}>· {tip}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-gray-300 uppercase mb-1">Early Game</p>
            <ul className="text-xs text-gray-300 space-y-1">
              {BRIAR_TIPS.earlyGame.map((tip, i) => (
                <li key={i}>· {tip}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-gray-300 uppercase mb-1">Item Jungle</p>
            <p className="text-xs text-green-300">Gustwalker: {BRIAR_TIPS.jungleItem.gustwalker}</p>
            <p className="text-xs text-yellow-300 mt-1">Mosstomper: {BRIAR_TIPS.jungleItem.mosstomper}</p>
          </div>
        </div>
      )}
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

interface WorstTeammate {
  player: { puuid: string };
  reason: string;
  score: number;
}

function findWorstTeammate(
  allies: import("@/lib/types").MatchParticipant[],
  gameDuration: number
): WorstTeammate | null {
  if (allies.length === 0) return null;
  const minutes = gameDuration / 60;
  if (minutes < 5) return null;

  // Calculate team averages for relative comparison
  const teamKills = allies.reduce((s, p) => s + p.kills, 0) + allies.reduce((s, p) => s + p.assists, 0);

  const scored = allies.map((p) => {
    const kda = p.deaths === 0 ? (p.kills + p.assists) * 1.5 : (p.kills + p.assists) / p.deaths;
    const csMin = (p.totalMinionsKilled + p.neutralMinionsKilled) / minutes;
    const dmgMin = p.totalDamageDealtToChampions / minutes;
    const deathsMin = p.deaths / minutes;
    const visionMin = p.visionScore / minutes;
    const kp = teamKills > 0 ? ((p.kills + p.assists) / teamKills) * 100 : 0;
    const pos = p.individualPosition;

    // Role-specific scoring — each role judged by what matters for that role
    let score = 0;
    const reasons: string[] = [];

    if (pos === "UTILITY") {
      // SUPPORT: KDA, kill participation, vision, assists, survival
      score += Math.min(kda, 5) * 12;            // KDA: max 60
      score += Math.min(kp, 60) * 0.8;           // KP: max 48
      score += Math.min(visionMin, 2) * 20;      // Vision/min: max 40
      score += Math.min(p.assists, 15) * 2;       // Assists: max 30
      score -= deathsMin * 15;                    // Deaths penalty (lighter)

      if (kda < 1.5) reasons.push(`KDA bajo para support (${kda.toFixed(1)})`);
      if (kp < 25) reasons.push(`Participación en kills baja (${kp.toFixed(0)}%)`);
      if (visionMin < 0.5 && minutes > 15) reasons.push(`Visión baja para support (${p.visionScore} en ${Math.round(minutes)}min)`);
      if (deathsMin > 0.35) reasons.push(`Muere demasiado (${p.deaths} muertes)`);
      if (p.assists < 3 && minutes > 15) reasons.push(`Muy pocas asistencias (${p.assists})`);

    } else if (pos === "JUNGLE") {
      // JUNGLE: KDA, kill participation, objectives, damage, vision
      score += Math.min(kda, 5) * 12;            // KDA: max 60
      score += Math.min(kp, 60) * 0.7;           // KP: max 42
      score += Math.min(dmgMin / 100, 8) * 4;    // Damage/min: max 32
      score += Math.min(csMin, 7) * 5;            // CS: max 35 (lower expectation)
      score -= deathsMin * 18;

      if (kda < 1.0) reasons.push(`KDA muy bajo (${kda.toFixed(1)})`);
      if (kp < 20) reasons.push(`Participación en kills baja (${kp.toFixed(0)}%), no impactó lanes`);
      if (deathsMin > 0.4) reasons.push(`${p.deaths} muertes en ${Math.round(minutes)}min`);
      if (dmgMin < 250) reasons.push(`Daño bajo (${(p.totalDamageDealtToChampions / 1000).toFixed(1)}k total)`);

    } else if (pos === "BOTTOM") {
      // ADC: Damage, CS, KDA, survival (carry potential)
      score += Math.min(kda, 6) * 10;            // KDA: max 60
      score += Math.min(csMin, 10) * 6;           // CS: max 60 (highest expectation)
      score += Math.min(dmgMin / 100, 10) * 5;   // Damage/min: max 50
      score -= deathsMin * 20;                    // Deaths very costly for ADC

      if (kda < 1.0) reasons.push(`KDA muy bajo (${kda.toFixed(1)})`);
      if (csMin < 5) reasons.push(`CS/min bajo para ADC (${csMin.toFixed(1)})`);
      if (dmgMin < 350) reasons.push(`Daño insuficiente como carry (${(p.totalDamageDealtToChampions / 1000).toFixed(1)}k)`);
      if (deathsMin > 0.35) reasons.push(`Muere demasiado para ADC (${p.deaths} muertes)`);

    } else if (pos === "MIDDLE") {
      // MID: Damage, KDA, CS, roaming impact
      score += Math.min(kda, 6) * 12;            // KDA: max 72
      score += Math.min(csMin, 9) * 5;            // CS: max 45
      score += Math.min(dmgMin / 100, 10) * 5;   // Damage/min: max 50
      score -= deathsMin * 18;

      if (kda < 1.0) reasons.push(`KDA muy bajo (${kda.toFixed(1)})`);
      if (csMin < 4.5) reasons.push(`CS/min bajo para mid (${csMin.toFixed(1)})`);
      if (dmgMin < 300) reasons.push(`Daño bajo para mid (${(p.totalDamageDealtToChampions / 1000).toFixed(1)}k)`);
      if (deathsMin > 0.4) reasons.push(`${p.deaths} muertes en ${Math.round(minutes)}min`);

    } else {
      // TOP: KDA, CS, damage, survival (frontline)
      score += Math.min(kda, 6) * 12;            // KDA: max 72
      score += Math.min(csMin, 9) * 5;            // CS: max 45
      score += Math.min(dmgMin / 100, 10) * 4;   // Damage/min: max 40
      score += Math.min(p.totalDamageTaken / 1000 / minutes, 2) * 10; // Tank contribution: max 20
      score -= deathsMin * 16;

      if (kda < 1.0) reasons.push(`KDA muy bajo (${kda.toFixed(1)})`);
      if (csMin < 4.5) reasons.push(`CS/min bajo para top (${csMin.toFixed(1)})`);
      if (dmgMin < 250) reasons.push(`Daño bajo (${(p.totalDamageDealtToChampions / 1000).toFixed(1)}k)`);
      if (deathsMin > 0.4) reasons.push(`${p.deaths} muertes en ${Math.round(minutes)}min`);
    }

    const reason = reasons.length > 0
      ? reasons.join(" · ")
      : `Rendimiento bajo para ${pos === "UTILITY" ? "SUP" : pos === "BOTTOM" ? "ADC" : pos || "su rol"}`;

    return { player: p, score, reason };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0];
}
