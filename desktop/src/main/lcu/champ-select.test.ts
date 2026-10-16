import { describe, it, expect } from "vitest";
import { toChampSelectView } from "./champ-select";

// Trimmed from a real /lol-champ-select/v1/session payload.
const session = {
  localPlayerCellId: 1,
  myTeam: [
    { cellId: 0, championId: 0, championPickIntent: 86, assignedPosition: "top" },
    { cellId: 1, championId: 233, championPickIntent: 0, assignedPosition: "jungle" },
    { cellId: 2, championId: 0, championPickIntent: 0, assignedPosition: "middle" },
  ],
  theirTeam: [
    { cellId: 5, championId: 104 },
    { cellId: 6, championId: 0 },
  ],
  actions: [
    [
      { actorCellId: 0, championId: 24, completed: true, type: "ban" },
      { actorCellId: 5, championId: 0, completed: true, type: "ban" },
    ],
    [{ actorCellId: 1, championId: 233, completed: true, type: "pick" }],
  ],
  bans: { myTeamBans: [24], theirTeamBans: [64] },
};

describe("toChampSelectView", () => {
  it("extracts role, picks, hovers and bans", () => {
    expect(toChampSelectView(session, [1, 2, 3])).toEqual({
      role: "JUNGLE",
      myChampionId: 233,
      myChampionLocked: true,
      allyChampionIds: [86],
      enemyChampionIds: [104],
      banIds: [24, 64],
      pickableIds: [1, 2, 3],
      benchIds: [],
    });
  });

  it("treats a hover without a completed pick as not locked", () => {
    const hovering = {
      ...session,
      actions: [[{ actorCellId: 1, championId: 233, completed: false, type: "pick" }]],
    };
    expect(toChampSelectView(hovering, null)?.myChampionLocked).toBe(false);
  });

  it("handles blind queues without positions", () => {
    const blind = { ...session, myTeam: session.myTeam.map((m) => ({ ...m, assignedPosition: "" })) };
    expect(toChampSelectView(blind, null)?.role).toBeNull();
  });

  it("reads the ARAM bench in both client formats", () => {
    expect(toChampSelectView({ ...session, benchChampions: [{ championId: 131 }, { championId: 19 }] }, null)?.benchIds).toEqual([131, 19]);
    expect(toChampSelectView({ ...session, benchChampionIds: [54] }, null)?.benchIds).toEqual([54]);
  });

  it("returns null for anything that is not a session", () => {
    expect(toChampSelectView(null, null)).toBeNull();
    expect(toChampSelectView({ httpStatus: 404 }, null)).toBeNull();
    expect(toChampSelectView({ ...session, localPlayerCellId: 9 }, null)).toBeNull();
  });
});
