// ARAM: Mayhem augment statistics. Riot's public API does not serve Mayhem
// games (queue 2400), but the League client does, so the Mac app reads them
// from the local client and accumulates plain counts here: per patch, per
// champion, games and wins with each augment and each summoner-spell pair.
// No player names or ids are stored, only the game ids already counted.

export const MAYHEM_QUEUE = 2400;
const MIN_DURATION_S = 300; // shorter games are remakes

/** A match as the League client's match-history API returns it (the fields used). */
export interface ClientGame {
  gameId: number;
  queueId: number;
  gameVersion: string;
  gameDuration: number;
  participants: {
    championId: number;
    spell1Id: number;
    spell2Id: number;
    stats: { win: boolean } & Record<string, unknown>;
  }[];
}

/** [games, wins] */
export type Tally = [number, number];

export interface ChampionStats {
  games: number;
  wins: number;
  augments: Record<string, Tally>;
  /** "4-32": spell ids sorted, so D/F order doesn't split the sample. */
  spells: Record<string, Tally>;
}

export interface PatchStats {
  games: number;
  champions: Record<string, ChampionStats>;
}

export interface MayhemStore {
  version: 1;
  /** Game ids already counted, so re-reading a history never double counts. */
  seen: number[];
  /** Keyed by "major.minor", e.g. "16.20". */
  patches: Record<string, PatchStats>;
}

export function emptyStore(): MayhemStore {
  return { version: 1, seen: [], patches: {} };
}

/** "16.20.824.8524" -> "16.20" */
export function patchOf(gameVersion: string): string | null {
  const m = /^(\d+)\.(\d+)/.exec(gameVersion);
  return m ? `${m[1]}.${m[2]}` : null;
}

function augmentsOf(stats: Record<string, unknown>): number[] {
  const ids: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const id = stats[`playerAugment${i}`];
    if (typeof id === "number" && id > 0) ids.push(id);
  }
  return ids;
}

function bump(tally: Record<string, Tally>, key: string, win: boolean): void {
  const t = tally[key] ?? [0, 0];
  t[0]++;
  if (win) t[1]++;
  tally[key] = t;
}

/**
 * Adds one game to the store. Returns false (and changes nothing) when it was
 * already counted, is not a complete Mayhem game, or is a remake.
 */
export function addGame(store: MayhemStore, seen: Set<number>, game: ClientGame): boolean {
  if (seen.has(game.gameId)) return false;
  if (game.queueId !== MAYHEM_QUEUE || game.gameDuration < MIN_DURATION_S) return false;
  if (!Array.isArray(game.participants) || game.participants.length !== 10) return false;
  const patch = patchOf(game.gameVersion);
  if (!patch) return false;

  const bucket = (store.patches[patch] ??= { games: 0, champions: {} });
  bucket.games++;
  for (const p of game.participants) {
    const win = p.stats?.win === true;
    const champ = (bucket.champions[String(p.championId)] ??= { games: 0, wins: 0, augments: {}, spells: {} });
    champ.games++;
    if (win) champ.wins++;
    for (const id of augmentsOf(p.stats ?? {})) bump(champ.augments, String(id), win);
    const spells = [p.spell1Id, p.spell2Id].sort((a, b) => a - b).join("-");
    bump(champ.spells, spells, win);
  }
  seen.add(game.gameId);
  store.seen.push(game.gameId);
  return true;
}

export function totalGames(store: MayhemStore): number {
  return Object.values(store.patches).reduce((sum, p) => sum + p.games, 0);
}

/** Newest patches first ("16.20" before "16.9"). */
export function patchesNewestFirst(store: MayhemStore): string[] {
  const num = (p: string) => p.split(".").map(Number);
  return Object.keys(store.patches).sort((a, b) => {
    const [a1, a2] = num(a);
    const [b1, b2] = num(b);
    return b1 - a1 || b2 - a2;
  });
}

const emptyChampion = (): ChampionStats => ({ games: 0, wins: 0, augments: {}, spells: {} });

function addInto(target: ChampionStats, source: ChampionStats): void {
  target.games += source.games;
  target.wins += source.wins;
  for (const field of ["augments", "spells"] as const) {
    for (const [key, [g, w]] of Object.entries(source[field])) {
      const t = target[field][key] ?? [0, 0];
      target[field][key] = [t[0] + g, t[1] + w];
    }
  }
}

/** One champion's numbers over the newest `patches` patches. */
function championOver(store: MayhemStore, championId: number, patches: number): ChampionStats | null {
  const merged = emptyChampion();
  for (const patch of patchesNewestFirst(store).slice(0, patches)) {
    const c = store.patches[patch].champions[String(championId)];
    if (c) addInto(merged, c);
  }
  return merged.games > 0 ? merged : null;
}

/** Every champion's numbers over the newest `patches` patches. */
function recentChampions(store: MayhemStore, patches: number): Map<string, ChampionStats> {
  const merged = new Map<string, ChampionStats>();
  for (const patch of patchesNewestFirst(store).slice(0, patches)) {
    for (const [id, c] of Object.entries(store.patches[patch].champions)) {
      const target = merged.get(id) ?? emptyChampion();
      addInto(target, c);
      merged.set(id, target);
    }
  }
  return merged;
}

interface Effect {
  games: number;
  /** Wins above what each champion wins anyway. */
  extraWins: number;
  /** Variance of those wins if the augment changed nothing. */
  variance: number;
}

