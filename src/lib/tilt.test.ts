import { describe, it, expect } from "vitest";
import type { MatchData } from "./types";
import { analyzeTilt, SESSION_GAP_MS } from "./tilt";

const ME = "me";
const BASE = 1_700_000_000_000;

function game(win: boolean, createdAt: number, duration = 1800): MatchData {
  return {
    metadata: { matchId: `M${createdAt}`, participants: [] },
    info: {
      gameCreation: createdAt,
      gameDuration: duration,
      participants: [{ puuid: ME, teamId: 100, win }],
      teams: [],
    },
  } as unknown as MatchData;
}

/** Fixed hour resolver so the test is timezone-independent. */
const utcHour = (t: number) => new Date(t).getUTCHours();

describe("analyzeTilt", () => {
  it("returns null with too few games", () => {
    expect(analyzeTilt([game(true, BASE)], ME, utcHour)).toBeNull();
  });

  it("splits games into sessions using the idle gap", () => {
    const half = 30 * 60 * 1000;
    const matches = [
      // session 1: 3 back-to-back games
      game(true, BASE),
      game(true, BASE + half),
      game(false, BASE + 2 * half),
      // session 2 after a long break
      game(true, BASE + SESSION_GAP_MS + 10 * half),
      game(false, BASE + SESSION_GAP_MS + 11 * half),
      game(false, BASE + SESSION_GAP_MS + 12 * half),
    ];
    const t = analyzeTilt(matches, ME, utcHour)!;
    expect(t.sessions).toBe(2);
    expect(t.totalGames).toBe(6);
  });

  it("detects a winrate collapse late in the session", () => {
    const half = 30 * 60 * 1000;
    // Each session: first two won, later ones lost.
    const matches: MatchData[] = [];
    for (let s = 0; s < 3; s++) {
      const start = BASE + s * (SESSION_GAP_MS * 2);
      matches.push(game(true, start));
      matches.push(game(true, start + half));
      matches.push(game(false, start + 2 * half));
      matches.push(game(false, start + 3 * half));
    }
    const t = analyzeTilt(matches, ME, utcHour)!;
    const first = t.byDepth.find((b) => b.label === "1ª de la sesión")!;
    const late = t.byDepth.find((b) => b.label === "4ª o más")!;
    expect(first.winrate).toBe(100);
    expect(late.winrate).toBe(0);
    expect(t.verdict).toContain("cae");
  });

  it("tracks games played after two straight losses", () => {
    const half = 30 * 60 * 1000;
    const matches: MatchData[] = [];
    // One long session: L L then 3 more games (all losses)
    for (let i = 0; i < 6; i++) matches.push(game(false, BASE + i * half));
    const t = analyzeTilt(matches, ME, utcHour)!;
    expect(t.afterTwoLosses).not.toBeNull();
    expect(t.afterTwoLosses!.games).toBe(4); // games 3..6
    expect(t.afterTwoLosses!.winrate).toBe(0);
    expect(t.verdict).toContain("2 derrotas seguidas");
  });

  it("buckets games by hour and ignores remakes", () => {
    const matches = [
      game(true, BASE),
      game(true, BASE + 60_000),
      game(false, BASE + 120_000),
      game(true, BASE + 180_000),
      game(false, BASE + 240_000),
      game(true, BASE + 300_000),
      game(true, BASE + 360_000, 120), // remake, excluded
    ];
    const t = analyzeTilt(matches, ME, utcHour)!;
    expect(t.totalGames).toBe(6);
    expect(t.byHour.reduce((s, h) => s + h.games, 0)).toBe(6);
  });
});
