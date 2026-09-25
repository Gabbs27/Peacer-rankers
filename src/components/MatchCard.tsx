"use client";

import { useState } from "react";
import { MatchData, LeagueEntry } from "@/lib/types";
import { formatDuration, getKDA, getQueueName } from "@/lib/data-dragon";
import { isRemake } from "@/lib/scoring";
import ChampionIcon from "./ChampionIcon";
import ItemIcon from "./ItemIcon";
import SpellIcon from "./SpellIcon";
import MatchDetail from "./MatchDetail";

interface Props {
  match: MatchData;
  puuid: string;
  region: string;
  ranked?: LeagueEntry[];
}

function MultikillBadge({ penta, quadra, triple }: { penta: number; quadra: number; triple: number }) {
  if (penta > 0) {
    return (
      <span className="text-[10px] font-black uppercase tracking-wide bg-gradient-to-r from-[#e3c98a] to-[#c8aa6e] text-gray-950 rounded px-1.5 py-0.5">
        Penta
      </span>
    );
  }
  if (quadra > 0) {
    return (
      <span className="text-[10px] font-black uppercase tracking-wide bg-purple-500/80 text-white rounded px-1.5 py-0.5">
        Quadra
      </span>
    );
  }
  if (triple > 0) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-500/70 text-white rounded px-1.5 py-0.5">
        Triple
      </span>
    );
  }
  return null;
}

export default function MatchCard({ match, puuid, region, ranked }: Props) {
  const [expanded, setExpanded] = useState(false);
  const player = match.info.participants.find((p) => p.puuid === puuid);

  if (!player) return null;

  const remake = isRemake(match.info);
  const cs = player.totalMinionsKilled + player.neutralMinionsKilled;
  const csPerMin = cs / Math.max(match.info.gameDuration / 60, 1);
  const items = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5];
  const result = remake ? "Remake" : player.win ? "Victoria" : "Derrota";
  const accent = remake
    ? "bg-gray-900/40 border-white/10 border-l-gray-500"
    : player.win
      ? "bg-blue-950/35 border-blue-500/20 border-l-blue-400/90"
      : "bg-red-950/30 border-red-500/20 border-l-red-400/90";
  const resultColor = remake ? "text-gray-400" : player.win ? "text-blue-300" : "text-red-300";

  return (
    <article className={`rounded-xl overflow-hidden border border-l-4 backdrop-blur-[2px] ${accent}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${player.championName}, ${result}, ${player.kills}/${player.deaths}/${player.assists}. ${
          expanded ? "Ocultar" : "Ver"
        } detalles`}
        className="w-full flex items-center gap-3 sm:gap-4 p-3 text-left hover:bg-white/[0.04] transition-colors"
      >
        {/* Champion, level and spells */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <ChampionIcon championName={player.championName} size={44} />
            <span className="absolute -bottom-1 -right-1 bg-gray-950 border border-white/10 text-[10px] text-gray-300 rounded-full px-1 leading-4">
              {player.champLevel}
            </span>
          </div>
          <div className="hidden sm:flex flex-col gap-0.5">
            <SpellIcon spellId={player.summoner1Id} />
            <SpellIcon spellId={player.summoner2Id} />
          </div>
        </div>

        {/* KDA */}
        <div className="min-w-0 w-24 sm:w-28 shrink-0">
          <p className="font-bold text-sm sm:text-base text-gray-50 flex items-center gap-1.5">
            {player.kills}/{player.deaths}/{player.assists}
            <MultikillBadge penta={player.pentaKills} quadra={player.quadraKills} triple={player.tripleKills} />
          </p>
          <p className="text-xs text-gray-400">{getKDA(player.kills, player.deaths, player.assists)} KDA</p>
        </div>

        {/* Farm */}
        <div className="hidden sm:block w-16 shrink-0">
          <p className="text-sm text-gray-200">{cs} CS</p>
          <p className="text-xs text-gray-400">{csPerMin.toFixed(1)}/min</p>
        </div>

        {/* Items */}
        <div className="hidden md:flex items-center gap-0.5">
          {items.map((item, i) => (
            <ItemIcon key={i} itemId={item} size={26} />
          ))}
          <span className="w-1" />
          <ItemIcon itemId={player.item6} size={26} />
        </div>

        {/* Result and when */}
        <div className="ml-auto text-right shrink-0">
          <p className={`text-sm font-semibold ${resultColor}`}>{result}</p>
          <p className="text-xs text-gray-400 hidden sm:block">{getQueueName(match.info.queueId)}</p>
          <p className="text-xs text-gray-500">
            {formatDuration(match.info.gameDuration)} · {getTimeSince(match.info.gameCreation)}
          </p>
        </div>

        <span
          aria-hidden
          className={`shrink-0 text-gray-500 text-xs transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {expanded && <MatchDetail match={match} player={player} puuid={puuid} region={region} ranked={ranked} />}
    </article>
  );
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
