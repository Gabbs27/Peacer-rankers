import { describe, it, expect } from "vitest";
import type { MatchInfo, MatchParticipant } from "./types";
import { diagnoseLoss, aggregateLossPattern } from "./loss-diagnosis";

function participant(overrides: Partial<MatchParticipant> = {}): MatchParticipant {
  return {
    puuid: "me",
    teamId: 100,
    win: false,
    kills: 3,
    deaths: 4,
    assists: 5,
    championName: "Ahri",
    individualPosition: "MIDDLE",
    teamPosition: "MIDDLE",
    totalMinionsKilled: 180,
    neutralMinionsKilled: 0,
    goldEarned: 11000,
    visionScore: 25,
    totalDamageDealtToChampions: 20000,
    ...overrides,
  } as unknown as MatchParticipant;
}

function makeInfo(
  player: MatchParticipant,
  opts: {
    duration?: number;
    mapId?: number;
    rival?: Partial<MatchParticipant>;
    allies?: Partial<MatchParticipant>[];
    myObjectives?: { dragons: number; barons: number };
    enemyObjectives?: { dragons: number; barons: number };
  } = {}
): MatchInfo {
  const rival = participant({
    puuid: "rival",
    teamId: 200,
    championName: "Zed",
    ...opts.rival,
  });
  const allies = (opts.allies ?? [
    { puuid: "a1", deaths: 4 },
    { puuid: "a2", deaths: 4 },
    { puuid: "a3", deaths: 4 },
    { puuid: "a4", deaths: 4 },
  ]).map((a, i) =>
    participant({ puuid: `ally${i}`, teamId: 100, individualPosition: "TOP", teamPosition: "TOP", ...a })
  );

  const team = (teamId: number, obj?: { dragons: number; barons: number }) => ({
    teamId,
    win: teamId !== player.teamId,
    bans: [],
    objectives: {
      baron: { first: false, kills: obj?.barons ?? 0 },
      champion: { first: false, kills: 0 },
      dragon: { first: false, kills: obj?.dragons ?? 0 },
      inhibitor: { first: false, kills: 0 },
      riftHerald: { first: false, kills: 0 },
      tower: { first: false, kills: 0 },
    },
  });

  return {
    gameDuration: opts.duration ?? 1800,
    mapId: opts.mapId ?? 11,
    queueId: 420,
    participants: [player, ...allies, rival],
    teams: [
      team(100, opts.myObjectives),
      team(200, opts.enemyObjectives),
    ],
  } as unknown as MatchInfo;
}

describe("diagnoseLoss", () => {
  it("returns null for wins and remakes", () => {
    const winner = participant({ win: true });
    expect(diagnoseLoss(winner, makeInfo(winner))).toBeNull();
    const loser = participant();
    expect(diagnoseLoss(loser, makeInfo(loser, { duration: 200 }))).toBeNull();
  });

  it("flags feeding when deaths far exceed the team's pace", () => {
    const player = participant({ deaths: 11 });
    const d = diagnoseLoss(player, makeInfo(player, { duration: 1800 }));
    expect(d?.key).toBe("too_many_deaths");
  });

  it("flags a lost lane when out-golded and out-farmed by the direct rival", () => {
    const player = participant({ goldEarned: 9000, totalMinionsKilled: 140 });
    const d = diagnoseLoss(
      player,
      makeInfo(player, { rival: { goldEarned: 12000, totalMinionsKilled: 200 } })
    );
    expect(d?.key).toBe("lost_lane");
    expect(d?.detail).toContain("Zed");
  });

  it("flags poor vision on Summoner's Rift", () => {
    const player = participant({ visionScore: 8 }); // 0.27/min over 30 min
    const d = diagnoseLoss(player, makeInfo(player));
    expect(d?.key).toBe("low_vision");
  });

  it("flags low damage share for a carry role", () => {
    const player = participant({
      visionScore: 30,
      totalDamageDealtToChampions: 5000,
    });
    const d = diagnoseLoss(
      player,
      makeInfo(player, {
        allies: [
          { puuid: "a1", totalDamageDealtToChampions: 30000 },
          { puuid: "a2", totalDamageDealtToChampions: 25000 },
          { puuid: "a3", totalDamageDealtToChampions: 20000 },
          { puuid: "a4", totalDamageDealtToChampions: 15000 },
        ],
      })
    );
    expect(d?.key).toBe("low_damage");
  });

  it("flags objective deficit when the map was lost", () => {
    const player = participant({ visionScore: 40, totalDamageDealtToChampions: 30000 });
    const d = diagnoseLoss(
      player,
      makeInfo(player, {
        myObjectives: { dragons: 0, barons: 0 },
        enemyObjectives: { dragons: 4, barons: 1 },
      })
    );
    expect(d?.key).toBe("low_objectives");
  });

  it("falls back to close_game when nothing dominates", () => {
    const player = participant({ visionScore: 40, totalDamageDealtToChampions: 30000 });
    const d = diagnoseLoss(player, makeInfo(player));
    expect(d?.key).toBe("close_game");
  });
});

describe("aggregateLossPattern", () => {
  it("finds the dominant recurring cause across losses", () => {
    const feeding = participant({ deaths: 12 });
    const vision = participant({ visionScore: 8 });
    const games = [
      { player: feeding, info: makeInfo(feeding) },
      { player: feeding, info: makeInfo(feeding) },
      { player: feeding, info: makeInfo(feeding) },
      { player: vision, info: makeInfo(vision) },
      { player: participant({ win: true }), info: makeInfo(participant({ win: true })) },
    ];
    const pattern = aggregateLossPattern(games);
    expect(pattern.total).toBe(4);
    expect(pattern.dominant?.key).toBe("too_many_deaths");
    expect(pattern.dominantCount).toBe(3);
    expect(pattern.advice).toBeTruthy();
  });

  it("handles zero losses", () => {
    const winner = participant({ win: true });
    const pattern = aggregateLossPattern([{ player: winner, info: makeInfo(winner) }]);
    expect(pattern.total).toBe(0);
    expect(pattern.dominant).toBeNull();
  });
});
