// Catalogue of coaching metrics derived from Riot's own per-game computations
// (`participant.challenges`) plus end-of-game fields. Each metric knows how to
// extract itself, how to format it, whether higher is better, and what counts
// as good/bad for the player's role — so both the per-match card and the
// win-formula comparison can share one definition.

import type { MatchInfo, MatchParticipant } from "./types";

export type MetricGroup = "laning" | "impact" | "mechanics" | "risk" | "vision" | "objectives";

export type Verdict = "good" | "ok" | "bad";

export interface MetricDef {
  key: string;
  label: string;
  group: MetricGroup;
  higherIsBetter: boolean;
  /** Value for this participant, or null when the game/role doesn't provide it. */
  extract: (p: MatchParticipant, info: MatchInfo) => number | null;
  format: (v: number) => string;
  /** [badBelow, goodAbove] thresholds when higherIsBetter, inverted otherwise. */
  thresholds?: (role: string) => [number, number] | null;
  /** Restrict the metric to certain roles (undefined = all). */
  roles?: string[];
  hint?: string;
}

const LANERS = ["TOP", "MIDDLE", "BOTTOM"];

function roleOf(p: MatchParticipant): string {
  return p.teamPosition || p.individualPosition || "";
}

function minutesOf(info: MatchInfo): number {
  return Math.max(info.gameDuration / 60, 1);
}

