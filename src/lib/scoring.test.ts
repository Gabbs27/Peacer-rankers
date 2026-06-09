import { describe, it, expect } from "vitest";
import type { MatchInfo, MatchParticipant } from "./types";
import {
  calculatePerformanceScore,
  isRemake,
  scoreToRank,
  getTierLabel,
  REMAKE_THRESHOLD_SECONDS,
} from "./scoring";

function makeParticipant(overrides: Partial<MatchParticipant> = {}): MatchParticipant {
  return {
    individualPosition: "MIDDLE",
    teamId: 100,
    kills: 5,
    deaths: 3,
    assists: 7,
    totalMinionsKilled: 150,
    neutralMinionsKilled: 0,
    totalDamageDealtToChampions: 20000,
    magicDamageDealtToChampions: 20000,
    physicalDamageDealtToChampions: 0,
    totalDamageTaken: 15000,
    goldEarned: 11000,
    visionScore: 20,
    turretKills: 1,
    wardsKilled: 3,
    wardsPlaced: 8,
    doubleKills: 1,
    tripleKills: 0,
    quadraKills: 0,
    pentaKills: 0,
    firstBloodKill: false,
    largestKillingSpree: 3,
    ...overrides,
  } as unknown as MatchParticipant;
}

function makeMatchInfo(gameDuration: number, player: MatchParticipant): MatchInfo {
  return {
    gameDuration,
    participants: [player],
    teams: [{ teamId: 100, objectives: {} }],
  } as unknown as MatchInfo;
}

describe("isRemake", () => {
  it("flags games shorter than the threshold", () => {
    expect(isRemake(makeMatchInfo(REMAKE_THRESHOLD_SECONDS - 1, makeParticipant()))).toBe(true);
    expect(isRemake(makeMatchInfo(60, makeParticipant()))).toBe(true);
  });

  it("does not flag normal-length games", () => {
    expect(isRemake(makeMatchInfo(REMAKE_THRESHOLD_SECONDS, makeParticipant()))).toBe(false);
    expect(isRemake(makeMatchInfo(1800, makeParticipant()))).toBe(false);
  });
});

describe("calculatePerformanceScore", () => {
  it("never produces Infinity/NaN or an out-of-range score, even at 0 duration (M2 hardening)", () => {
    const player = makeParticipant();
    const score = calculatePerformanceScore(player, makeMatchInfo(0, player));
    for (const v of [score.micro, score.macro, score.overall]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("produces a reasonable score for a solid normal game", () => {
    const player = makeParticipant();
    const score = calculatePerformanceScore(player, makeMatchInfo(1800, player));
    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.rankEquivalent).toBeTruthy();
  });

  it("handles a 0-death game without throwing", () => {
    const player = makeParticipant({ deaths: 0, kills: 10, assists: 10 });
    const score = calculatePerformanceScore(player, makeMatchInfo(1500, player));
    expect(Number.isFinite(score.overall)).toBe(true);
  });
});

describe("scoreToRank", () => {
  it("maps known boundaries to the right tier", () => {
    expect(scoreToRank(98).tier).toBe("CHALLENGER");
    expect(scoreToRank(93).tier).toBe("GRANDMASTER");
    expect(scoreToRank(86).tier).toBe("MASTER");
    expect(scoreToRank(76).tier).toBe("DIAMOND");
    expect(scoreToRank(46).tier).toBe("GOLD");
    expect(scoreToRank(31).tier).toBe("SILVER");
    expect(scoreToRank(30).tier).toBe("BRONZE");
    expect(scoreToRank(16).tier).toBe("BRONZE");
    expect(scoreToRank(15).tier).toBe("IRON");
    expect(scoreToRank(0).tier).toBe("IRON");
  });
});

describe("getTierLabel", () => {
  it("localizes known tiers and passes through unknown ones", () => {
    expect(getTierLabel("IRON")).toBe("Hierro");
    expect(getTierLabel("CHALLENGER")).toBe("Challenger");
    expect(getTierLabel("WEIRD")).toBe("WEIRD");
  });
});
