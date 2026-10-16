import { describe, it, expect } from "vitest";
import type { MatchData, MatchParticipant } from "./types";
import { bestRunePage, bestSpells, runePageOf } from "./rune-pages";

const ME = "me";
// Briar's Hail of Blades page from a real game.
const HAIL = { primary: 8100, perks: [9923, 8143, 8137, 8105], sub: 8000, subPerks: [9105, 8017] };
const CONQ = { primary: 8000, perks: [8010, 9111, 9104, 8299], sub: 8400, subPerks: [8444, 8451] };

function perks(page: typeof HAIL) {
  return {
    statPerks: { offense: 5008, flex: 5008, defense: 5001 },
    styles: [
      { description: "primaryStyle", style: page.primary, selections: page.perks.map((perk) => ({ perk, var1: 0, var2: 0, var3: 0 })) },
      { description: "subStyle", style: page.sub, selections: page.subPerks.map((perk) => ({ perk, var1: 0, var2: 0, var3: 0 })) },
    ],
  };
}

function game(opts: {
  champ?: string;
  win: boolean;
  page?: typeof HAIL;
  spells?: [number, number];
  duration?: number;
}): MatchData {
  const [s1, s2] = opts.spells ?? [11, 4];
  return {
    metadata: { matchId: `M_${Math.random()}`, participants: [] },
    info: {
      gameDuration: opts.duration ?? 1800,
      participants: [
        {
          puuid: ME,
          teamId: 100,
          win: opts.win,
          championName: opts.champ ?? "Briar",
          summoner1Id: s1,
          summoner2Id: s2,
          perks: perks(opts.page ?? HAIL),
        },
      ],
      teams: [],
    },
  } as unknown as MatchData;
}

const repeat = (n: number, opts: Parameters<typeof game>[0]) => Array.from({ length: n }, () => game(opts));

describe("runePageOf", () => {
  it("returns the 4 primary runes, 2 secondary runes, then offense/flex/defense shards", () => {
    const me = game({ win: true }).info.participants[0];
    expect(runePageOf(me)).toEqual({
      primaryStyleId: 8100,
      subStyleId: 8000,
      selectedPerkIds: [9923, 8143, 8137, 8105, 9105, 8017, 5008, 5008, 5001],
    });
  });

  it("refuses an incomplete page instead of importing half of it", () => {
    const me = game({ win: true }).info.participants[0] as MatchParticipant;
    me.perks.styles[1].selections.pop();
    expect(runePageOf(me)).toBeNull();
  });
});

describe("bestRunePage", () => {
  it("picks by net wins so volume and results both count", () => {
    const lucky = { ...CONQ, perks: [8010, 9111, 9104, 8014] };
    const solid = [...repeat(6, { win: true, page: HAIL }), ...repeat(4, { win: false, page: HAIL })];
    expect(bestRunePage([...solid, game({ win: true, page: lucky })], ME, "Briar")?.primaryStyleId).toBe(8100);

    const better = [...repeat(5, { win: true, page: CONQ }), game({ win: false, page: CONQ })];
    const pick = bestRunePage([...solid, ...better], ME, "Briar")!;
    expect(pick.primaryStyleId).toBe(8000);
    expect(pick).toMatchObject({ games: 6, wins: 5 });
  });

  it("only looks at games on that champion and skips remakes", () => {
    const matches = [
      ...repeat(3, { champ: "Diana", win: true, page: CONQ }),
      game({ win: true, page: CONQ, duration: 120 }),
      game({ win: true, page: HAIL }),
    ];
    expect(bestRunePage(matches, ME, "Briar")?.primaryStyleId).toBe(8100);
    expect(bestRunePage(matches, ME, "Malphite")).toBeNull();
  });
});

describe("bestSpells", () => {
  it("keeps the spells in the order they were played", () => {
    const matches = [...repeat(3, { win: true, spells: [11, 4] }), ...repeat(2, { win: true, spells: [4, 11] })];
    expect(bestSpells(matches, ME, "Briar")).toEqual({ spell1Id: 11, spell2Id: 4, games: 3, wins: 3 });
  });
});
