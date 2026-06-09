import { describe, it, expect } from "vitest";
import type { MatchData, TimelineData, TimelineFrame } from "./types";
import { analyzeTimeline, extractBuildOrder } from "./timeline-insights";

// --- Synthetic fixtures: player (id 1, Ahri MID) vs opponent (id 6, Zed MID). ---
// Player farms 8 cs/min and out-golds the opponent by 100/min.

const PUUIDS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"];

function makeFrames(lastMinute: number): TimelineFrame[] {
  const frames: TimelineFrame[] = [];
  for (let minute = 0; minute <= lastMinute; minute++) {
    frames.push({
      timestamp: minute * 60000,
      participantFrames: {
        "1": {
          participantId: 1,
          totalGold: minute * 400,
          xp: minute * 500,
          level: Math.min(1 + minute, 18),
          minionsKilled: minute * 8,
          jungleMinionsKilled: 0,
        },
        "6": {
          participantId: 6,
          totalGold: minute * 300,
          xp: minute * 450,
          level: Math.min(1 + minute, 18),
          minionsKilled: minute * 6,
          jungleMinionsKilled: 0,
        },
      },
      events: [],
    });
  }
  return frames;
}

function makeTimeline(frames: TimelineFrame[]): TimelineData {
  return {
    metadata: { matchId: "LA1_123", participants: PUUIDS },
    info: { frameInterval: 60000, frames },
  };
}

function makeMatch(overrides: {
  gameDuration?: number;
  queueId?: number;
  mapId?: number;
  participants?: unknown[];
} = {}): MatchData {
  return {
    metadata: { matchId: "LA1_123", participants: PUUIDS },
    info: {
      gameDuration: overrides.gameDuration ?? 1800,
      queueId: overrides.queueId ?? 420,
      mapId: overrides.mapId ?? 11,
      participants: overrides.participants ?? [
        { puuid: "p1", teamId: 100, individualPosition: "MIDDLE", teamPosition: "MIDDLE", championName: "Ahri" },
        { puuid: "p6", teamId: 200, individualPosition: "MIDDLE", teamPosition: "MIDDLE", championName: "Zed" },
      ],
      teams: [],
    },
  } as unknown as MatchData;
}

describe("analyzeTimeline — full 30-minute game", () => {
  const frames = makeFrames(15);
  // Purchases: starter (undone + replaced), hidden consumables, a core item.
  frames[1].events.push(
    { type: "ITEM_PURCHASED", timestamp: 60000, participantId: 1, itemId: 1055 },
    { type: "ITEM_PURCHASED", timestamp: 61000, participantId: 1, itemId: 2003 }, // potion (hidden)
    { type: "ITEM_PURCHASED", timestamp: 62000, participantId: 1, itemId: 3340 } // trinket (hidden)
  );
  frames[2].events.push(
    { type: "ITEM_UNDO", timestamp: 120000, participantId: 1, beforeId: 1055, afterId: 0 },
    { type: "ITEM_PURCHASED", timestamp: 121000, participantId: 1, itemId: 1056 }
  );
  frames[14].events.push({
    type: "ITEM_PURCHASED",
    timestamp: 14 * 60000,
    participantId: 1,
    itemId: 3142,
  });
  // Death at minute 12 while ~1200 gold ahead.
  frames[12].events.push({
    type: "CHAMPION_KILL",
    timestamp: 12 * 60000,
    killerId: 6,
    victimId: 1,
  });

  const timeline = makeTimeline(frames);
  const match = makeMatch();
  const insights = analyzeTimeline(timeline, match, "p1")!;

  it("returns insights for a participant and null for a stranger", () => {
    expect(insights).not.toBeNull();
    expect(analyzeTimeline(timeline, match, "not-in-game")).toBeNull();
  });

  it("identifies the lane opponent", () => {
    expect(insights.playerChampion).toBe("Ahri");
    expect(insights.opponentChampion).toBe("Zed");
  });

  it("computes laning stats from the frames", () => {
    expect(insights.laning).not.toBeNull();
    expect(insights.laning!.csAt10).toBe(80); // 8 cs/min * 10
    expect(insights.laning!.csAt14).toBe(112);
    expect(insights.laning!.goldDiffAt10).toBe(1000); // +100 gold/min * 10
    expect(insights.laning!.goldDiffAt14).toBe(1400);
    expect(insights.laning!.xpDiffAt10).toBe(500); // +50 xp/min * 10
  });

  it("builds a gold diff series aligned by frame", () => {
    expect(insights.goldDiffSeries).not.toBeNull();
    const at5 = insights.goldDiffSeries!.find((p) => p.minute === 5);
    expect(at5?.diff).toBe(500);
  });

  it("flags strong farming, a won lane, dying while ahead, and zero control wards", () => {
    const messages = insights.flags.map((f) => `${f.severity}:${f.message}`);
    expect(messages.some((m) => m.startsWith("good:Excelente farmeo"))).toBe(true);
    expect(messages.some((m) => m.startsWith("good:Ganaste tu línea"))).toBe(true);
    expect(messages.some((m) => m.includes("yendo por delante en oro"))).toBe(true);
    expect(messages.some((m) => m.includes("ward de control"))).toBe(true);
  });
});

