// "Your win formula": compares each coaching metric across the player's OWN
// wins vs losses. The metrics that separate them the most are, by definition,
// what winning looks like for this player — no external dataset needed.

import type { MatchData, MatchParticipant, MatchInfo } from "./types";
import { isRemake } from "./scoring";
import { METRICS, roleOf, type MetricDef } from "./coaching-metrics";

export interface FormulaRow {
  key: string;
  label: string;
  group: MetricDef["group"];
  winAvg: number;
  lossAvg: number;
  /** Positive = the metric is higher in wins (regardless of direction). */
  delta: number;
  /** |delta| normalised by the overall average — used to rank separation. */
  separation: number;
  higherIsBetter: boolean;
  format: (v: number) => string;
  /** True when the win-vs-loss gap points the same way as "better". */
  helps: boolean;
  hint?: string;
}

export interface WinFormula {
  wins: number;
  losses: number;
  rows: FormulaRow[];
  /** The biggest actionable gap — the single thing to fix. */
  topWeakness: FormulaRow | null;
  /** The biggest strength that shows up in wins. */
  topStrength: FormulaRow | null;
}

const MIN_GAMES_PER_SIDE = 2;

function avg(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function computeWinFormula(matches: MatchData[], puuid: string): WinFormula | null {
  const games: { player: MatchParticipant; info: MatchInfo }[] = [];
  for (const m of matches) {
    if (isRemake(m.info)) continue;
    const player = m.info.participants.find((p) => p.puuid === puuid);
    if (player) games.push({ player, info: m.info });
  }

  const wins = games.filter((g) => g.player.win);
  const losses = games.filter((g) => !g.player.win);
  if (wins.length < MIN_GAMES_PER_SIDE || losses.length < MIN_GAMES_PER_SIDE) return null;

  // Most-played role decides which role-specific metrics apply.
  const roleCounts = new Map<string, number>();
  for (const g of games) {
    const r = roleOf(g.player);
    if (r && r !== "Invalid") roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
  }
  const mainRole = [...roleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const rows: FormulaRow[] = [];

  for (const def of METRICS) {
    if (def.roles && !def.roles.includes(mainRole)) continue;

    const pick = (side: typeof games) =>
      side
        .map((g) => def.extract(g.player, g.info))
        .filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v));

    const winValues = pick(wins);
    const lossValues = pick(losses);
    if (winValues.length < MIN_GAMES_PER_SIDE || lossValues.length < MIN_GAMES_PER_SIDE) continue;

    const winAvg = avg(winValues);
    const lossAvg = avg(lossValues);
    const delta = winAvg - lossAvg;
    const scale = Math.abs(avg([winAvg, lossAvg]));
    const separation = scale > 0 ? Math.abs(delta) / scale : 0;
    // "helps" = in wins the metric moves in the direction that is actually good.
    const helps = def.higherIsBetter ? delta > 0 : delta < 0;

    rows.push({
      key: def.key,
      label: def.label,
      group: def.group,
      winAvg,
      lossAvg,
      delta,
      separation,
      higherIsBetter: def.higherIsBetter,
      format: def.format,
      helps,
      hint: def.hint,
    });
  }

  if (rows.length === 0) return null;

  rows.sort((a, b) => b.separation - a.separation);

  // The weakness worth fixing: biggest separation among metrics that behave as
  // expected (better in wins) — that is the lever this player actually pulls.
  const actionable = rows.filter((r) => r.helps && r.separation >= 0.08);
  const topWeakness = actionable[0] ?? null;
  const topStrength = actionable.length > 1 ? actionable[1] : null;

  return { wins: wins.length, losses: losses.length, rows, topWeakness, topStrength };
}

/** Human sentence for the headline insight. */
export function formulaHeadline(row: FormulaRow): string {
  const winTxt = row.format(row.winAvg);
  const lossTxt = row.format(row.lossAvg);
  return row.higherIsBetter
    ? `Cuando ganas: ${winTxt}. Cuando pierdes: ${lossTxt}.`
    : `Cuando ganas: ${winTxt}. Cuando pierdes: ${lossTxt}.`;
}