/** Per augment, over every champion, so strong champions don't make their augments look strong. */
function augmentEffects(champions: Map<string, ChampionStats>): Map<string, Effect> {
  const effects = new Map<string, Effect>();
  for (const c of champions.values()) {
    const base = c.wins / c.games;
    for (const [id, [games, wins]] of Object.entries(c.augments)) {
      const e = effects.get(id) ?? { games: 0, extraWins: 0, variance: 0 };
      e.games += games;
      e.extraWins += wins - games * base;
      e.variance += games * base * (1 - base);
      effects.set(id, e);
    }
  }
  return effects;
}

export type Verdict = "up" | "down" | null;

/** Standard errors a difference must clear to not be luck (~1 in 400 by chance)... */
const CLEAR_Z = 3;
/** ...and the winrate points it must be worth. */
const CLEAR_POINTS = 2;

function verdictOf(e: Effect): Verdict {
  if (e.variance === 0) return null;
  const z = e.extraWins / Math.sqrt(e.variance);
  const points = (e.extraWins / e.games) * 100;
  if (z >= CLEAR_Z && points >= CLEAR_POINTS) return "up";
  if (z <= -CLEAR_Z && points <= -CLEAR_POINTS) return "down";
  return null;
}

export interface AugmentPick {
  augmentId: number;
  /** Games and wins with the augment on this champion. */
  games: number;
  wins: number;
  /** Share of the champion's games that took it, 0-100. */
  pickRate: number;
  /** Games with the augment on any champion. */
  allGames: number;
  /**
   * Whether, across every champion, the augment wins clearly more ("up") or
   * less ("down") than its champions usually do. Null while the difference
   * could be luck, which with a few hundred games is almost always.
   */
  verdict: Verdict;
}

export interface ChampionAugments {
  championGames: number;
  championWinrate: number;
  picks: AugmentPick[];
}

/** Augments its players took in under 1% of its games are off-fit picks for the champion. */
const MIN_PICK_SHARE = 0.01;
const VERDICT_ORDER: Record<string, number> = { up: 1, null: 0, down: -1 };

/**
 * The augments this champion's players take, most picked first. One game
 * swings a winrate by 50 points, so telling augments apart by winrate needs
 * thousands of games per augment; what players choose settles far sooner and
 * carries what they know. Winrates only show up as a verdict once they're
 * clear. Uses the two newest patches by default and only augments taken in
 * `minGames`+ games and 1%+ of the champion's games.
 */
export function augmentsFor(
  store: MayhemStore,
  championId: number,
  opts: { minGames?: number; patches?: number } = {}
): ChampionAugments | null {
  const champions = recentChampions(store, opts.patches ?? 2);
  const champ = champions.get(String(championId));
  if (!champ) return null;
  const effects = augmentEffects(champions);
  const minGames = Math.max(opts.minGames ?? 2, Math.ceil(champ.games * MIN_PICK_SHARE));
  const picks = Object.entries(champ.augments)
    .filter(([, [games]]) => games >= minGames)
    .map(([id, [games, wins]]): AugmentPick => {
      const effect = effects.get(id)!;
      return {
        augmentId: Number(id),
        games,
        wins,
        pickRate: Math.round((games / champ.games) * 100),
        allGames: effect.games,
        verdict: verdictOf(effect),
      };
    })
    .sort(
      (a, b) =>
        b.games - a.games || VERDICT_ORDER[String(b.verdict)] - VERDICT_ORDER[String(a.verdict)] || b.wins - a.wins
    );
  return { championGames: champ.games, championWinrate: Math.round((champ.wins / champ.games) * 100), picks };
}

export interface SpellPick {
  spell1Id: number;
  spell2Id: number;
  games: number;
  wins: number;
  /** Share of the champion's games with this pair, 0-100. */
  pickRate: number;
}

/** The spell pair this champion's players take most (`minGames`+ games), for the same reason as the augments. */
export function bestMayhemSpells(store: MayhemStore, championId: number, minGames = 5): SpellPick | null {
  const champ = championOver(store, championId, 2);
  if (!champ) return null;
  let best: SpellPick | null = null;
  for (const [key, [games, wins]] of Object.entries(champ.spells)) {
    if (games < minGames) continue;
    if (!best || games > best.games || (games === best.games && wins > best.wins)) {
      const [spell1Id, spell2Id] = key.split("-").map(Number);
      best = { spell1Id, spell2Id, games, wins, pickRate: Math.round((games / champ.games) * 100) };
    }
  }
  return best;
}

/** True when `a` wins clearly more than `b`: 5+ points and a gap luck rarely explains. */
export function clearlyBetter(a: { games: number; wins: number }, b: { games: number; wins: number }): boolean {
  if (a.games === 0 || b.games === 0) return false;
  const gap = a.wins / a.games - b.wins / b.games;
  const pooled = (a.wins + b.wins) / (a.games + b.games);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / a.games + 1 / b.games));
  return se > 0 && gap >= 0.05 && gap / se >= 2.5;
}

/** Winrate per champion (for comparing your pick with the ARAM bench). */
export function championWinrates(
  store: MayhemStore,
  championIds: number[]
): { championId: number; games: number; wins: number; winrate: number | null }[] {
  return championIds.map((championId) => {
    const c = championOver(store, championId, 2);
    return { championId, games: c?.games ?? 0, wins: c?.wins ?? 0, winrate: c ? Math.round((c.wins / c.games) * 100) : null };
  });
}
