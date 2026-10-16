import { describe, it, expect } from "vitest";
import {
  addGame,
  augmentsFor,
  bestMayhemSpells,
  championWinrates,
  clearlyBetter,
  emptyStore,
  patchOf,
  patchesNewestFirst,
  totalGames,
  type ClientGame,
} from "./mayhem";

let nextId = 1;

const augmentStats = (ids: number[]) => Object.fromEntries(ids.map((a, i) => [`playerAugment${i + 1}`, a]));

/**
 * One Mayhem game: champion 233 (Briar) with `augments`, and nine fillers
 * (champions 1000-1008). The first four are Briar's allies and take `allyAugments`.
 */
function game(opts: {
  win: boolean;
  augments?: number[];
  allyAugments?: number[];
  spells?: [number, number];
  version?: string;
  queueId?: number;
  duration?: number;
  id?: number;
}): ClientGame {
  const briar = {
    championId: 233,
    spell1Id: opts.spells?.[0] ?? 4,
    spell2Id: opts.spells?.[1] ?? 32,
    stats: { win: opts.win, ...augmentStats(opts.augments ?? []), playerAugment6: 0 },
  };
  const filler = (i: number) => ({
    championId: 1000 + i,
    spell1Id: 4,
    spell2Id: 32,
    stats: i < 4 ? { win: opts.win, ...augmentStats(opts.allyAugments ?? []) } : { win: !opts.win },
  });
  return {
    gameId: opts.id ?? nextId++,
    queueId: opts.queueId ?? 2400,
    gameVersion: opts.version ?? "16.20.824.8524",
    gameDuration: opts.duration ?? 1100,
    participants: [briar, ...Array.from({ length: 9 }, (_, i) => filler(i))],
  };
}

function storeWith(games: ClientGame[]) {
  const store = emptyStore();
  const seen = new Set<number>();
  for (const g of games) addGame(store, seen, g);
  return { store, seen };
}

const repeat = (n: number, opts: Parameters<typeof game>[0]) => Array.from({ length: n }, () => game(opts));

describe("addGame", () => {
  it("counts each game once, per patch and champion", () => {
    const g = game({ win: true, augments: [1152, 1413] });
    const { store, seen } = storeWith([g]);
    expect(addGame(store, seen, g)).toBe(false); // already seen
    expect(totalGames(store)).toBe(1);
    expect(store.seen).toEqual([g.gameId]);
    const briar = store.patches["16.20"].champions["233"];
    expect(briar).toMatchObject({ games: 1, wins: 1, augments: { "1152": [1, 1], "1413": [1, 1] }, spells: { "4-32": [1, 1] } });
  });

  it("skips other queues, remakes and incomplete games", () => {
    const partial = game({ win: true });
    partial.participants = partial.participants.slice(0, 6);
    const { store } = storeWith([game({ win: true, queueId: 450 }), game({ win: true, duration: 200 }), partial]);
    expect(totalGames(store)).toBe(0);
    expect(store.seen).toEqual([]);
  });

  it("does not split spell samples by D/F order", () => {
    const { store } = storeWith([game({ win: true, spells: [4, 32] }), game({ win: false, spells: [32, 4] })]);
    expect(store.patches["16.20"].champions["233"].spells).toEqual({ "4-32": [2, 1] });
  });
});

describe("patches", () => {
  it("reads major.minor and orders them newest first", () => {
    expect(patchOf("16.20.824.8524")).toBe("16.20");
    expect(patchOf("garbage")).toBeNull();
    const { store } = storeWith([game({ win: true, version: "16.9.1" }), game({ win: true, version: "16.20.1" }), game({ win: true, version: "15.24.1" })]);
    expect(patchesNewestFirst(store)).toEqual(["16.20", "16.9", "15.24"]);
  });
});

