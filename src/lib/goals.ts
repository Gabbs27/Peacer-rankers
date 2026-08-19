// Personal goals the player sets for themselves, evaluated automatically against
// each new match. Pure evaluation + a localStorage-backed external store, so it
// works with no backend.

import type { MatchData, MatchInfo, MatchParticipant } from "./types";
import { isRemake } from "./scoring";

export interface GoalDef {
  id: string;
  label: string;
  hint: string;
  /** true = met, false = missed, null = not applicable to this game/role. */
  evaluate: (player: MatchParticipant, info: MatchInfo) => boolean | null;
}

const LANERS = new Set(["TOP", "MIDDLE", "BOTTOM"]);
const laneOf = (p: MatchParticipant) => p.teamPosition || p.individualPosition;
const minutesOf = (info: MatchInfo) => Math.max(info.gameDuration / 60, 1);

export const GOALS: GoalDef[] = [
  {
    id: "deaths_under_5",
    label: "Morir menos de 5 veces",
    hint: "Cada muerte es oro y presión de mapa para el rival.",
    evaluate: (p) => p.deaths < 5,
  },
  {
    id: "cs_7_per_min",
    label: "7 CS por minuto",
    hint: "El objetivo estándar en fase de líneas.",
    evaluate: (p, info) => {
      if (!LANERS.has(laneOf(p))) return null;
      return (p.totalMinionsKilled + p.neutralMinionsKilled) / minutesOf(info) >= 7;
    },
  },
  {
    id: "control_ward",
    label: "Comprar al menos 2 wards de control",
    hint: "75 de oro que previenen las muertes por emboscada.",
    evaluate: (p, info) => {
      if (info.mapId !== 11) return null;
      const wards = p.challenges?.controlWardsPlaced ?? p.detectorWardsPlaced;
      return wards === undefined ? null : wards >= 2;
    },
  },
  {
    id: "kill_participation_55",
    label: "55% de participación en kills",
    hint: "Estar en las peleas que deciden la partida.",
    evaluate: (p) => {
      const kp = p.challenges?.killParticipation;
      return kp === undefined ? null : kp >= 0.55;
    },
  },
  {
    id: "time_dead_under_3",
    label: "Menos de 3 minutos muerto",
    hint: "Tiempo muerto es tiempo en el que tu equipo juega 4v5.",
    evaluate: (p) => (p.totalTimeSpentDead === undefined ? null : p.totalTimeSpentDead < 180),
  },
  {
    id: "vision_per_min",
    label: "0.8 de visión por minuto",
    hint: "Visión constante, no solo al inicio.",
    evaluate: (p, info) => {
      if (info.mapId !== 11) return null;
      return p.visionScore / minutesOf(info) >= 0.8;
    },
  },
];

export interface GoalProgress {
  def: GoalDef;
  evaluated: number;
  met: number;
  rate: number; // 0-100
  /** Consecutive most-recent games meeting the goal. */
  streak: number;
  /** Newest-first outcomes, for the dot row. */
  recent: boolean[];
}

/** @param matches newest-first, as Riot returns them */
export function evaluateGoal(def: GoalDef, matches: MatchData[], puuid: string): GoalProgress {
  const outcomes: boolean[] = [];
  for (const m of matches) {
    if (isRemake(m.info)) continue;
    const player = m.info.participants.find((p) => p.puuid === puuid);
    if (!player) continue;
    const result = def.evaluate(player, m.info);
    if (result === null) continue;
    outcomes.push(result);
  }

  let streak = 0;
  for (const ok of outcomes) {
    if (!ok) break;
    streak++;
  }

  const met = outcomes.filter(Boolean).length;
  return {
    def,
    evaluated: outcomes.length,
    met,
    rate: outcomes.length > 0 ? Math.round((met / outcomes.length) * 100) : 0,
    streak,
    recent: outcomes.slice(0, 10),
  };
}

// --- localStorage-backed selection (same external-store pattern as favorites) ---

const KEY = "lol:goals";
const listeners = new Set<() => void>();
let snapshot: string[] = [];
let hydrated = false;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function subscribeGoals(listener: () => void): () => void {
  if (!hydrated) {
    snapshot = read();
    hydrated = true;
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSelectedGoals(): string[] {
  return snapshot;
}

export function getSelectedGoalsOnServer(): string[] {
  return [];
}

export function toggleGoal(id: string): void {
  const current = read();
  snapshot = current.includes(id) ? current.filter((g) => g !== id) : [...current, id];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // storage disabled — keep the in-memory value
  }
  listeners.forEach((l) => l());
}
