import { describe, it, expect } from "vitest";
import type { MatchInfo, MatchParticipant } from "./types";
import { lobbyRanks } from "./lobby-rank";

function p(damage: number, gold: number, vision: number, cs: number): MatchParticipant {
  return {
    totalDamageDealtToChampions: damage,
    goldEarned: gold,
    visionScore: vision,
    totalMinionsKilled: cs,
    neutralMinionsKilled: 0,
  } as unknown as MatchParticipant;
}

describe("lobbyRanks", () => {
  const me = p(30000, 12000, 40, 200);
  const info = {
    gameDuration: 1800,
    participants: [
      me,
      p(40000, 14000, 10, 250), // better dmg/gold/cs, worse vision
      p(20000, 10000, 20, 150),
      p(10000, 8000, 30, 100),
    ],
  } as unknown as MatchInfo;

  it("ranks each stat against the lobby (1 = best)", () => {
    const ranks = Object.fromEntries(lobbyRanks(me, info).map((r) => [r.label, r.rank]));
    expect(ranks["Daño"]).toBe(2);
    expect(ranks["Oro"]).toBe(2);
    expect(ranks["Visión"]).toBe(1);
    expect(ranks["CS/min"]).toBe(2);
  });

  it("shares the better rank on ties", () => {
    const twin = p(30000, 12000, 40, 200);
    const tied = {
      gameDuration: 1800,
      participants: [me, twin],
    } as unknown as MatchInfo;
    expect(lobbyRanks(me, tied).every((r) => r.rank === 1)).toBe(true);
  });
});
