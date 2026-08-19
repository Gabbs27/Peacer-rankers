import { describe, it, expect } from "vitest";
import type { MatchData } from "./types";
import { matchupRecords, worstMatchup, findLaneOpponent } from "./matchups";

const ME = "me";

function game(opts: {
  win: boolean;
  myChampion: string;
  opponent: string;
  myGold?: number;
  oppGold?: number;
  myCs?: number;
  oppCs?: number;
  position?: string;
  duration?: number;
  extraEnemySamePosition?: boolean;
}): MatchData {
  const pos = opts.position ?? "MIDDLE";
  const enemies = [
    {
      puuid: "opp",
      teamId: 200,
      championName: opts.opponent,
      teamPosition: pos,
      individualPosition: pos,
      goldEarned: opts.oppGold ?? 10000,
      totalMinionsKilled: opts.oppCs ?? 180,
      neutralMinionsKilled: 0,
    },
  ];
  if (opts.extraEnemySamePosition) {
    enemies.push({
      puuid: "opp2",
      teamId: 200,
      championName: "Otro",
      teamPosition: pos,
      individualPosition: pos,
      goldEarned: 9000,
      totalMinionsKilled: 100,
      neutralMinionsKilled: 0,
    });
  }
  return {
    metadata: { matchId: `M${Math.random()}`, participants: [] },
    info: {
      gameCreation: 1,
      gameDuration: opts.duration ?? 1800,
      participants: [
        {
          puuid: ME,
          teamId: 100,
          win: opts.win,
          championName: opts.myChampion,
          teamPosition: pos,
          individualPosition: pos,
          goldEarned: opts.myGold ?? 10000,
          totalMinionsKilled: opts.myCs ?? 180,
          neutralMinionsKilled: 0,
        },
        ...enemies,
      ],
      teams: [],
    },
  } as unknown as MatchData;
}

describe("findLaneOpponent", () => {
  it("returns the single enemy in the same position", () => {
    const m = game({ win: true, myChampion: "Ahri", opponent: "Zed" });
    const me = m.info.participants[0];
    expect(findLaneOpponent(me, m.info.participants)?.championName).toBe("Zed");
  });

  it("returns null when the position is ambiguous or invalid", () => {
    const ambiguous = game({ win: true, myChampion: "Ahri", opponent: "Zed", extraEnemySamePosition: true });
    expect(findLaneOpponent(ambiguous.info.participants[0], ambiguous.info.participants)).toBeNull();

    const aram = game({ win: true, myChampion: "Ahri", opponent: "Zed", position: "Invalid" });
    expect(findLaneOpponent(aram.info.participants[0], aram.info.participants)).toBeNull();
  });
});

describe("matchupRecords", () => {
  it("aggregates record, gold and cs diffs per opponent champion", () => {
    const matches = [
      game({ win: false, myChampion: "Ahri", opponent: "Zed", myGold: 9000, oppGold: 12000, myCs: 150, oppCs: 200 }),
      game({ win: false, myChampion: "Ahri", opponent: "Zed", myGold: 9500, oppGold: 12500, myCs: 160, oppCs: 210 }),
      game({ win: true, myChampion: "Lux", opponent: "Yasuo", myGold: 12000, oppGold: 10000 }),
      game({ win: true, myChampion: "Lux", opponent: "Yasuo", myGold: 12000, oppGold: 10000 }),
    ];
    const records = matchupRecords(matches, ME);
    const zed = records.find((r) => r.opponent === "Zed")!;
    expect(zed.games).toBe(2);
    expect(zed.winrate).toBe(0);
    expect(zed.avgGoldDiff).toBe(-3000);
    expect(zed.avgCsDiff).toBe(-50);
    expect(zed.yourChampions).toEqual(["Ahri"]);

    // Sorted worst-first
    expect(records[0].opponent).toBe("Zed");
  });

  it("hides matchups below the minimum sample and skips remakes", () => {
    const matches = [
      game({ win: false, myChampion: "Ahri", opponent: "Zed" }),
      game({ win: true, myChampion: "Ahri", opponent: "Fizz", duration: 200 }),
    ];
    expect(matchupRecords(matches, ME)).toHaveLength(0);
  });
});

describe("worstMatchup", () => {
  it("picks the lowest winrate with a usable sample", () => {
    const matches = [
      game({ win: false, myChampion: "Ahri", opponent: "Zed" }),
      game({ win: false, myChampion: "Ahri", opponent: "Zed" }),
      game({ win: true, myChampion: "Lux", opponent: "Yasuo" }),
      game({ win: true, myChampion: "Lux", opponent: "Yasuo" }),
    ];
    expect(worstMatchup(matchupRecords(matches, ME))?.opponent).toBe("Zed");
  });

  it("returns null when nothing is a real problem", () => {
    const matches = [
      game({ win: true, myChampion: "Lux", opponent: "Yasuo" }),
      game({ win: true, myChampion: "Lux", opponent: "Yasuo" }),
    ];
    expect(worstMatchup(matchupRecords(matches, ME))).toBeNull();
  });
});
