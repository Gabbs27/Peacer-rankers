import { describe, it, expect } from "vitest";
import type { MatchData } from "./types";
import { championKey, recommendPicks, type DraftContext } from "./draft";

const ME = "me";
const AD_COMP = ["Graves", "Zed", "Darius", "Jinx", "Garen"];
const AP_COMP = ["Ahri", "Annie", "Brand", "Lux", "Syndra"];

function game(opts: {
  champ: string;
  role?: string;
  win: boolean;
  enemies?: string[];
  duration?: number;
}): MatchData {
  const enemies = opts.enemies ?? AD_COMP;
  return {
    metadata: { matchId: `M_${Math.random()}`, participants: [] },
    info: {
      gameDuration: opts.duration ?? 1800,
      participants: [
        { puuid: ME, teamId: 100, win: opts.win, championName: opts.champ, teamPosition: opts.role ?? "JUNGLE" },
        ...enemies.map((championName, i) => ({ puuid: `e${i}`, teamId: 200, win: !opts.win, championName })),
      ],
      teams: [],
    },
  } as unknown as MatchData;
}

function many(n: number, opts: Parameters<typeof game>[0]): MatchData[] {
  return Array.from({ length: n }, () => game(opts));
}

const ctx = (over: Partial<DraftContext> = {}): DraftContext => ({
  role: "JUNGLE",
  allies: [],
  enemies: [],
  unavailable: [],
  ...over,
});

describe("recommendPicks", () => {
  it("prefers a solid record over a tiny lucky one", () => {
    const matches = [
      ...many(6, { champ: "Briar", win: true }),
      ...many(4, { champ: "Briar", win: false }),
      game({ champ: "Diana", win: true }),
    ];
    const picks = recommendPicks(matches, ME, ctx());
    expect(picks.map((p) => p.championName)).toEqual(["Briar", "Diana"]);
    expect(picks[0].reasons[0]).toBe("6V-4D con Briar de jungla");
    expect(picks[1].cautions).toContain("Pocas partidas: tómalo como orientación");
  });

  it("drops banned, taken and unpickable champions", () => {
    const matches = [...many(3, { champ: "Briar", win: true }), ...many(3, { champ: "Diana", win: true })];
    expect(recommendPicks(matches, ME, ctx({ unavailable: ["Briar"] })).map((p) => p.championName)).toEqual(["Diana"]);
    expect(recommendPicks(matches, ME, ctx({ pickable: ["Briar"] })).map((p) => p.championName)).toEqual(["Briar"]);
  });

  it("keeps an off-role champion below the one you play in your role", () => {
    const matches = [
      ...many(3, { champ: "Malphite", role: "TOP", win: true }),
      ...many(2, { champ: "Briar", win: true }),
      ...many(2, { champ: "Briar", win: false }),
    ];
    const picks = recommendPicks(matches, ME, ctx());
    expect(picks[0].championName).toBe("Briar");
    expect(picks[1].cautions).toContain("No lo has jugado de jungla");
  });

  it("weighs your record against this kind of enemy composition", () => {
    const matches = [
      ...many(3, { champ: "Briar", win: false, enemies: AD_COMP }),
      ...many(3, { champ: "Briar", win: true, enemies: AP_COMP }),
    ];
    const vsAd = recommendPicks(matches, ME, ctx({ enemies: ["Graves", "Zed", "Darius"] }))[0];
    const vsAp = recommendPicks(matches, ME, ctx({ enemies: ["Ahri", "Annie", "Brand"] }))[0];
    expect(vsAd.cautions).toContain("0V-3D contra equipos con mayoría AD");
    expect(vsAp.reasons).toContain("3V-0D contra equipos con mayoría AP");
    expect(vsAd.score).toBeLessThan(vsAp.score);
  });

  it("reports the head-to-head against a revealed enemy champion", () => {
    const matches = [...many(2, { champ: "Briar", win: false }), ...many(2, { champ: "Briar", win: true, enemies: AP_COMP })];
    const pick = recommendPicks(matches, ME, ctx({ enemies: ["Graves"] }))[0];
    expect(pick.cautions).toContain("0V-2D contra Graves");
  });

  it("rewards the damage type your team is missing", () => {
    const matches = [...many(3, { champ: "Briar", win: true }), ...many(3, { champ: "Diana", win: true })];
    const picks = recommendPicks(matches, ME, ctx({ allies: ["Garen", "Jinx", "Zed"] }));
    const diana = picks.find((p) => p.championName === "Diana")!;
    const briar = picks.find((p) => p.championName === "Briar")!;
    expect(diana.reasons).toContain("Tu equipo no tiene daño mágico: lo aportas tú");
    expect(briar.cautions).toContain("Tu equipo ya va cargado de daño físico");
    expect(picks[0].championName).toBe("Diana");
  });

  it("ignores remakes and returns nothing without history", () => {
    expect(recommendPicks([game({ champ: "Briar", win: true, duration: 120 })], ME, ctx())).toEqual([]);
    expect(recommendPicks([], ME, ctx())).toEqual([]);
  });

  it("matches champion names across match data, Data Dragon and the client", () => {
    expect(championKey("Kai'Sa")).toBe(championKey("Kaisa"));
    expect(championKey("KaiSa")).toBe(championKey("Kaisa"));
    expect(championKey("MonkeyKing")).toBe(championKey("Wukong"));
    expect(championKey("Lee Sin")).toBe(championKey("LeeSin"));
  });
});
