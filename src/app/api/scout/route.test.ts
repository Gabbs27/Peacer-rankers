import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/riot-api", () => ({
  RiotApiError: class RiotApiError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message);
    }
    get publicMessage() {
      return "error";
    }
  },
  getCurrentGame: vi.fn(),
  getLeagueEntries: vi.fn(),
  getChampionMasteryFor: vi.fn(),
}));
vi.mock("@/lib/data-dragon", () => ({ getDDragonVersion: vi.fn(async () => "16.9.1") }));
vi.mock("@/lib/champion-client", () => ({
  loadChampionList: vi.fn(async () => [
    { id: "MonkeyKing", name: "Wukong", key: "62" },
    { id: "Briar", name: "Briar", key: "233" },
  ]),
}));

import { GET } from "./route";
import { getChampionMasteryFor, getCurrentGame, getLeagueEntries } from "@/lib/riot-api";

const ME = "PPwn26d1UuILyxFOcBO2WFGyTVjC32zjOtZ9NRVsIzv5K9kBzdcdVBTbI_C2Gg3UYAW3mwV5F9PDIw";
const ENEMY = "ENEMYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const get = (query: string) => GET(new NextRequest(`http://localhost/api/scout?${query}`));

beforeEach(() => {
  vi.mocked(getCurrentGame).mockReset();
  vi.mocked(getLeagueEntries).mockReset().mockResolvedValue([]);
  vi.mocked(getChampionMasteryFor).mockReset().mockResolvedValue(null);
});

describe("GET /api/scout", () => {
  it("rejects a malformed puuid or region before calling Riot", async () => {
    expect((await get("puuid=../../x&region=la1")).status).toBe(400);
    expect((await get(`puuid=${ME}&region=xx`)).status).toBe(400);
    expect(getCurrentGame).not.toHaveBeenCalled();
  });

  it("answers inGame: false when you are not in a game", async () => {
    vi.mocked(getCurrentGame).mockResolvedValue(null);
    expect(await (await get(`puuid=${ME}&region=la1`)).json()).toEqual({ inGame: false });
    expect(getLeagueEntries).not.toHaveBeenCalled();
  });

  it("scouts only the players of your live game, with localized champion names", async () => {
    vi.mocked(getCurrentGame).mockResolvedValue({
      participants: [
        { puuid: ME, riotId: "Xicebriel#LAN", teamId: 100, championId: 233 },
        { puuid: ENEMY, riotId: "Rival#LAN", teamId: 200, championId: 62 },
        { puuid: "", teamId: 200, championId: 62 }, // bot: no Riot calls
      ],
    } as never);
    const body = await (await get(`puuid=${ME}&region=la1`)).json();

    expect(body.inGame).toBe(true);
    expect(body.players.map((p: { championName: string }) => p.championName)).toEqual(["Briar", "Wukong", "Wukong"]);
    expect(body.players[1].signals).toContainEqual({ tone: "opportunity", text: "Primera vez (o casi) con Wukong" });
    expect(body.players[2].unavailable).toBe(true);
    expect(vi.mocked(getLeagueEntries).mock.calls.map((c) => c[0])).toEqual([ME, ENEMY]);
  });

  it("keeps the other players when one of them fails", async () => {
    vi.mocked(getCurrentGame).mockResolvedValue({
      participants: [
        { puuid: ME, teamId: 100, championId: 233 },
        { puuid: ENEMY, teamId: 200, championId: 62 },
      ],
    } as never);
    vi.mocked(getLeagueEntries).mockImplementation(async (puuid) => {
      if (puuid === ENEMY) throw new Error("429");
      return [];
    });
    const body = await (await get(`puuid=${ME}&region=la1`)).json();
    expect(body.players[0].unavailable).toBeUndefined();
    expect(body.players[1]).toMatchObject({ unavailable: true, signals: [] });
  });
});
