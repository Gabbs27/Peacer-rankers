// Champion-select pick recommendations from the player's OWN history. There is
// no meta data and no model here: every reason shown is a count from their
// games, so the advice stays honest about how much evidence backs it.

import type { MatchData, MatchParticipant } from "./types";
import { isRemake } from "./scoring";
import { analyzeChampionComp, analyzeEnemyTeam } from "./builds";
import { classifyComp, type CompKind } from "./comp-history";
import { getChampionDamageType, normalizeChampionName } from "./champion-data";

export type Role = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY";

export const ROLE_LABELS: Record<Role, string> = {
  TOP: "top",
  JUNGLE: "jungla",
  MIDDLE: "mid",
  BOTTOM: "ADC",
  UTILITY: "support",
};

const VS_KIND: Record<CompKind, string> = {
  ap: "con mayoría AP",
  ad: "con mayoría AD",
  mixed: "mixtos (AP + AD)",
  balanced: "equilibrados",
};

export interface DraftContext {
  /** Your assigned position, when the queue has one. */
  role: Role | null;
  /** Champions your teammates have picked (or are hovering). */
  allies: string[];
  /** Champions the enemy team has revealed. */
  enemies: string[];
  /** Banned or already taken. */
  unavailable: string[];
  /** Champions you can actually pick (owned / free rotation). Omit when unknown. */
  pickable?: string[];
}

export interface PickRecommendation {
  championName: string;
  /** Games behind the headline record (in your role when you have played it there). */
  games: number;
  wins: number;
  /** Ranking key, higher first. Not a probability. */
  score: number;
  reasons: string[];
  cautions: string[];
}

interface PastGame {
  me: MatchParticipant;
  enemies: string[];
  enemyKind: CompKind;
}

/** Comparable key for champion names coming from match data, Data Dragon or the client. */
export function championKey(name: string): string {
  return normalizeChampionName(name).toLowerCase();
}

function roleOf(p: MatchParticipant): string {
  return p.teamPosition || p.individualPosition || "";
}

function record(games: PastGame[]): { wins: number; losses: number } {
  const wins = games.filter((g) => g.me.win).length;
  return { wins, losses: games.length - wins };
}

/** Pulls a winrate towards 50% so a 1-0 record can't outrank a 15-10 one. */
function smoothed(wins: number, games: number, prior: number): number {
  return (wins + prior) / (games + 2 * prior);
}

export function recommendPicks(
  matches: MatchData[],
  puuid: string,
  ctx: DraftContext,
  limit: number = 5
): PickRecommendation[] {
  const byChampion = new Map<string, { name: string; games: PastGame[] }>();
  for (const match of matches) {
    if (isRemake(match.info)) continue;
    const me = match.info.participants.find((p) => p.puuid === puuid);
    if (!me) continue;
    const game: PastGame = {
      me,
      enemies: match.info.participants.filter((p) => p.teamId !== me.teamId).map((p) => p.championName),
      enemyKind: classifyComp(analyzeEnemyTeam(match.info, me.teamId)),
    };
    const key = championKey(me.championName);
    const entry = byChampion.get(key) ?? { name: me.championName, games: [] };
    entry.games.push(game);
    byChampion.set(key, entry);
  }

  const unavailable = new Set(ctx.unavailable.map(championKey));
  const pickable = ctx.pickable ? new Set(ctx.pickable.map(championKey)) : null;
  const enemyKind = ctx.enemies.length >= 3 ? classifyComp(analyzeChampionComp(ctx.enemies)) : null;
  const allyTypes = ctx.allies.map(getChampionDamageType);
  const alliesAp = allyTypes.filter((t) => t === "AP").length;
  const alliesPhysical = allyTypes.filter((t) => t === "AD" || t === "HYBRID").length;

  const out: PickRecommendation[] = [];

  for (const [key, { name, games: all }] of byChampion) {
    if (unavailable.has(key)) continue;
    if (pickable && !pickable.has(key)) continue;

    const inRole = ctx.role ? all.filter((g) => roleOf(g.me) === ctx.role) : all;
    const offRole = ctx.role !== null && inRole.length === 0;
    const sample = offRole ? all : inRole;
    const { wins, losses } = record(sample);
    const reasons: string[] = [];
    const cautions: string[] = [];

    // Base: smoothed winrate plus a comfort bonus for experience (+10 at 20 games).
    let score = smoothed(wins, sample.length, 2) * 100 + Math.min(sample.length, 20) / 2;
    reasons.push(
      `${wins}V-${losses}D con ${name}${ctx.role && !offRole ? ` de ${ROLE_LABELS[ctx.role]}` : ""}`
    );
    // Role matters more than a small sample: a 3-0 top pick must not outrank
    // the champion you actually play in your assigned position.
    if (offRole && ctx.role) {
      score -= 25;
      cautions.push(`No lo has jugado de ${ROLE_LABELS[ctx.role]}`);
    }

    // On this champion against this kind of enemy composition (±10).
    if (enemyKind) {
      const vs = all.filter((g) => g.enemyKind === enemyKind);
      if (vs.length >= 2) {
        const r = record(vs);
        score += (smoothed(r.wins, vs.length, 1) - 0.5) * 20;
        (r.wins >= r.losses ? reasons : cautions).push(
          `${r.wins}V-${r.losses}D contra equipos ${VS_KIND[enemyKind]}`
        );
      }
    }

    // On this champion against each revealed enemy champion (±5 each).
    for (const enemy of ctx.enemies) {
      const h2h = all.filter((g) => g.enemies.some((e) => championKey(e) === championKey(enemy)));
      if (h2h.length < 2) continue;
      const r = record(h2h);
      score += (smoothed(r.wins, h2h.length, 1) - 0.5) * 10;
      (r.wins >= r.losses ? reasons : cautions).push(`${r.wins}V-${r.losses}D contra ${enemy}`);
    }

    // Damage balance with what your team already has.
    if (ctx.allies.length >= 3) {
      const type = getChampionDamageType(name);
      if (alliesAp === 0 && type === "AP") {
        score += 6;
        reasons.push("Tu equipo no tiene daño mágico: lo aportas tú");
      } else if (alliesPhysical === 0 && (type === "AD" || type === "HYBRID")) {
        score += 6;
        reasons.push("Tu equipo no tiene daño físico: lo aportas tú");
      } else if (alliesAp >= 3 && type === "AP") {
        score -= 6;
        cautions.push("Tu equipo ya va cargado de daño mágico");
      } else if (alliesPhysical >= 3 && type === "AD") {
        score -= 6;
        cautions.push("Tu equipo ya va cargado de daño físico");
      }
    }

    if (sample.length < 3) cautions.push("Pocas partidas: tómalo como orientación");

    out.push({ championName: name, games: sample.length, wins, score, reasons, cautions });
  }

  return out.sort((a, b) => b.score - a.score || b.games - a.games).slice(0, limit);
}
