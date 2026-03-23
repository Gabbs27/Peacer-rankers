import {
  MatchParticipant,
  MatchInfo,
  PerformanceScore,
  ScoreBreakdown,
} from "./types";

// Clamp a value between 0 and max
function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

// Linear interpolation: maps a value from [min, max] range to [0, targetMax] score
function lerp(value: number, min: number, max: number, targetMax: number): number {
  if (value <= min) return 0;
  if (value >= max) return targetMax;
  return ((value - min) / (max - min)) * targetMax;
}

export function calculatePerformanceScore(
  player: MatchParticipant,
  matchInfo: MatchInfo
): PerformanceScore {
  const gameDurationMinutes = matchInfo.gameDuration / 60;
  const position = player.individualPosition;
  const isSupport = position === "UTILITY";
  const isJungle = position === "JUNGLE";

  const allies = matchInfo.participants.filter((p) => p.teamId === player.teamId);
  const playerTeam = matchInfo.teams.find((t) => t.teamId === player.teamId);

  // ===== MICRO SCORE =====
  const microBreakdown: ScoreBreakdown[] = [];

  // KDA (weight: 25)
  const kda =
    player.deaths === 0
      ? player.kills + player.assists
      : (player.kills + player.assists) / player.deaths;
  const kdaScore = clamp(lerp(kda, 0, 6, 25), 25);
  microBreakdown.push({
    label: "KDA",
    score: Math.round(kdaScore),
    maxScore: 25,
    detail: `${kda.toFixed(2)} KDA`,
  });

  // CS/min (weight: 25, skip support)
  if (!isSupport) {
    const totalCS = isJungle
      ? player.neutralMinionsKilled + player.totalMinionsKilled
      : player.totalMinionsKilled + player.neutralMinionsKilled;
    const csPerMin = totalCS / gameDurationMinutes;
    const csScore = clamp(lerp(csPerMin, 2, 10, 25), 25);
    microBreakdown.push({
      label: "CS/min",
      score: Math.round(csScore),
      maxScore: 25,
      detail: `${csPerMin.toFixed(1)} CS/min`,
    });
  } else {
    // Support: assist ratio instead
    const teamKills = allies.reduce((sum, p) => sum + p.kills, 0);
    const assistRatio = teamKills > 0 ? player.assists / teamKills : 0;
    const assistScore = clamp(lerp(assistRatio, 0.2, 0.9, 25), 25);
    microBreakdown.push({
      label: "Asistencias",
      score: Math.round(assistScore),
      maxScore: 25,
      detail: `${(assistRatio * 100).toFixed(0)}% de kills asistidas`,
    });
  }

  // Damage share (weight: 20, skip support)
  if (!isSupport) {
    const teamDamage = allies.reduce(
      (sum, p) => sum + p.totalDamageDealtToChampions,
      0
    );
    const dmgShare = teamDamage > 0
      ? (player.totalDamageDealtToChampions / teamDamage) * 100
      : 0;
    const dmgScore = clamp(lerp(dmgShare, 5, 35, 20), 20);
    microBreakdown.push({
      label: "Daño",
      score: Math.round(dmgScore),
      maxScore: 20,
      detail: `${dmgShare.toFixed(0)}% del daño del equipo`,
    });
  } else {
    // Support: CC/utility contribution via damage taken ratio (tanking for team)
    const teamDmgTaken = allies.reduce((sum, p) => sum + p.totalDamageTaken, 0);
    const tankShare = teamDmgTaken > 0
      ? (player.totalDamageTaken / teamDmgTaken) * 100
      : 0;
    const tankScore = clamp(lerp(tankShare, 5, 30, 20), 20);
    microBreakdown.push({
      label: "Presencia",
      score: Math.round(tankScore),
      maxScore: 20,
      detail: `${tankShare.toFixed(0)}% del daño absorbido`,
    });
  }

  // Kill participation (weight: 15)
  const teamKills = allies.reduce((sum, p) => sum + p.kills, 0);
  const kp = teamKills > 0 ? ((player.kills + player.assists) / teamKills) * 100 : 0;
  const kpScore = clamp(lerp(kp, 20, 80, 15), 15);
  microBreakdown.push({
    label: "Particip. Kills",
    score: Math.round(kpScore),
    maxScore: 15,
    detail: `${kp.toFixed(0)}% participación`,
  });

  // Multi-kills bonus (weight: 15)
  const multiKillPoints =
    player.doubleKills * 2 +
    player.tripleKills * 5 +
    player.quadraKills * 10 +
    player.pentaKills * 15 +
    (player.firstBloodKill ? 3 : 0) +
    Math.min(player.largestKillingSpree, 8);
  const multiScore = clamp(lerp(multiKillPoints, 0, 20, 15), 15);
  microBreakdown.push({
    label: "Jugadas",
    score: Math.round(multiScore),
    maxScore: 15,
    detail: multiKillPoints > 0
      ? `${player.doubleKills}x2, ${player.tripleKills}x3, ${player.quadraKills}x4, ${player.pentaKills}x5`
      : "Sin multi-kills",
  });

  const microTotal = microBreakdown.reduce((sum, b) => sum + b.score, 0);

  // ===== MACRO SCORE =====
  const macroBreakdown: ScoreBreakdown[] = [];

  // Vision score/min (weight: 30 for support, 25 for others)
  const visionWeight = isSupport ? 40 : 25;
  const visionPerMin = player.visionScore / gameDurationMinutes;
  const visionTarget = isSupport ? 2.0 : 1.0;
  const visionScore = clamp(lerp(visionPerMin, 0, visionTarget, visionWeight), visionWeight);
  macroBreakdown.push({
    label: "Visión",
    score: Math.round(visionScore),
    maxScore: visionWeight,
    detail: `${visionPerMin.toFixed(1)} vision/min`,
  });

  // Objective participation (weight: 25 for jungle, 20 for others)
  const objWeight = isJungle ? 35 : isSupport ? 20 : 25;
  const objectivePoints =
    player.dragonKills * 3 +
    player.baronKills * 5 +
    player.turretKills * 2;
  // Also factor in team objectives
  const teamObjPoints = playerTeam
    ? playerTeam.objectives.dragon.kills * 2 +
      playerTeam.objectives.baron.kills * 4 +
      playerTeam.objectives.tower.kills +
      playerTeam.objectives.riftHerald.kills * 2
    : 0;
  const objTotal = objectivePoints + teamObjPoints * 0.3;
  const objScore = clamp(lerp(objTotal, 0, 20, objWeight), objWeight);
  macroBreakdown.push({
    label: "Objetivos",
    score: Math.round(objScore),
    maxScore: objWeight,
    detail: `${player.dragonKills}D ${player.baronKills}B ${player.turretKills}T`,
  });

  // Gold efficiency (weight: 20, skip for support)
  if (!isSupport) {
    const goldPerMin = player.goldEarned / gameDurationMinutes;
    const goldScore = clamp(lerp(goldPerMin, 200, 550, 20), 20);
    macroBreakdown.push({
      label: "Oro/min",
      score: Math.round(goldScore),
      maxScore: 20,
      detail: `${goldPerMin.toFixed(0)} oro/min`,
    });
  } else {
    // Support: wards placed
    const wardsScore = clamp(lerp(player.wardsPlaced, 0, 30, 20), 20);
    macroBreakdown.push({
      label: "Wards",
      score: Math.round(wardsScore),
      maxScore: 20,
      detail: `${player.wardsPlaced} wards colocados`,
    });
  }

  // Wards killed (weight: 10)
  const wardsKilledWeight = isSupport ? 15 : 10;
  const wardsKilledScore = clamp(
    lerp(player.wardsKilled, 0, isSupport ? 10 : 5, wardsKilledWeight),
    wardsKilledWeight
  );
  macroBreakdown.push({
    label: "Wards eliminados",
    score: Math.round(wardsKilledScore),
    maxScore: wardsKilledWeight,
    detail: `${player.wardsKilled} wards eliminados`,
  });

  // Death avoidance (weight: 15, less for support)
  const deathWeight = isSupport ? 5 : 15;
  const deathsPerMin = player.deaths / gameDurationMinutes;
  // Fewer deaths = higher score. 0 deaths/min = perfect, 0.5+/min = 0
  const deathScore = clamp(
    lerp(0.5 - deathsPerMin, 0, 0.5, deathWeight),
    deathWeight
  );
  macroBreakdown.push({
    label: "Supervivencia",
    score: Math.round(deathScore),
    maxScore: deathWeight,
    detail: `${player.deaths} muertes (${deathsPerMin.toFixed(2)}/min)`,
  });

  const macroMaxPossible = macroBreakdown.reduce((sum, b) => sum + b.maxScore, 0);
  const macroRaw = macroBreakdown.reduce((sum, b) => sum + b.score, 0);
  // Normalize macro to 0-100
  const macroTotal = macroMaxPossible > 0 ? Math.round((macroRaw / macroMaxPossible) * 100) : 0;

  // Normalize micro to 0-100 (max is always 100)
  const microNormalized = microTotal;

  // Overall = 50/50 average
  const overall = Math.round((microNormalized + macroTotal) / 2);

  const { tier, division } = scoreToRank(overall);

  return {
    micro: microNormalized,
    macro: macroTotal,
    overall,
    rankEquivalent: tier,
    rankDivision: division,
    microBreakdown,
    macroBreakdown,
  };
}