describe("analyzeTimeline — 11-minute game (early surrender)", () => {
  const frames = makeFrames(11);
  // Two early deaths: 8:00 and 9:45 — 9:45 must count as minute 9 (floor, not round).
  frames[8].events.push({ type: "CHAMPION_KILL", timestamp: 8 * 60000, killerId: 6, victimId: 1 });
  frames[10].events.push({ type: "CHAMPION_KILL", timestamp: 9 * 60000 + 45000, killerId: 6, victimId: 1 });

  const insights = analyzeTimeline(makeTimeline(frames), makeMatch({ gameDuration: 660 }), "p1")!;

  it("does NOT fabricate at-14 stats from end-of-game data", () => {
    expect(insights.laning).not.toBeNull();
    expect(insights.laning!.csAt10).toBe(80);
    expect(insights.laning!.csAt14).toBeNull();
    expect(insights.laning!.goldDiffAt14).toBeNull();
    const messages = insights.flags.map((f) => f.message);
    expect(messages.some((m) => m.includes("tu línea"))).toBe(false);
  });

  it("counts a 9:45 death as before minute 10 (floor semantics)", () => {
    const early = insights.flags.find((f) => f.message.includes("muertes antes del min 10"));
    expect(early).toBeDefined();
    expect(early!.message).toContain("min 8, 9");
  });
});

describe("analyzeTimeline — opponent matching", () => {
  it("uses teamPosition to disambiguate duplicated individualPosition", () => {
    const insights = analyzeTimeline(
      makeTimeline(makeFrames(15)),
      makeMatch({
        participants: [
          { puuid: "p1", teamId: 100, individualPosition: "MIDDLE", teamPosition: "MIDDLE", championName: "Ahri" },
          // Two enemies report individualPosition MIDDLE; teamPosition resolves it.
          { puuid: "p6", teamId: 200, individualPosition: "MIDDLE", teamPosition: "MIDDLE", championName: "Zed" },
          { puuid: "p7", teamId: 200, individualPosition: "MIDDLE", teamPosition: "TOP", championName: "Garen" },
        ],
      }),
      "p1"
    )!;
    expect(insights.opponentChampion).toBe("Zed");
  });

  it("suppresses diffs instead of guessing when the opponent is ambiguous", () => {
    const insights = analyzeTimeline(
      makeTimeline(makeFrames(15)),
      makeMatch({
        participants: [
          { puuid: "p1", teamId: 100, individualPosition: "MIDDLE", championName: "Ahri" },
          { puuid: "p6", teamId: 200, individualPosition: "MIDDLE", championName: "Zed" },
          { puuid: "p7", teamId: 200, individualPosition: "MIDDLE", championName: "Garen" },
        ],
      }),
      "p1"
    )!;
    expect(insights.opponentChampion).toBeNull();
    expect(insights.goldDiffSeries).toBeNull();
    expect(insights.laning!.goldDiffAt10).toBeNull();
  });
});

describe("analyzeTimeline — ARAM", () => {
  it("yields no lane diffs and no SR-only flags", () => {
    const insights = analyzeTimeline(
      makeTimeline(makeFrames(15)),
      makeMatch({
        queueId: 450,
        mapId: 12,
        gameDuration: 1320,
        participants: [
          { puuid: "p1", teamId: 100, individualPosition: "Invalid", championName: "Ahri" },
          { puuid: "p6", teamId: 200, individualPosition: "Invalid", championName: "Zed" },
        ],
      }),
      "p1"
    )!;
    expect(insights.opponentChampion).toBeNull();
    expect(insights.goldDiffSeries).toBeNull();
    // No control-ward warning off Summoner's Rift, no lane/cs flags without a lane.
    expect(insights.flags).toHaveLength(0);
  });
});

describe("extractBuildOrder", () => {
  it("honors ITEM_UNDO and hides consumables/trinkets", () => {
    const frames = makeFrames(15);
    frames[1].events.push(
      { type: "ITEM_PURCHASED", timestamp: 60000, participantId: 1, itemId: 1055 },
      { type: "ITEM_PURCHASED", timestamp: 61000, participantId: 1, itemId: 2003 },
      { type: "ITEM_PURCHASED", timestamp: 62000, participantId: 1, itemId: 3340 }
    );
    frames[2].events.push(
      { type: "ITEM_UNDO", timestamp: 120000, participantId: 1, beforeId: 1055, afterId: 0 },
      { type: "ITEM_PURCHASED", timestamp: 121000, participantId: 1, itemId: 1056 }
    );
    frames[14].events.push({
      type: "ITEM_PURCHASED",
      timestamp: 14 * 60000,
      participantId: 1,
      itemId: 3142,
    });

    const order = extractBuildOrder(makeTimeline(frames), 1);
    expect(order.map((b) => b.itemId)).toEqual([1056, 3142]); // 1055 undone, 2003/3340 hidden
    expect(order[1].minute).toBe(14);
  });
});
