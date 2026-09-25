import { describe, it, expect } from "vitest";
import type { MatchData, MatchParticipant } from "./types";
import { summarizeRecent } from "./profile-summary";

const ME = "me";

function participant(overrides: Partial<MatchParticipant> = {}): MatchParticipant {
  return {
    puuid: ME,
    individualPosition: "JUNGLE",
    teamId: 100,
    win: true,
    kills: 4,
    deaths: 2,
    assists: 6,
    totalMinionsKilled: 30,
    neutralMinionsKilled: 150,
    totalDamageDealtToChampions: 18000,
    magicDamageDealtToChampions: 0,
    physicalDamageDealtToChampions: 18000,
    totalDamageTaken: 20000,
    goldEarned: 11000,
    visionScore: 25,
    turretKills: 1,
    wardsKilled: 2,
    wardsPlaced: 8,
    doubleKills: 0,
    tripleKills: 0,
    quadraKills: 0,
    pentaKills: 0,
    firstBloodKill: false,
    largestKillingSpree: 2,
    ...overrides,
  } as unknown as MatchParticipant;
}

/** One game: me plus a teammate who got `allyKills` kills. */
function game(win: boolean, opts: { duration?: number; me?: Partial<MatchParticipant>; allyKills?: number } = {}): MatchData {
  return {
    metadata: { matchId: `M_${Math.random()}`, participants: [] },
    info: {
      gameDuration: opts.duration ?? 1800,
      participants: [
        participant({ win, ...opts.me }),
        participant({ puuid: "ally", win, kills: opts.allyKills ?? 6, assists: 0 }),
        participant({ puuid: "enemy", teamId: 200, win: !win }),
      ],
      teams: [
        { teamId: 100, objectives: {} },
        { teamId: 200, objectives: {} },
      ],
    },
  } as unknown as MatchData;
}

describe("summarizeRecent", () => {
  it("returns null when there is nothing to summarise", () => {
    expect(summarizeRecent([], ME)).toBeNull();
    expect(summarizeRecent([game(true, { duration: 120 })], ME)).toBeNull();
  });

  it("counts remakes apart and keeps them out of the averages", () => {
    const summary = summarizeRecent(
      [game(true), game(false, { duration: 200, me: { kills: 30 } }), game(false)],
      ME
    )!;
    expect(summary.games).toBe(2);
    expect(summary.remakes).toBe(1);
    expect(summary.wins).toBe(1);
    expect(summary.losses).toBe(1);
    expect(summary.winrate).toBe(50);
    expect(summary.kills).toBe(4); // the 30-kill remake is ignored
  });

  it("computes KDA over the whole sample and per-minute farm", () => {
    const summary = summarizeRecent([game(true), game(true)], ME)!;
    expect(summary.kda).toBeCloseTo((8 + 12) / 4);
    expect(summary.csPerMin).toBeCloseTo(180 / 30);
  });

  it("reports a perfect KDA as null instead of dividing by zero", () => {
    const summary = summarizeRecent([game(true, { me: { deaths: 0 } })], ME)!;
    expect(summary.kda).toBeNull();
  });

  it("averages kill participation against your own team's kills", () => {
    // me 4K+6A, ally 6K -> team 10 kills -> KP 100%
    const summary = summarizeRecent([game(true)], ME)!;
    expect(summary.killParticipation).toBeCloseTo(100);
  });

  it("reads the current streak from the newest game", () => {
    const summary = summarizeRecent([game(false), game(false), game(false), game(true)], ME)!;
    expect(summary.streak).toEqual({ result: "L", count: 3 });
    expect(summarizeRecent([game(true), game(false)], ME)!.streak).toBeNull();
  });

  it("keeps the score within 0-100", () => {
    const summary = summarizeRecent([game(true), game(false)], ME)!;
    expect(summary.avgScore).toBeGreaterThanOrEqual(0);
    expect(summary.avgScore).toBeLessThanOrEqual(100);
  });
});
