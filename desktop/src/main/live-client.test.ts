import { describe, it, expect } from "vitest";
import { toLiveSnapshot } from "./live-client";

describe("toLiveSnapshot", () => {
  it("finds you in the game's player list by Riot ID", () => {
    const players = [
      { riotId: "Otro#LAN", riotIdGameName: "Otro", isDead: false, level: 9 },
      { riotId: "Xicebriel#LAN", riotIdGameName: "Xicebriel", isDead: true, level: 11 },
    ];
    expect(toLiveSnapshot("Xicebriel#LAN", players, { gameTime: 612.4 })).toEqual({ dead: true, level: 11, gameTime: 612.4 });
    expect(toLiveSnapshot("Xicebriel", [{ summonerName: "Xicebriel", level: 3 }], {})).toEqual({ dead: false, level: 3, gameTime: 0 });
    expect(toLiveSnapshot("Nadie#LAN", players, {})).toBeNull();
    expect(toLiveSnapshot(undefined, players, {})).toBeNull();
  });
});
