// Rule-based loss diagnosis from match-level data (no timeline fetches needed,
// so it can run over the whole loaded history for free). For each loss we pick
// the PRIMARY cause by priority, then aggregate the recurring pattern across
// losses — "name the habit that is costing you games".

import type { MatchInfo, MatchParticipant } from "./types";
import { isRemake } from "./scoring";

export type LossReasonKey =
  | "too_many_deaths"
  | "lost_lane"
  | "low_vision"
  | "low_damage"
  | "low_objectives"
  | "close_game";

export interface LossDiagnosis {
  key: LossReasonKey;
  label: string;
  detail: string;
}

export interface LossPattern {
  total: number; // losses diagnosed
  dominant: LossDiagnosis | null;
  dominantCount: number;
  counts: Partial<Record<LossReasonKey, number>>;
  advice: string | null;
}

const LANER_POSITIONS = new Set(["TOP", "MIDDLE", "BOTTOM"]);

const REASON_LABELS: Record<LossReasonKey, string> = {
  too_many_deaths: "Demasiadas muertes",
  lost_lane: "Línea perdida",
  low_vision: "Visión pobre",
  low_damage: "Poco impacto en daño",
  low_objectives: "Sin control de objetivos",
  close_game: "Partida pareja",
};

const REASON_ADVICE: Record<LossReasonKey, string> = {
  too_many_deaths:
    "Antes de cada pelea pregúntate: ¿puedo ganar esto? Morir menos vale más que matar más.",
  lost_lane:
    "Enfócate en la fase de líneas: control de oleadas, tradeos cortos y pedir ayuda del jungla cuando el rival empuja.",
  low_vision:
    "Compra wards de control y usa el trinket en cada vuelta a base — la visión previene las muertes que pierden partidas.",
  low_damage:
    "Busca participar en más peleas con tu equipo y revisa si tu build encaja contra la composición enemiga.",
  low_objectives:
    "Rota antes a dragones y heraldo: los objetivos ganan partidas que las kills no ganan.",
  close_game:
    "Tus derrotas son cerradas: pequeños detalles (un ward, una rotación) las convierten en victorias.",
};

function lanePositionOf(p: MatchParticipant): string {
  return p.teamPosition || p.individualPosition;
}

/**
 * Diagnose the primary cause of ONE lost game from end-of-match data.
 * Returns null for remakes and for games where the player won.
 */
export function diagnoseLoss(
  player: MatchParticipant,
  matchInfo: MatchInfo
): LossDiagnosis | null {
  if (player.win || isRemake(matchInfo)) return null;

  const minutes = Math.max(matchInfo.gameDuration / 60, 1);
  const allies = matchInfo.participants.filter((p) => p.teamId === player.teamId);
  const enemies = matchInfo.participants.filter((p) => p.teamId !== player.teamId);

  const deathsPerMin = player.deaths / minutes;
  const allyDeathsAvg =
    allies.reduce((s, p) => s + p.deaths, 0) / Math.max(allies.length, 1) / minutes;

  // 1) Feeding: clearly dying more than the game's pace justifies.
  if (player.deaths >= 7 && deathsPerMin > 0.28 && deathsPerMin > allyDeathsAvg * 1.25) {
    return {
      key: "too_many_deaths",
      label: REASON_LABELS.too_many_deaths,
      detail: `${player.deaths} muertes en ${Math.round(minutes)} min (más que el resto de tu equipo)`,
    };
  }

  // 2) Lost lane: clearly out-farmed/out-golded by the direct opponent.
  const pos = lanePositionOf(player);
  if (pos && pos !== "Invalid" && LANER_POSITIONS.has(pos)) {
    const rivals = enemies.filter((p) => lanePositionOf(p) === pos);
    const rival = rivals.length === 1 ? rivals[0] : null;
    if (rival) {
      const goldDelta = player.goldEarned - rival.goldEarned;
      const csPlayer = player.totalMinionsKilled + player.neutralMinionsKilled;
      const csRival = rival.totalMinionsKilled + rival.neutralMinionsKilled;
      if (goldDelta < -1500 && csPlayer < csRival * 0.85) {
        return {
          key: "lost_lane",
          label: REASON_LABELS.lost_lane,
          detail: `${Math.abs(goldDelta)} de oro y ${csRival - csPlayer} CS por detrás de ${rival.championName}`,
        };
      }
    }
  }

  // 3) Vision: low for the role (supports are held to a higher bar).
  const visionPerMin = player.visionScore / minutes;
  const isSupport = pos === "UTILITY";
  const visionFloor = isSupport ? 1.2 : 0.55;
  if (matchInfo.mapId === 11 && minutes >= 18 && visionPerMin < visionFloor) {
    return {
      key: "low_vision",
      label: REASON_LABELS.low_vision,
      detail: `${visionPerMin.toFixed(1)} de visión/min (esperado ≥ ${visionFloor})`,
    };
  }

  // 4) Damage share: a carry role contributing too little.
  const teamDamage = allies.reduce((s, p) => s + p.totalDamageDealtToChampions, 0);
  const damageShare = teamDamage > 0 ? player.totalDamageDealtToChampions / teamDamage : 0;
  const isCarryRole = pos === "MIDDLE" || pos === "BOTTOM";
  if (isCarryRole && damageShare < 0.15) {
    return {
      key: "low_damage",
      label: REASON_LABELS.low_damage,
      detail: `Solo ${(damageShare * 100).toFixed(0)}% del daño del equipo desde un rol de carry`,
    };
  }

  // 5) Objectives: the team got out-rotated on the map.
  const myTeam = matchInfo.teams.find((t) => t.teamId === player.teamId);
  const enemyTeam = matchInfo.teams.find((t) => t.teamId !== player.teamId);
  if (myTeam && enemyTeam) {
    const mine = myTeam.objectives.dragon.kills + myTeam.objectives.baron.kills;
    const theirs = enemyTeam.objectives.dragon.kills + enemyTeam.objectives.baron.kills;
    if (theirs >= mine + 3) {
      return {
        key: "low_objectives",
        label: REASON_LABELS.low_objectives,
        detail: `Objetivos ${mine} vs ${theirs}: el mapa decidió la partida`,
      };
    }
  }

  return {
    key: "close_game",
    label: REASON_LABELS.close_game,
    detail: "Sin una causa dominante: derrota por detalles",
  };
}

/** Aggregate the recurring loss pattern across a set of matches. */
export function aggregateLossPattern(
  matches: { player: MatchParticipant; info: MatchInfo }[]
): LossPattern {
  const counts: Partial<Record<LossReasonKey, number>> = {};
  let total = 0;
  const lastByKey: Partial<Record<LossReasonKey, LossDiagnosis>> = {};

  for (const { player, info } of matches) {
    const diagnosis = diagnoseLoss(player, info);
    if (!diagnosis) continue;
    total++;
    counts[diagnosis.key] = (counts[diagnosis.key] ?? 0) + 1;
    lastByKey[diagnosis.key] = diagnosis;
  }

  let dominantKey: LossReasonKey | null = null;
  let dominantCount = 0;
  for (const [key, count] of Object.entries(counts) as [LossReasonKey, number][]) {
    // close_game only dominates if nothing actionable does
    if (count > dominantCount || (count === dominantCount && dominantKey === "close_game")) {
      dominantKey = key;
      dominantCount = count;
    }
  }

  return {
    total,
    dominant: dominantKey ? lastByKey[dominantKey] ?? null : null,
    dominantCount,
    counts,
    advice: dominantKey ? REASON_ADVICE[dominantKey] : null,
  };
}