describe("augmentsFor", () => {
  it("lists the augments its players take, most picked first, without reading luck as a verdict", () => {
    // Briar: 1152 15-5, 2091 4-16, 9001 3-0, one more loss. 15-5 on 20 games is still within luck.
    const { store } = storeWith([
      ...repeat(15, { win: true, augments: [1152] }),
      ...repeat(5, { win: false, augments: [1152] }),
      ...repeat(3, { win: true, augments: [9001] }),
      ...repeat(4, { win: true, augments: [2091] }),
      ...repeat(16, { win: false, augments: [2091] }),
      ...repeat(1, { win: false }),
    ]);
    const result = augmentsFor(store, 233)!;
    expect(result.championWinrate).toBe(50);
    expect(result.picks.map((p) => [p.augmentId, p.games, p.wins, p.pickRate, p.verdict])).toEqual([
      [1152, 20, 15, 45, null],
      [2091, 20, 4, 45, null],
      [9001, 3, 3, 7, null],
    ]);
  });

  it("calls out augments that clearly win more or less across champions", () => {
    // Briar and her four allies went 6-0 with 1152 and 0-6 with 2091: 30 picks each.
    const { store } = storeWith([
      ...repeat(6, { win: true, augments: [1152], allyAugments: [1152] }),
      ...repeat(6, { win: false, augments: [2091], allyAugments: [2091] }),
    ]);
    const { picks } = augmentsFor(store, 233)!;
    expect(picks.map((p) => [p.augmentId, p.allGames, p.verdict])).toEqual([
      [1152, 30, "up"],
      [2091, 30, "down"],
    ]);
  });

  it("drops augments below the minimum sample and uses the two newest patches", () => {
    const { store } = storeWith([
      ...repeat(6, { win: true, augments: [1152], version: "16.20.1" }),
      ...repeat(6, { win: true, augments: [1152], version: "16.19.1" }),
      ...repeat(6, { win: false, augments: [7777], version: "16.18.1" }), // too old
      game({ win: true, augments: [1413] }), // too few
    ]);
    const result = augmentsFor(store, 233)!;
    expect(result.championGames).toBe(13);
    expect(result.picks.map((p) => p.augmentId)).toEqual([1152]);
    expect(augmentsFor(store, 999)).toBeNull();
  });

  it("ignores augments a champion with many games almost never takes", () => {
    const filler = repeat(250, { win: true });
    const twice = repeat(2, { win: true, augments: [1152] });
    expect(augmentsFor(storeWith([...filler, ...twice]).store, 233)!.picks).toEqual([]);
    const thrice = repeat(3, { win: true, augments: [1152] });
    expect(augmentsFor(storeWith([...filler, ...thrice]).store, 233)!.picks.map((p) => p.augmentId)).toEqual([1152]);
  });
});

describe("bestMayhemSpells, championWinrates and clearlyBetter", () => {
  it("picks the spell pair its players take most", () => {
    const { store } = storeWith([
      ...repeat(4, { win: true, spells: [4, 32] }),
      ...repeat(6, { win: false, spells: [32, 4] }),
      ...repeat(5, { win: true, spells: [4, 14] }),
      ...repeat(1, { win: false, spells: [4, 14] }),
    ]);
    expect(bestMayhemSpells(store, 233)).toEqual({ spell1Id: 4, spell2Id: 32, games: 10, wins: 4, pickRate: 63 });
  });

  it("compares champions, with null for the ones never seen", () => {
    const { store } = storeWith([...repeat(3, { win: true }), game({ win: false })]);
    expect(championWinrates(store, [233, 42])).toEqual([
      { championId: 233, games: 4, wins: 3, winrate: 75 },
      { championId: 42, games: 0, wins: 0, winrate: null },
    ]);
  });

  it("only calls a champion better when the gap is beyond luck", () => {
    expect(clearlyBetter({ games: 40, wins: 30 }, { games: 40, wins: 10 })).toBe(true);
    expect(clearlyBetter({ games: 20, wins: 12 }, { games: 20, wins: 10 })).toBe(false);
    expect(clearlyBetter({ games: 40, wins: 10 }, { games: 40, wins: 30 })).toBe(false);
    expect(clearlyBetter({ games: 0, wins: 0 }, { games: 40, wins: 10 })).toBe(false);
  });
});
