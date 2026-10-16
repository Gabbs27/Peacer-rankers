import { describe, it, expect } from "vitest";
import { importRunePage, setSpells, validateRunePage, validateSpells, type LcuClient } from "./actions";
import { LcuError } from "./lcu/http";
import { isAllowedApiPath, webUrl } from "./backend";

const PAGE = {
  name: "LoL Tracker · Briar",
  primaryStyleId: 8100,
  subStyleId: 8000,
  selectedPerkIds: [9923, 8143, 8137, 8105, 9105, 8017, 5008, 5008, 5001],
};

describe("validateRunePage", () => {
  it("accepts a complete page named by the app", () => {
    expect(validateRunePage(PAGE)).toEqual(PAGE);
  });

  it("rejects incomplete, foreign or malformed pages", () => {
    expect(validateRunePage({ ...PAGE, selectedPerkIds: PAGE.selectedPerkIds.slice(0, 8) })).toBeNull();
    expect(validateRunePage({ ...PAGE, name: "Mi página" })).toBeNull();
    expect(validateRunePage({ ...PAGE, primaryStyleId: -1 })).toBeNull();
    expect(validateRunePage({ ...PAGE, selectedPerkIds: [...PAGE.selectedPerkIds.slice(0, 8), "x"] })).toBeNull();
    expect(validateRunePage(null)).toBeNull();
  });
});

describe("validateSpells", () => {
  it("needs two different spell ids", () => {
    expect(validateSpells(11, 4)).toEqual([11, 4]);
    expect(validateSpells(4, 4)).toBeNull();
    expect(validateSpells(4, "11")).toBeNull();
  });
});

describe("backend allow-list", () => {
  it("allows only the read-only API paths the app uses", () => {
    expect(isAllowedApiPath("/api/matches?puuid=abc_DEF-1&region=la1&count=20&start=0")).toBe(true);
    expect(isAllowedApiPath("/api/live-game?puuid=abc&region=la1")).toBe(true);
    expect(isAllowedApiPath("/api/scout?puuid=abc_DEF-1&region=la1")).toBe(true);
    expect(isAllowedApiPath("/api/scout?region=la1&players=abc:233:Briar")).toBe(false);
    expect(isAllowedApiPath("/api/summoner?gameName=Xicebriel&tagLine=LAN&region=la1")).toBe(true);
    expect(isAllowedApiPath("/api/summoner?gameName=El%20Javvis&tagLine=LAN&region=la1")).toBe(true);
    expect(isAllowedApiPath("/api/match/LA1_123")).toBe(false);
    expect(isAllowedApiPath("https://evil.example/api/matches?x=1")).toBe(false);
    expect(isAllowedApiPath("/api/matches?x=1/../../secret")).toBe(false);
    expect(isAllowedApiPath(42)).toBe(false);
  });

  it("only opens profile pages of the website", () => {
    expect(webUrl("/summoner/la1/Xicebriel-LAN")).toBe("https://peacer-rankers.vercel.app/summoner/la1/Xicebriel-LAN");
    expect(webUrl("https://evil.example")).toBeNull();
    expect(webUrl("/summoner/la1/x/../../admin")).toBeNull();
  });
});

/** In-memory stand-in for the League client: records every write. */
function stubClient(pages: { id: number; name: string; isDeletable: boolean }[], opts: { postFails?: boolean } = {}) {
  const writes: { method: string; path: string; body?: unknown }[] = [];
  const client: LcuClient = {
    get: async <T,>(path: string) => {
      if (path === "/lol-perks/v1/pages") return pages as T;
      throw new LcuError(404, "not found");
    },
    request: async <T,>(method: string, path: string, body?: unknown) => {
      writes.push({ method, path, body });
      if (opts.postFails && method === "POST") throw new LcuError(400, "Max pages reached");
      return undefined as T;
    },
  };
  return { client, writes };
}

describe("importRunePage", () => {
  it("replaces the page the app made before and sets the new one as current", async () => {
    const { client, writes } = stubClient([
      { id: 1, name: "Mi página", isDeletable: true },
      { id: 2, name: "LoL Tracker · Viejo", isDeletable: true },
    ]);
    const result = await importRunePage(client, PAGE);
    expect(result.ok).toBe(true);
    expect(writes).toEqual([
      { method: "DELETE", path: "/lol-perks/v1/pages/2", body: undefined },
      { method: "POST", path: "/lol-perks/v1/pages", body: { ...PAGE, current: true } },
    ]);
  });

  it("never deletes the player's own pages to make room", async () => {
    const { client, writes } = stubClient([{ id: 1, name: "Mi página", isDeletable: true }], { postFails: true });
    const result = await importRunePage(client, PAGE);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Renombra una a «LoL Tracker»");
    expect(writes.map((w) => w.method)).toEqual(["POST"]);
  });
});

describe("setSpells", () => {
  it("patches the champion-select selection", async () => {
    const { client, writes } = stubClient([]);
    expect((await setSpells(client, 11, 4)).ok).toBe(true);
    expect(writes).toEqual([
      { method: "PATCH", path: "/lol-champ-select/v1/session/my-selection", body: { spell1Id: 11, spell2Id: 4 } },
    ]);
  });
});
