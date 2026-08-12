import { describe, it, expect } from "vitest";
import type { MatchData } from "./types";
import { frequentTeammates, roleStats, recentForm } from "./social-stats";

const ME = "me";

interface AllyDef {
  puuid: string;
  name?: string;
  tag?: string;
}

function makeMatch(opts: {
  win: boolean;
  allies?: AllyDef[];
  position?: string;
  duration?: number;
}): MatchData {
  const allies = (opts.allies ?? []).map((a) => ({
    puuid: a.puuid,
    teamId: 100,
    win: opts.win,
    riotIdGameName: a.name ?? a.puuid,
    riotIdTagline: a.tag ?? "LAN",
    individualPosition: "TOP",
  }));
  return {
    metadata: { matchId: `M_${Math.random()}`, participants: [] },
    info: {
      gameDuration: opts.duration ?? 1800,
      participants: [
        {
          puuid: ME,
          teamId: 100,
          win: opts.win,
          individualPosition: opts.position ?? "JUNGLE",
          riotIdGameName: "Yo",
          riotIdTagline: "LAN",
        },
        ...allies,
        { puuid: "enemy1", teamId: 200, win: !opts.win, individualPosition: "JUNGLE" },
      ],
      teams: [],
    },
  } as unknown as MatchData;
}

describe("frequentTeammates", () => {
  it("counts games and wins with repeated allies, ignoring one-off players", () => {
    const matches = [
      makeMatch({ win: true, allies: [{ puuid: "duo" }, { puuid: "rando1" }] }),
      makeMatch({ win: false, allies: [{ puuid: "duo" }] }),
      makeMatch({ win: true, allies: [{ puuid: "duo" }, { puuid: "rando2" }] }),
    ];
    const result = frequentTeammates(matches, ME);
    expect(result).toHaveLength(1);
    expect(result[0].puuid).toBe("duo");
    expect(result[0].games).toBe(3);
    expect(result[0].wins).toBe(2);
    expect(result[0].winrate).toBe(67);
  });

  it("skips remakes and allies without a Riot ID", () => {
    const noId = makeMatch({ win: true, allies: [{ puuid: "ghost", name: "", tag: "" }] });
    const remake = makeMatch({ win: true, allies: [{ puuid: "duo" }], duration: 200 });
    const normal = makeMatch({ win: true, allies: [{ puuid: "duo" }] });
    expect(frequentTeammates([noId, remake, normal, normal], ME)).toHaveLength(1);
    expect(frequentTeammates([noId, remake, normal, normal], ME)[0].games).toBe(2);
  });
});

describe("roleStats", () => {
  it("aggregates per position, most played first", () => {
    const matches = [
      makeMatch({ win: true, position: "JUNGLE" }),
      makeMatch({ win: false, position: "JUNGLE" }),
      makeMatch({ win: true, position: "JUNGLE" }),
      makeMatch({ win: false, position: "TOP" }),
    ];
    const result = roleStats(matches, ME);
    expect(result[0]).toMatchObject({ position: "JUNGLE", games: 3, wins: 2, winrate: 67 });
    expect(result[1]).toMatchObject({ position: "TOP", games: 1, winrate: 0 });
  });

  it("ignores Invalid positions (ARAM)", () => {
    expect(roleStats([makeMatch({ win: true, position: "Invalid" })], ME)).toHaveLength(0);
  });
});

describe("recentForm", () => {
  it("returns W/L newest-first, skipping remakes, capped at limit", () => {
    const matches = [
      makeMatch({ win: true }),
      makeMatch({ win: false, duration: 200 }), // remake, skipped
      makeMatch({ win: false }),
      makeMatch({ win: true }),
    ];
    expect(recentForm(matches, ME, 2)).toEqual(["W", "L"]);
    expect(recentForm(matches, ME)).toEqual(["W", "L", "W"]);
  });
});
