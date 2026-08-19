import { describe, it, expect } from "vitest";
import type { MatchData } from "./types";
import { GOALS, evaluateGoal } from "./goals";

const ME = "me";

function game(opts: {
  deaths?: number;
  cs?: number;
  duration?: number;
  position?: string;
  mapId?: number;
  controlWards?: number;
}): MatchData {
  return {
    metadata: { matchId: `M${Math.random()}`, participants: [] },
    info: {
      gameCreation: 1,
      gameDuration: opts.duration ?? 1800,
      mapId: opts.mapId ?? 11,
      participants: [
        {
          puuid: ME,
          teamId: 100,
          win: true,
          deaths: opts.deaths ?? 3,
          teamPosition: opts.position ?? "MIDDLE",
          individualPosition: opts.position ?? "MIDDLE",
          totalMinionsKilled: opts.cs ?? 210,
          neutralMinionsKilled: 0,
          visionScore: 30,
          challenges: { controlWardsPlaced: opts.controlWards ?? 2 },
        },
      ],
      teams: [],
    },
  } as unknown as MatchData;
}

const goal = (id: string) => GOALS.find((g) => g.id === id)!;

describe("evaluateGoal", () => {
  it("counts hits and computes the rate", () => {
    const matches = [game({ deaths: 2 }), game({ deaths: 9 }), game({ deaths: 1 })];
    const p = evaluateGoal(goal("deaths_under_5"), matches, ME);
    expect(p.evaluated).toBe(3);
    expect(p.met).toBe(2);
    expect(p.rate).toBe(67);
  });

  it("counts the streak from the most recent games", () => {
    // newest-first: hit, hit, miss
    const matches = [game({ deaths: 1 }), game({ deaths: 2 }), game({ deaths: 8 })];
    expect(evaluateGoal(goal("deaths_under_5"), matches, ME).streak).toBe(2);
  });

  it("skips games where the goal does not apply", () => {
    // CS goal is laners-only; a jungler game is skipped entirely.
    const matches = [game({ position: "JUNGLE" }), game({ cs: 300 })];
    const p = evaluateGoal(goal("cs_7_per_min"), matches, ME);
    expect(p.evaluated).toBe(1);
    expect(p.met).toBe(1);
  });

  it("skips remakes", () => {
    const matches = [game({ deaths: 1, duration: 200 }), game({ deaths: 1 })];
    expect(evaluateGoal(goal("deaths_under_5"), matches, ME).evaluated).toBe(1);
  });

  it("skips non-Rift maps for vision goals", () => {
    const matches = [game({ mapId: 12 })];
    expect(evaluateGoal(goal("control_ward"), matches, ME).evaluated).toBe(0);
  });
});
