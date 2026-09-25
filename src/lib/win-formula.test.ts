import { describe, it, expect } from "vitest";
import type { MatchData } from "./types";
import { computeWinFormula } from "./win-formula";

const ME = "me";

function game(opts: {
  win: boolean;
  killParticipation: number;
  timeDead: number;
  deaths?: number;
  duration?: number;
}): MatchData {
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
          deaths: opts.deaths ?? 5,
          teamPosition: "MIDDLE",
          individualPosition: "MIDDLE",
          totalTimeSpentDead: opts.timeDead,
          challenges: {
            killParticipation: opts.killParticipation,
            teamDamagePercentage: 0.25,
          },
        },
      ],
      teams: [],
    },
  } as unknown as MatchData;
}

describe("computeWinFormula", () => {
  it("returns null without enough games on both sides", () => {
    const only = [game({ win: true, killParticipation: 0.6, timeDead: 100 })];
    expect(computeWinFormula(only, ME)).toBeNull();
  });

  it("finds the metric that separates wins from losses", () => {
    const matches = [
      game({ win: true, killParticipation: 0.7, timeDead: 120 }),
      game({ win: true, killParticipation: 0.68, timeDead: 140 }),
      game({ win: false, killParticipation: 0.35, timeDead: 400 }),
      game({ win: false, killParticipation: 0.33, timeDead: 420 }),
    ];
    const formula = computeWinFormula(matches, ME)!;
    expect(formula).not.toBeNull();
    expect(formula.wins).toBe(2);
    expect(formula.losses).toBe(2);

    const kp = formula.rows.find((r) => r.key === "killParticipation")!;
    expect(kp.winAvg).toBeCloseTo(0.69, 2);
    expect(kp.lossAvg).toBeCloseTo(0.34, 2);
    expect(kp.helps).toBe(true); // higher in wins, and higher is better

    const dead = formula.rows.find((r) => r.key === "timeDead")!;
    expect(dead.winAvg).toBeLessThan(dead.lossAvg);
    expect(dead.helps).toBe(true); // lower in wins, and lower is better
  });

  it("ranks the biggest separation as the top weakness", () => {
    const matches = [
      // killParticipation barely moves; time dead swings hugely.
      game({ win: true, killParticipation: 0.5, timeDead: 60 }),
      game({ win: true, killParticipation: 0.51, timeDead: 80 }),
      game({ win: false, killParticipation: 0.49, timeDead: 600 }),
      game({ win: false, killParticipation: 0.5, timeDead: 620 }),
    ];
    const formula = computeWinFormula(matches, ME)!;
    expect(formula.topWeakness?.key).toBe("timeDead");
  });

  it("skips gaps too small to show in the metric's own units", () => {
    // Control wards 0.25 vs 0 average: maximal relative separation, but both
    // round to "0", so it must not become the headline.
    const withWards = (m: MatchData, wards: number) => {
      const p = m.info.participants[0];
      p.challenges = { ...p.challenges, controlWardsPlaced: wards };
      return m;
    };
    const matches = [
      withWards(game({ win: true, killParticipation: 0.7, timeDead: 120 }), 0.3),
      withWards(game({ win: true, killParticipation: 0.68, timeDead: 140 }), 0.2),
      withWards(game({ win: false, killParticipation: 0.35, timeDead: 400 }), 0),
      withWards(game({ win: false, killParticipation: 0.33, timeDead: 420 }), 0),
    ];
    const formula = computeWinFormula(matches, ME)!;
    expect(formula.rows.find((r) => r.key === "controlWards")).toBeUndefined();
    expect(formula.topWeakness?.key).not.toBe("controlWards");
  });

  it("ignores remakes", () => {
    const matches = [
      game({ win: true, killParticipation: 0.7, timeDead: 100 }),
      game({ win: true, killParticipation: 0.7, timeDead: 100 }),
      game({ win: false, killParticipation: 0.3, timeDead: 400 }),
      game({ win: false, killParticipation: 0.3, timeDead: 400 }),
      game({ win: false, killParticipation: 0.9, timeDead: 0, duration: 200 }),
    ];
    const formula = computeWinFormula(matches, ME)!;
    expect(formula.losses).toBe(2);
  });
});
