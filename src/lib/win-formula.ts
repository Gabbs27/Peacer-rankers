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
  /**
   * Standardised gap (Cohen's d): |delta| over the pooled within-side spread.
   * Rewards metrics that differ CONSISTENTLY between wins and losses, so a
   * near-zero average (0.1 vs 0 control wards over 2 games) can't outrank a
   * steady 3 vs 1 dragons.
   */
  separation: number;
  higherIsBetter: boolean;
  /** Formats an average (winAvg / lossAvg), not a single game's value. */
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

// Below this effect size a win/loss gap is too small to call a lever.
const MIN_SEPARATION = 0.3;

function avg(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Sample variance (n - 1). */
function variance(values: number[]): number {
  const mean = avg(values);
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
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
    const pooledSd = Math.sqrt(
      ((winValues.length - 1) * variance(winValues) + (lossValues.length - 1) * variance(lossValues)) /
        (winValues.length + lossValues.length - 2)
    );
    // Floor the spread so a metric that never varies within either side (lane
    // advantage in every win, in no loss) reads as a very strong separator
    // instead of dividing by zero.
    const spread = Math.max(pooledSd, 0.05 * Math.abs(avg([winAvg, lossAvg])), Number.EPSILON);
    const separation = Math.abs(delta) / spread;
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
      format: def.formatAverage ?? def.format,
      helps,
      hint: def.hint,
    });
  }

  if (rows.length === 0) return null;

  rows.sort((a, b) => b.separation - a.separation);

  // The weakness worth fixing: biggest separation among metrics that behave as
  // expected (better in wins) — that is the lever this player actually pulls.
  // A gap that reads the same once formatted can't be acted on, so it never
  // headlines ("Cuando ganas: 50%. Cuando pierdes: 50%."); it stays in `rows`.
  const actionable = rows.filter(
    (r) => r.helps && r.separation >= MIN_SEPARATION && r.format(r.winAvg) !== r.format(r.lossAvg)
  );
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
