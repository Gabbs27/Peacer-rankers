import {
  MatchParticipant,
  MatchInfo,
  PerformanceScore,
  ScoreBreakdown,
} from "./types";

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

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
  const allies = matchInfo.participants.filter((p) => p.teamId === player.teamId);
  const playerTeam = matchInfo.teams.find((t) => t.teamId === player.teamId);
  const teamKills = allies.reduce((sum, p) => sum + p.kills, 0);

  let microBreakdown: ScoreBreakdown[];
  let macroBreakdown: ScoreBreakdown[];

  switch (position) {
    case "UTILITY":
      microBreakdown = scoreSupportMicro(player, allies, teamKills, gameDurationMinutes);
      macroBreakdown = scoreSupportMacro(player, allies, playerTeam, gameDurationMinutes);
      break;
    case "JUNGLE":
      microBreakdown = scoreJungleMicro(player, allies, teamKills, gameDurationMinutes);
      macroBreakdown = scoreJungleMacro(player, allies, playerTeam, gameDurationMinutes);
      break;
    default: // TOP, MIDDLE, BOTTOM (laners)
      microBreakdown = scoreLanerMicro(player, allies, teamKills, gameDurationMinutes);
      macroBreakdown = scoreLanerMacro(player, allies, playerTeam, gameDurationMinutes);
      break;
  }

  const microMax = microBreakdown.reduce((s, b) => s + b.maxScore, 0);
  const microRaw = microBreakdown.reduce((s, b) => s + b.score, 0);
  const micro = microMax > 0 ? Math.round((microRaw / microMax) * 100) : 0;

  const macroMax = macroBreakdown.reduce((s, b) => s + b.maxScore, 0);
  const macroRaw = macroBreakdown.reduce((s, b) => s + b.score, 0);
  const macro = macroMax > 0 ? Math.round((macroRaw / macroMax) * 100) : 0;

  const overall = Math.round((micro + macro) / 2);
  const { tier, division } = scoreToRank(overall);

  return {
    micro,
    macro,
    overall,
    rankEquivalent: tier,
    rankDivision: division,
    microBreakdown,
    macroBreakdown,
  };
}

// ========================
// LANER (TOP, MID, ADC)
// ========================
function scoreLanerMicro(
  p: MatchParticipant,
  allies: MatchParticipant[],
  teamKills: number,
  mins: number
): ScoreBreakdown[] {
  const breakdown: ScoreBreakdown[] = [];

  // KDA (30)
  const kda = p.deaths === 0 ? p.kills + p.assists : (p.kills + p.assists) / p.deaths;
  breakdown.push({
    label: "KDA",
    score: Math.round(clamp(lerp(kda, 0, 6, 30), 30)),
    maxScore: 30,
    detail: `${kda.toFixed(2)} KDA`,
  });

  // CS/min (30)
  const cs = (p.totalMinionsKilled + p.neutralMinionsKilled) / mins;
  breakdown.push({
    label: "CS/min",
    score: Math.round(clamp(lerp(cs, 3, 10, 30), 30)),
    maxScore: 30,
    detail: `${cs.toFixed(1)} CS/min`,
  });

  // Damage share (25)
  const teamDmg = allies.reduce((s, a) => s + a.totalDamageDealtToChampions, 0);
  const dmgPct = teamDmg > 0 ? (p.totalDamageDealtToChampions / teamDmg) * 100 : 0;
  breakdown.push({
    label: "Daño",
    score: Math.round(clamp(lerp(dmgPct, 8, 35, 25), 25)),
    maxScore: 25,
    detail: `${dmgPct.toFixed(0)}% del daño del equipo`,
  });

  // Multi-kills (15)
  const multi = p.doubleKills * 2 + p.tripleKills * 5 + p.quadraKills * 10 + p.pentaKills * 15 +
    (p.firstBloodKill ? 3 : 0) + Math.min(p.largestKillingSpree, 8);
  breakdown.push({
    label: "Jugadas",
    score: Math.round(clamp(lerp(multi, 0, 20, 15), 15)),
    maxScore: 15,
    detail: multi > 0
      ? `${p.doubleKills}x2, ${p.tripleKills}x3, ${p.quadraKills}x4, ${p.pentaKills}x5`
      : "Sin multi-kills",
  });

  return breakdown;
}