export const METRICS: MetricDef[] = [
  // ---------- Laning ----------
  {
    key: "csAt10",
    label: "CS al minuto 10",
    group: "laning",
    higherIsBetter: true,
    roles: LANERS,
    extract: (p) => p.challenges?.laneMinionsFirst10Minutes ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [50, 75],
    hint: "8 CS/min es el objetivo en fase de líneas.",
  },
  {
    key: "jungleCsAt10",
    label: "Campamentos al min 10",
    group: "laning",
    higherIsBetter: true,
    roles: ["JUNGLE"],
    extract: (p) => p.challenges?.jungleCsBefore10Minutes ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [50, 70],
    hint: "Farmear la jungla entre ganks acelera tus objetivos.",
  },
  {
    key: "laneAdvantage",
    label: "Ventaja de línea (oro/exp)",
    group: "laning",
    higherIsBetter: true,
    roles: LANERS,
    extract: (p) => p.challenges?.laningPhaseGoldExpAdvantage ?? null,
    format: (v) => (v >= 1 ? "Ganada" : "No"),
    thresholds: () => [1, 1],
    hint: "Riot marca 1 cuando dominaste tu línea en oro y experiencia.",
  },
  {
    key: "csAdvantage",
    label: "Ventaja máx. de CS",
    group: "laning",
    higherIsBetter: true,
    roles: LANERS,
    extract: (p) => p.challenges?.maxCsAdvantageOnLaneOpponent ?? null,
    format: (v) => `${v >= 0 ? "+" : ""}${Math.round(v)}`,
    thresholds: () => [0, 20],
  },
  {
    key: "plates",
    label: "Placas de torre",
    group: "laning",
    higherIsBetter: true,
    extract: (p) => p.challenges?.turretPlatesTaken ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [1, 3],
    hint: "Las placas valen 160 de oro y caen al minuto 14.",
  },

  // ---------- Impact ----------
  {
    key: "killParticipation",
    label: "Participación en kills",
    group: "impact",
    higherIsBetter: true,
    extract: (p) => (p.challenges?.killParticipation ?? null) as number | null,
    format: (v) => `${Math.round(v * 100)}%`,
    thresholds: (role) => (role === "JUNGLE" || role === "UTILITY" ? [0.5, 0.65] : [0.4, 0.55]),
    hint: "Estar presente en las peleas que definen la partida.",
  },
  {
    key: "damageShare",
    label: "Cuota de daño del equipo",
    group: "impact",
    higherIsBetter: true,
    roles: ["TOP", "MIDDLE", "BOTTOM", "JUNGLE"],
    extract: (p) => (p.challenges?.teamDamagePercentage ?? null) as number | null,
    format: (v) => `${Math.round(v * 100)}%`,
    thresholds: (role) => (role === "MIDDLE" || role === "BOTTOM" ? [0.2, 0.28] : [0.15, 0.22]),
  },
  {
    key: "damagePerMinute",
    label: "Daño por minuto",
    group: "impact",
    higherIsBetter: true,
    extract: (p) => p.challenges?.damagePerMinute ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [400, 800],
  },
  {
    key: "goldPerMinute",
    label: "Oro por minuto",
    group: "impact",
    higherIsBetter: true,
    extract: (p) => p.challenges?.goldPerMinute ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [330, 430],
  },
  {
    key: "soloKills",
    label: "Solo kills",
    group: "impact",
    higherIsBetter: true,
    extract: (p) => p.challenges?.soloKills ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [0, 2],
  },

  // ---------- Mechanics ----------
  {
    key: "skillshotAccuracy",
    label: "Skillshots acertados",
    group: "mechanics",
    higherIsBetter: true,
    extract: (p) => p.challenges?.skillshotsHit ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [10, 25],
    hint: "Habilidades de puntería que conectaste.",
  },
  {
    key: "skillshotsDodged",
    label: "Skillshots esquivados",
    group: "mechanics",
    higherIsBetter: true,
    extract: (p) => p.challenges?.skillshotsDodged ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [10, 25],
  },
  {
    key: "immobilizations",
    label: "Enemigos inmovilizados",
    group: "mechanics",
    higherIsBetter: true,
    extract: (p) => p.challenges?.enemyChampionImmobilizations ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: (role) => (role === "UTILITY" ? [10, 25] : [5, 15]),
  },

  // ---------- Risk ----------
  {
    key: "timeDead",
    label: "Tiempo muerto",
    group: "risk",
    higherIsBetter: false,
    extract: (p) => p.totalTimeSpentDead ?? null,
    format: (v) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}`,
    thresholds: () => [420, 180], // bad above 7:00, good below 3:00
    hint: "Cada muerte es oro y presión de mapa regalados.",
  },
  {
    key: "deathShare",
    label: "Muertes",
    group: "risk",
    higherIsBetter: false,
    extract: (p) => p.deaths,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [8, 4],
  },
  {
    key: "bountyGiven",
    label: "Oro de recompensa regalado",
    group: "risk",
    higherIsBetter: false,
    extract: (p) => p.challenges?.bountyGold ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [600, 150],
    hint: "Oro extra que el enemigo cobró por matarte estando en racha.",
  },

  // ---------- Vision ----------
  {
    key: "visionPerMinute",
    label: "Visión por minuto",
    group: "vision",
    higherIsBetter: true,
    extract: (p) => p.challenges?.visionScorePerMinute ?? null,
    format: (v) => v.toFixed(2),
    thresholds: (role) => (role === "UTILITY" ? [1.0, 1.6] : [0.5, 0.9]),
  },
  {
    key: "controlWards",
    label: "Wards de control",
    group: "vision",
    higherIsBetter: true,
    extract: (p) => p.challenges?.controlWardsPlaced ?? p.detectorWardsPlaced ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: (role) => (role === "UTILITY" ? [2, 5] : [1, 3]),
    hint: "75 de oro que previenen muertes por emboscada.",
  },
  {
    key: "wardTakedowns",
    label: "Wards destruidos",
    group: "vision",
    higherIsBetter: true,
    extract: (p) => p.challenges?.wardTakedowns ?? p.wardsKilled ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [2, 6],
  },

  // ---------- Objectives ----------
  {
    key: "objectiveDamage",
    label: "Daño a objetivos",
    group: "objectives",
    higherIsBetter: true,
    extract: (p) => p.damageDealtToObjectives ?? null,
    format: (v) => `${(v / 1000).toFixed(1)}k`,
    thresholds: () => [5000, 15000],
  },
  {
    key: "dragonTakedowns",
    label: "Dragones",
    group: "objectives",
    higherIsBetter: true,
    extract: (p) => p.challenges?.dragonTakedowns ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [1, 3],
  },
  {
    key: "turretTakedowns",
    label: "Torres derribadas",
    group: "objectives",
    higherIsBetter: true,
    extract: (p) => p.challenges?.turretTakedowns ?? p.turretKills ?? null,
    format: (v) => `${Math.round(v)}`,
    thresholds: () => [1, 4],
  },
];

/** Metrics applicable to the player's role in this match, with values present. */
export function metricsFor(
  player: MatchParticipant,
  info: MatchInfo
): { def: MetricDef; value: number; verdict: Verdict }[] {
  const role = roleOf(player);
  const out: { def: MetricDef; value: number; verdict: Verdict }[] = [];

  for (const def of METRICS) {
    if (def.roles && !def.roles.includes(role)) continue;
    const value = def.extract(player, info);
    if (value === null || value === undefined || !Number.isFinite(value)) continue;
    out.push({ def, value, verdict: verdictFor(def, value, role) });
  }
  return out;
}

export function verdictFor(def: MetricDef, value: number, role: string): Verdict {
  const range = def.thresholds?.(role);
  if (!range) return "ok";
  const [bad, good] = range;
  if (def.higherIsBetter) {
    if (value >= good) return "good";
    if (value <= bad) return "bad";
    return "ok";
  }
  // lower is better: `bad` is the high bound, `good` the low bound
  if (value <= good) return "good";
  if (value >= bad) return "bad";
  return "ok";
}

export { roleOf, minutesOf };
