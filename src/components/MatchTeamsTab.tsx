"use client";

import Link from "next/link";
import type { MatchData, MatchParticipant } from "@/lib/types";
import { isRemake } from "@/lib/scoring";
import ChampionIcon from "./ChampionIcon";
import ItemIcon from "./ItemIcon";
import RuneKeystone from "./RuneKeystone";
import BansRow from "./BansRow";
import TeamTotals from "./TeamTotals";

interface Props {
  match: MatchData;
  player: MatchParticipant;
  puuid: string;
  region: string;
}

const ROLE_LABELS: Record<string, string> = {
  TOP: "TOP",
  JUNGLE: "JG",
  MIDDLE: "MID",
  BOTTOM: "ADC",
  UTILITY: "SUP",
};

export default function MatchTeamsTab({ match, player, puuid, region }: Props) {
  const { info } = match;
  const highestDmg = Math.max(...info.participants.map((p) => p.totalDamageDealtToChampions));
  const allies = info.participants.filter((p) => p.teamId === player.teamId && p.puuid !== puuid);
  const worstAlly = !isRemake(info) && allies.length > 0 ? findWorstTeammate(allies, info.gameDuration) : null;
  // Your team first, whichever side it played on.
  const teamIds = [player.teamId, ...new Set(info.participants.map((p) => p.teamId))].filter(
    (id, i, all) => all.indexOf(id) === i
  );

  return (
    <div className="space-y-4">
      <TeamTotals matchInfo={info} allyTeamId={player.teamId} />

      <div className="@container">
        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-4">
        {teamIds.map((teamId) => {
          const team = info.teams.find((t) => t.teamId === teamId);
          const mine = teamId === player.teamId;
          return (
            <div key={teamId} className="@container">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5">
                <h4 className={`text-sm font-semibold ${mine ? "text-blue-300" : "text-red-300"}`}>
                  {mine ? "Tu equipo" : "Rival"}
                  <span className="text-gray-500 font-normal text-xs">
                    {" "}
                    · lado {teamId === 100 ? "azul" : "rojo"}
                    {team && ` · ${team.win ? "Victoria" : "Derrota"}`}
                  </span>
                </h4>
                {team && <BansRow bans={team.bans} />}
              </div>
              <ul className="space-y-0.5">
                {info.participants
                  .filter((p) => p.teamId === teamId)
                  .map((p) => {
                    const isMe = p.puuid === puuid;
                    const isWorst = mine && worstAlly?.player.puuid === p.puuid;
                    // Only newer matches expose the Riot ID needed to build a profile link.
                    const href =
                      p.riotIdGameName && p.riotIdTagline
                        ? `/summoner/${region}/${encodeURIComponent(p.riotIdGameName)}-${encodeURIComponent(p.riotIdTagline)}`
                        : null;
                    const displayName = p.riotIdGameName || p.summonerName || "Desconocido";
                    const role = p.teamPosition || p.individualPosition;

                    const identity = (
                      <>
                        <ChampionIcon championName={p.championName} size={28} />
                        <RuneKeystone perks={p.perks} size={16} />
                        <span className="min-w-0">
                          <span
                            className={`block truncate text-sm group-hover:text-[#e3c98a] group-hover:underline ${
                              isWorst ? "text-red-300" : isMe ? "text-[#f0e6d2] font-semibold" : "text-gray-200"
                            }`}
                          >
                            {displayName}
                          </span>
                          <span className="block text-[10px] text-gray-500">{ROLE_LABELS[role] ?? "—"}</span>
                        </span>
                      </>
                    );

                    return (
                      <li
                        key={p.puuid}
                        className={`rounded-md px-2 py-1.5 ${
                          isMe ? "bg-white/[0.07]" : isWorst ? "bg-red-950/30 ring-1 ring-red-600/30" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {href ? (
                            <Link
                              href={href}
                              className="group flex items-center gap-2 flex-1 min-w-0 rounded focus-ring"
                              title={`Ver perfil de ${displayName}`}
                            >
                              {identity}
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2 flex-1 min-w-0">{identity}</div>
                          )}
                          <span className="text-sm text-gray-100 font-medium shrink-0 w-16 text-right">
                            {p.kills}/{p.deaths}/{p.assists}
                          </span>
                          <span className="w-12 shrink-0 text-right" title="Daño a campeones">
                            <span
                              className={`text-xs ${
                                p.totalDamageDealtToChampions === highestDmg ? "text-yellow-300 font-bold" : "text-gray-300"
                              }`}
                            >
                              {(p.totalDamageDealtToChampions / 1000).toFixed(1)}k
                            </span>
                            <span className="block h-[3px] mt-0.5 rounded bg-gray-800 overflow-hidden" aria-hidden>
                              <span
                                className={`block h-full rounded ${
                                  p.totalDamageDealtToChampions === highestDmg ? "bg-yellow-400" : "bg-orange-400/70"
                                }`}
                                style={{
                                  width: `${highestDmg > 0 ? Math.round((p.totalDamageDealtToChampions / highestDmg) * 100) : 0}%`,
                                }}
                              />
                            </span>
                          </span>
                          <span className="text-[11px] text-gray-400 w-10 text-right shrink-0 hidden @sm:inline" title="Oro">
                            {(p.goldEarned / 1000).toFixed(1)}k
                          </span>
                          <span className="text-[11px] text-gray-400 w-7 text-right shrink-0 hidden @sm:inline" title="Visión">
                            {p.visionScore}v
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 ml-9 mt-1">
                          {[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].map((it, i) => (
                            <ItemIcon key={i} itemId={it} size={20} />
                          ))}
                          <span className="w-1 shrink-0" />
                          <ItemIcon itemId={p.item6} size={20} />
                        </div>
                        {isWorst && worstAlly && (
                          <p className="ml-9 mt-1 text-[11px] text-red-300">Peor rendimiento del equipo: {worstAlly.reason}</p>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

interface WorstTeammate {
  player: { puuid: string };
  reason: string;
  score: number;
}

function findWorstTeammate(
  allies: MatchParticipant[],
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