function scoreLanerMacro(
  p: MatchParticipant,
  allies: MatchParticipant[],
  team: ReturnType<typeof Array.prototype.find>,
  mins: number
): ScoreBreakdown[] {
  const breakdown: ScoreBreakdown[] = [];

  // Vision (25)
  const vis = p.visionScore / mins;
  breakdown.push({
    label: "Visión",
    score: Math.round(clamp(lerp(vis, 0, 1.0, 25), 25)),
    maxScore: 25,
    detail: `${vis.toFixed(1)} vision/min`,
  });

  // Gold/min (25)
  const gpm = p.goldEarned / mins;
  breakdown.push({
    label: "Oro/min",
    score: Math.round(clamp(lerp(gpm, 200, 550, 25), 25)),
    maxScore: 25,
    detail: `${gpm.toFixed(0)} oro/min`,
  });

  // Tower participation (25)
  const teamTowers = team?.objectives?.tower?.kills || 0;
  const towerScore = teamTowers > 0
    ? clamp(lerp(p.turretKills, 0, Math.max(teamTowers * 0.4, 3), 25), 25)
    : 12;
  breakdown.push({
    label: "Torres",
    score: Math.round(towerScore),
    maxScore: 25,
    detail: `${p.turretKills} torres destruidas`,
  });

  // Supervivencia (25)
  const dpm = p.deaths / mins;
  breakdown.push({
    label: "Supervivencia",
    score: Math.round(clamp(lerp(0.5 - dpm, 0, 0.5, 25), 25)),
    maxScore: 25,
    detail: `${p.deaths} muertes (${dpm.toFixed(2)}/min)`,
  });

  return breakdown;
}

// ========================
// JUNGLE
// ========================
function scoreJungleMicro(
  p: MatchParticipant,
  allies: MatchParticipant[],
  teamKills: number,
  mins: number
): ScoreBreakdown[] {
  const breakdown: ScoreBreakdown[] = [];

  // KDA (25)
  const kda = p.deaths === 0 ? p.kills + p.assists : (p.kills + p.assists) / p.deaths;
  breakdown.push({
    label: "KDA",
    score: Math.round(clamp(lerp(kda, 0, 6, 25), 25)),
    maxScore: 25,
    detail: `${kda.toFixed(2)} KDA`,
  });

  // CS/min - jungle camps matter more (20)
  const cs = (p.totalMinionsKilled + p.neutralMinionsKilled) / mins;
  breakdown.push({
    label: "Farmeo",
    score: Math.round(clamp(lerp(cs, 3, 8, 20), 20)),
    maxScore: 20,
    detail: `${cs.toFixed(1)} CS/min`,
  });

  // Kill participation - key for junglers (30)
  const kp = teamKills > 0 ? ((p.kills + p.assists) / teamKills) * 100 : 0;
  breakdown.push({
    label: "Particip. Kills",
    score: Math.round(clamp(lerp(kp, 20, 75, 30), 30)),
    maxScore: 30,
    detail: `${kp.toFixed(0)}% participación`,
  });

  // Damage (25)
  const teamDmg = allies.reduce((s, a) => s + a.totalDamageDealtToChampions, 0);
  const dmgPct = teamDmg > 0 ? (p.totalDamageDealtToChampions / teamDmg) * 100 : 0;
  breakdown.push({
    label: "Daño",
    score: Math.round(clamp(lerp(dmgPct, 5, 30, 25), 25)),
    maxScore: 25,
    detail: `${dmgPct.toFixed(0)}% del daño del equipo`,
  });

  return breakdown;
}