export function scoreToRank(score: number): { tier: string; division: string } {
  if (score >= 98) return { tier: "CHALLENGER", division: "" };
  if (score >= 93) return { tier: "GRANDMASTER", division: "" };
  if (score >= 86) return { tier: "MASTER", division: "" };
  if (score >= 76) return { tier: "DIAMOND", division: getDivision(score, 76, 85) };
  if (score >= 66) return { tier: "EMERALD", division: getDivision(score, 66, 75) };
  if (score >= 56) return { tier: "PLATINUM", division: getDivision(score, 56, 65) };
  if (score >= 46) return { tier: "GOLD", division: getDivision(score, 46, 55) };
  if (score >= 31) return { tier: "SILVER", division: getDivision(score, 31, 45) };
  if (score >= 16) return { tier: "BRONZE", division: getDivision(score, 16, 30) };
  return { tier: "IRON", division: getDivision(score, 0, 15) };
}

function getDivision(score: number, rangeMin: number, rangeMax: number): string {
  const range = rangeMax - rangeMin;
  const pos = score - rangeMin;
  const quarter = range / 4;
  if (pos >= quarter * 3) return "I";
  if (pos >= quarter * 2) return "II";
  if (pos >= quarter) return "III";
  return "IV";
}

const TIER_LABELS: Record<string, string> = {
  IRON: "Hierro",
  BRONZE: "Bronce",
  SILVER: "Plata",
  GOLD: "Oro",
  PLATINUM: "Platino",
  EMERALD: "Esmeralda",
  DIAMOND: "Diamante",
  MASTER: "Master",
  GRANDMASTER: "Grand Master",
  CHALLENGER: "Challenger",
};

export function getTierLabel(tier: string): string {
  return TIER_LABELS[tier] || tier;
}
