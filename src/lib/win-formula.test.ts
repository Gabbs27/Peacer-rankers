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

  it("does not let a sparse near-zero metric outrank a consistent gap", () => {
    // Control wards 0.5 vs 0: maximal RELATIVE gap, but it comes from two
    // games; kill participation differs in every single game.
    const withWards = (m: MatchData, wards: number) => {
      const p = m.info.participants[0];
      p.challenges = { ...p.challenges, controlWardsPlaced: wards };
      return m;
    };
    const matches = [
      withWards(game({ win: true, killParticipation: 0.7, timeDead: 200 }), 1),
      withWards(game({ win: true, killParticipation: 0.68, timeDead: 200 }), 1),
      withWards(game({ win: true, killParticipation: 0.72, timeDead: 200 }), 0),
      withWards(game({ win: true, killParticipation: 0.69, timeDead: 200 }), 0),
      withWards(game({ win: false, killParticipation: 0.35, timeDead: 200 }), 0),
      withWards(game({ win: false, killParticipation: 0.33, timeDead: 200 }), 0),
      withWards(game({ win: false, killParticipation: 0.36, timeDead: 200 }), 0),
      withWards(game({ win: false, killParticipation: 0.34, timeDead: 200 }), 0),
    ];
    const formula = computeWinFormula(matches, ME)!;
    expect(formula.topWeakness?.key).toBe("killParticipation");
    // Still reported, and its average is readable instead of "0 vs 0".
    const wards = formula.rows.find((r) => r.key === "controlWards")!;
    expect(wards.format(wards.winAvg)).toBe("0.5");
    expect(wards.format(wards.lossAvg)).toBe("0.0");
  });

  it("keeps a 0/1 metric like lane advantage and shows it as a share of games", () => {
    const withLane = (m: MatchData, won: number) => {
      const p = m.info.participants[0];
      p.challenges = { ...p.challenges, laningPhaseGoldExpAdvantage: won };
      return m;
    };
    // Lane won in 4 of 5 wins and in none of the losses; nothing else differs.
    const matches = [1, 1, 1, 1, 0].map((won) =>
      withLane(game({ win: true, killParticipation: 0.5, timeDead: 200 }), won)
    );
    for (let i = 0; i < 5; i++) {
      matches.push(withLane(game({ win: false, killParticipation: 0.5, timeDead: 200 }), 0));
    }
    const formula = computeWinFormula(matches, ME)!;
    expect(formula.topWeakness?.key).toBe("laneAdvantage");
    expect(formula.topWeakness!.format(formula.topWeakness!.winAvg)).toBe("80%");
    expect(formula.topWeakness!.format(formula.topWeakness!.lossAvg)).toBe("0%");
  });

  it("never headlines a gap that reads the same once formatted", () => {
    // CS advantage averages +2.45 vs +1.55: a very consistent gap, but both
    // sides read "+2". Time dead has a visible gap and must take the headline.
    const withCsLead = (m: MatchData, lead: number) => {
      const p = m.info.participants[0];
      p.challenges = { ...p.challenges, maxCsAdvantageOnLaneOpponent: lead };
      return m;
    };
    const matches = [
      withCsLead(game({ win: true, killParticipation: 0.5, timeDead: 100 }), 2.4),
      withCsLead(game({ win: true, killParticipation: 0.5, timeDead: 160 }), 2.5),
      withCsLead(game({ win: false, killParticipation: 0.5, timeDead: 300 }), 1.6),
      withCsLead(game({ win: false, killParticipation: 0.5, timeDead: 360 }), 1.5),
    ];
    const formula = computeWinFormula(matches, ME)!;
    const cs = formula.rows.find((r) => r.key === "csAdvantage")!;
    expect(cs.format(cs.winAvg)).toBe(cs.format(cs.lossAvg));
    expect(cs.separation).toBeGreaterThan(formula.rows.find((r) => r.key === "timeDead")!.separation);
    expect(formula.topWeakness?.key).toBe("timeDead");
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