function scoreJungleMacro(
  p: MatchParticipant,
  allies: MatchParticipant[],
  team: ReturnType<typeof Array.prototype.find>,
  mins: number
): ScoreBreakdown[] {
  const breakdown: ScoreBreakdown[] = [];

  // Objetivos - most important for jungle (35)
  const dragons = team?.objectives?.dragon?.kills || 0;
  const barons = team?.objectives?.baron?.kills || 0;
  const heralds = team?.objectives?.riftHerald?.kills || 0;
  const objPoints = dragons * 3 + barons * 5 + heralds * 3 + p.turretKills * 2;
  breakdown.push({
    label: "Objetivos",
    score: Math.round(clamp(lerp(objPoints, 0, 25, 35), 35)),
    maxScore: 35,
    detail: `${dragons}D ${barons}B ${heralds}H ${p.turretKills}T`,
  });

  // Vision (25)
  const vis = p.visionScore / mins;
  breakdown.push({
    label: "Visión",
    score: Math.round(clamp(lerp(vis, 0, 1.0, 25), 25)),
    maxScore: 25,
    detail: `${vis.toFixed(1)} vision/min`,
  });

  // Wards eliminados (15)
  breakdown.push({
    label: "Control wards",
    score: Math.round(clamp(lerp(p.wardsKilled, 0, 8, 15), 15)),
    maxScore: 15,
    detail: `${p.wardsKilled} wards eliminados`,
  });

  // Supervivencia (25)
  const dpm = p.deaths / mins;
  breakdown.push({
    label: "Supervivencia",
    score: Math.round(clamp(lerp(0.5 - dpm, 0, 0.5, 25), 25)),
    maxScore: 25,
    detail: `${p.deaths} muertes (${dpm.toFixed(2)}/min)`,
  });

  return breakdown;
}

// ========================
// SUPPORT
// ========================
function scoreSupportMicro(
  p: MatchParticipant,
  allies: MatchParticipant[],
  teamKills: number,
  mins: number
): ScoreBreakdown[] {
  const breakdown: ScoreBreakdown[] = [];

  // KDA - deaths matter less, assists matter more (30)
  const kda = p.deaths === 0 ? p.assists : p.assists / p.deaths;
  breakdown.push({
    label: "Asist/Muerte",
    score: Math.round(clamp(lerp(kda, 0, 8, 30), 30)),
    maxScore: 30,
    detail: `${kda.toFixed(2)} asist por muerte`,
  });

  // Kill participation - key for supports (35)
  const kp = teamKills > 0 ? ((p.kills + p.assists) / teamKills) * 100 : 0;
  breakdown.push({
    label: "Particip. Kills",
    score: Math.round(clamp(lerp(kp, 25, 80, 35), 35)),
    maxScore: 35,
    detail: `${kp.toFixed(0)}% participación`,
  });

  // Assists total (35)
  const assistsPerMin = p.assists / mins;
  breakdown.push({
    label: "Asistencias",
    score: Math.round(clamp(lerp(assistsPerMin, 0, 0.6, 35), 35)),
    maxScore: 35,
    detail: `${p.assists} asistencias (${assistsPerMin.toFixed(1)}/min)`,
  });

  return breakdown;
}

function scoreSupportMacro(
  p: MatchParticipant,
  allies: MatchParticipant[],
  team: ReturnType<typeof Array.prototype.find>,
  mins: number
): ScoreBreakdown[] {
  const breakdown: ScoreBreakdown[] = [];

  // Vision score - most important for support (35)
  const vis = p.visionScore / mins;
  breakdown.push({
    label: "Visión",
    score: Math.round(clamp(lerp(vis, 0, 2.0, 35), 35)),
    maxScore: 35,
    detail: `${vis.toFixed(1)} vision/min`,
  });

  // Wards placed (25)
  const wardsPerMin = p.wardsPlaced / mins;
  breakdown.push({
    label: "Wards colocados",
    score: Math.round(clamp(lerp(wardsPerMin, 0, 1.2, 25), 25)),
    maxScore: 25,
    detail: `${p.wardsPlaced} wards (${wardsPerMin.toFixed(1)}/min)`,
  });

  // Wards killed (20)
  breakdown.push({
    label: "Wards eliminados",
    score: Math.round(clamp(lerp(p.wardsKilled, 0, 12, 20), 20)),
    maxScore: 20,
    detail: `${p.wardsKilled} wards eliminados`,
  });

  // Supervivencia (20)
  const dpm = p.deaths / mins;
  breakdown.push({
    label: "Supervivencia",
    score: Math.round(clamp(lerp(0.4 - dpm, 0, 0.4, 20), 20)),
    maxScore: 20,
    detail: `${p.deaths} muertes (${dpm.toFixed(2)}/min)`,
  });

  return breakdown;
}

// ========================
// RANK MAPPING
// ========================

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
