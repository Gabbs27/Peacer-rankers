import { describe, it, expect } from "vitest";
import type { MatchData } from "./types";
import { analyzeChampionComp } from "./builds";
import { classifyComp, recordVsComp, counterItemCoverage } from "./comp-history";

const ME = "me";

/** Build a match where the enemy team is the given champions. */
function match(opts: {
  win: boolean;
  enemies: string[];
  myChampion?: string;
  items?: number[];
  duration?: number;
}): MatchData {
  const enemies = opts.enemies.map((championName, i) => ({
    puuid: `e${i}`,
    teamId: 200,
    championName,
    magicDamageDealtToChampions: 0,
    physicalDamageDealtToChampions: 0,
    totalDamageDealtToChampions: 0,
    totalDamageTaken: 0,
  }));
  const items = opts.items ?? [];
  return {
    metadata: { matchId: `M${Math.random()}`, participants: [] },
    info: {
      gameDuration: opts.duration ?? 1800,
      mapId: 11,
      queueId: 420,
      participants: [
        {
          puuid: ME,
          teamId: 100,
          win: opts.win,
          championName: opts.myChampion ?? "Briar",
          item0: items[0] ?? 0,
          item1: items[1] ?? 0,
          item2: items[2] ?? 0,
          item3: 0,
          item4: 0,
          item5: 0,
        },
        ...enemies,
      ],
      teams: [],
    },
  } as unknown as MatchData;
}

const AP_COMP = ["Ahri", "Lux", "Syndra", "Brand", "Sona"];
const AD_COMP = ["Zed", "Jinx", "Darius", "Talon", "Nasus"];

describe("classifyComp", () => {
  it("labels an AP-heavy enemy team", () => {
    expect(classifyComp(analyzeChampionComp(AP_COMP))).toBe("ap");
  });

  it("labels an AD-heavy enemy team", () => {
    expect(classifyComp(analyzeChampionComp(AD_COMP))).toBe("ad");
  });

  it("labels a two-and-two comp as mixed", () => {
    // 2 clear AP + 2 clear AD + 1 tank (tank counts as an AD threat).
    const kind = classifyComp(analyzeChampionComp(["Ahri", "Lux", "Zed", "Jinx", "Malphite"]));
    expect(["mixed", "ad"]).toContain(kind);
  });
});

describe("recordVsComp", () => {
  const matches = [
    match({ win: true, enemies: AP_COMP, items: [3111, 3156] }),
    match({ win: false, enemies: AP_COMP, items: [3071] }),
    match({ win: false, enemies: AP_COMP, items: [3071, 3111] }),
    match({ win: true, enemies: AD_COMP, items: [3047] }),
    match({ win: true, enemies: AP_COMP, items: [], duration: 200 }), // remake
    match({ win: false, enemies: AP_COMP, myChampion: "Malphite", items: [3111] }),
  ];

  it("counts only games against the requested comp kind, skipping remakes", () => {
    const rec = recordVsComp(matches, ME, "ap");
    expect(rec.games).toBe(4); // 3 Briar + 1 Malphite, remake excluded
    expect(rec.wins).toBe(1);
  });

  it("tracks how many of those were on a given champion", () => {
    const rec = recordVsComp(matches, ME, "ap", "Briar");
    expect(rec.sameChampionGames).toBe(3);
  });

  it("counts finished items across those games", () => {
    const rec = recordVsComp(matches, ME, "ap");
    expect(rec.itemCounts.get(3111)).toBe(3); // Mercury's in 3 of the AP games
    expect(rec.itemCounts.get(3071)).toBe(2);
    expect(rec.itemCounts.get(9999)).toBeUndefined();
  });

  it("returns an empty record when nothing matches", () => {
    const rec = recordVsComp([], ME, "ap");
    expect(rec.games).toBe(0);
    expect(rec.itemCounts.size).toBe(0);
  });
});

describe("counterItemCoverage", () => {
  it("reports how often each recommended item was actually built", () => {
    const matches = [
      match({ win: false, enemies: AP_COMP, items: [3071] }),
      match({ win: false, enemies: AP_COMP, items: [3071] }),
      match({ win: true, enemies: AP_COMP, items: [3111] }),
    ];
    const rec = recordVsComp(matches, ME, "ap");
    const coverage = counterItemCoverage(
      [
        { itemId: 3111, name: "Mercury's Treads", reason: "RM" },
        { itemId: 3156, name: "Maw", reason: "escudo" },
      ],
      rec
    );
    expect(coverage[0]).toMatchObject({ itemId: 3111, built: 1, outOf: 3 });
    expect(coverage[1]).toMatchObject({ itemId: 3156, built: 0, outOf: 3 });
  });
});
