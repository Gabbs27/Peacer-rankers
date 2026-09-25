"use client";

import { useState } from "react";
import type { MatchInfo, MatchParticipant } from "@/lib/types";
import { getMobafireSearchUrl, getUGGChampionUrl } from "@/lib/data-dragon";
import { analyzeEnemyTeam, getDefensiveRecommendations, analyzeBuildEfficiency } from "@/lib/builds";
import { getBriarMatchup, getBriarBuildForComp, BRIAR_TIPS } from "@/lib/briar-guide";
import BuildRecommendation from "./BuildRecommendation";
import ItemIcon from "./ItemIcon";

interface Props {
  player: MatchParticipant;
  info: MatchInfo;
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-[#e3c98a] focus-ring rounded"
    >
      {children}
      <span aria-hidden>↗</span>
      <span className="sr-only">(abre en nueva pestaña)</span>
    </a>
  );
}

export default function MatchBuildTab({ player, info }: Props) {
  const enemyAnalysis = analyzeEnemyTeam(info, player.teamId);
  const recommendation = getDefensiveRecommendations(enemyAnalysis, player.individualPosition, player.championName);
  const verdict = analyzeBuildEfficiency(player, enemyAnalysis);

  return (
    <div className="space-y-4">
      <BuildRecommendation recommendation={recommendation} analysis={enemyAnalysis} buildVerdict={verdict} />

      {player.championName === "Briar" && (
        <BriarGuideSection enemies={info.participants.filter((p) => p.teamId !== player.teamId)} />
      )}

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        Guías de {player.championName}:
        <ExternalLink href={getUGGChampionUrl(player.championName)}>u.gg</ExternalLink>
        <ExternalLink href={getMobafireSearchUrl(player.championName)}>Mobafire</ExternalLink>
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
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          aria-expanded={showGuide}
          className="text-xs text-purple-400 hover:text-purple-300 focus-ring rounded"
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
            <span key={item.itemId} title={item.name}>
              <ItemIcon itemId={item.itemId} size={28} />
            </span>
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
